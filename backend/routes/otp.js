const express = require('express');
const router = express.Router();
const otpGenerator = require('otp-generator');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../services/emailService');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const otpGenerateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: 'Too many OTP requests. Try after 15 minutes.'
});

const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many attempts. Try after 15 minutes.'
});

// ============================================
// ✅ GENERATE OTP - NO CONSOLE LOG
// ============================================
router.post('/login', otpGenerateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password required'
            });
        }

        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        await OTP.deleteMany({ email });

        const otp = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        // ❌ OTP CONSOLE MEIN MAT DIKHAO
        // console.log('🔑 OTP for', email, 'is:', otp);  // YEH LINE HATAO

        const otpRecord = new OTP({
            email,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });
        await otpRecord.save();

        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({
                success: true,
                message: 'OTP sent to your email',
                email: email,
                expiry: '5 minutes'
                // ❌ OTP YAHAN NAHI HAI
            });
        } else {
            // ✅ Agar email fail ho to bhi OTP response mein nahi bhejna
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP. Please try again.'
                // ❌ OTP YAHAN NAHI HAI
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

// ============================================
// ✅ VERIFY OTP - NO OTP IN RESPONSE
// ============================================
router.post('/verify', otpVerifyLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP required'
            });
        }

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

        otpRecord.isUsed = true;
        await otpRecord.save();

        const admin = await Admin.findOne({ email }).select('-password');
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
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
            // ❌ OTP YAHAN NAHI HAI
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// ✅ RESEND OTP - NO OTP LOGS
// ============================================
router.post('/resend', otpGenerateLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email required'
            });
        }

        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'No account found'
            });
        }

        const otp = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        // ❌ OTP CONSOLE MEIN MAT DIKHAO

        await OTP.findOneAndUpdate(
            { email },
            {
                otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                isUsed: false
            },
            { upsert: true, new: true }
        );

        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({
                success: true,
                message: 'New OTP sent to your email'
                // ❌ OTP YAHAN NAHI HAI
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