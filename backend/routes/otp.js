// 
const express = require('express');
const router = express.Router();
const otpGenerator = require('otp-generator');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../services/emailservice');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// ✅ Rate limit for OTP generation
const otpGenerateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3, // Only 3 OTP requests per 15 minutes
    message: 'Too many OTP requests. Please try after 15 minutes.'
});

// ✅ Rate limit for OTP verification
const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Only 5 verification attempts per 15 minutes
    message: 'Too many verification attempts. Please try after 15 minutes.'
});

// ✅ Step 1: Login with Password (hashed)
router.post('/login', otpGenerateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        // ✅ Check admin with hashed password
        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // ✅ Check if account is locked
        if (admin.lockUntil && admin.lockUntil > Date.now()) {
            const waitTime = Math.ceil((admin.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                message: `Account locked. Try after ${waitTime} minutes`
            });
        }

        // ✅ Check password with hash
        const isMatch = await admin.comparePassword(password);
        
        if (!isMatch) {
            admin.loginAttempts = (admin.loginAttempts || 0) + 1;
            
            if (admin.loginAttempts >= 5) {
                admin.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                await admin.save();
                return res.status(423).json({
                    success: false,
                    message: 'Account locked for 30 minutes'
                });
            }
            
            await admin.save();
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // ✅ Reset attempts
        admin.loginAttempts = 0;
        admin.lockUntil = null;
        await admin.save();

        // ✅ Delete previous OTPs
        await OTP.deleteMany({ email });

        // ✅ Generate OTP
        const otp = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        // ✅ Save OTP
        const otpRecord = new OTP({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });
        await otpRecord.save();

        // ✅ Send OTP
        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({
                success: true,
                message: 'OTP sent successfully to your email',
                email: email,
                expiry: '5 minutes'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP. Please try again.'
            });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// ✅ Step 2: Verify OTP
router.post('/verify', otpVerifyLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP are required' 
            });
        }

        // ✅ Find valid OTP
        const otpRecord = await OTP.findOne({
            email,
            otp,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // ✅ Mark OTP as used
        otpRecord.isUsed = true;
        await otpRecord.save();

        // ✅ Get admin
        const admin = await Admin.findOne({ email }).select('-password');
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // ✅ Generate JWT with short expiry
        const token = jwt.sign(
            { 
                id: admin._id, 
                email: admin.email, 
                role: admin.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '2h' } // ✅ 2 hours (secure)
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// ✅ Resend OTP with rate limit
router.post('/resend', otpGenerateLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        const otp = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        await OTP.findOneAndUpdate(
            { email },
            {
                otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                isUsed: false,
                attempts: 0
            },
            { upsert: true, new: true }
        );

        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({
                success: true,
                message: 'New OTP sent successfully'
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to send OTP' 
            });
        }

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

module.exports = router;