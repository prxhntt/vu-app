const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
// const { sendOTPEmail } = require('../services/emailService');
const { auth } = require('../middleware/auth');
const otpGenerator = require('otp-generator');
const rateLimit = require('express-rate-limit');


const path = require('path');
const { sendOTPEmail } = require(path.join(__dirname, '..', 'services', 'emailService'));

// ✅ Rate limit for forgot password
const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: 'Too many requests. Please try after 15 minutes.'
});

// ============================================
// 1️⃣ CHANGE PASSWORD (Logged in user)
// ============================================
router.post('/change', auth, async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        // ✅ Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirm password do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // ✅ Get admin
        const admin = await Admin.findById(req.admin.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // ✅ Verify old password
        const isMatch = await admin.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // ✅ Update password (auto hash via pre-save hook)
        admin.password = newPassword;
        await admin.save();

        res.json({
            success: true,
            message: 'Password changed successfully!'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// 2️⃣ FORGOT PASSWORD - Send OTP
// ============================================
router.post('/forgot/send-otp', forgotLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // ✅ Check if admin exists
        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }

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
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        });
        await otpRecord.save();

        // ✅ Send OTP via email
        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({
                success: true,
                message: 'OTP sent to your email',
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
        console.error('Forgot password OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// 3️⃣ FORGOT PASSWORD - Verify OTP & Reset
// ============================================
router.post('/forgot/reset', async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        // ✅ Validation
        if (!email || !otp || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // ✅ Verify OTP
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

        // ✅ Update password
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({
            success: true,
            message: 'Password reset successfully! You can now login with new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// ============================================
// 4️⃣ Resend OTP for Forgot Password
// ============================================
router.post('/forgot/resend', forgotLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // ✅ Check if admin exists
        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email'
            });
        }

        // ✅ Generate new OTP
        const otp = otpGenerator.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        // ✅ Update OTP
        await OTP.findOneAndUpdate(
            { email },
            {
                otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                isUsed: false
            },
            { upsert: true, new: true }
        );

        // ✅ Send OTP
        const emailSent = await sendOTPEmail(email, otp);

        if (emailSent) {
            res.json({
                success: true,
                message: 'New OTP sent to your email'
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