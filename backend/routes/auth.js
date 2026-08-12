// ============================================
// AUTH ROUTE - WITH LOGIN NOTIFICATION
// ============================================

const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const rateLimit = require('express-rate-limit');


const router = express.Router();

// ✅ Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts. Please try after 15 minutes.'
});

router.use(loginLimiter);

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        const admin = await Admin.findOne({ email, isActive: true });
        if (!admin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        if (admin.lockUntil && admin.lockUntil > Date.now()) {
            const waitTime = Math.ceil((admin.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                message: `Account locked. Try after ${waitTime} minutes`
            });
        }

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

        admin.loginAttempts = 0;
        admin.lockUntil = null;
        await admin.save();

        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '2h' }
        );

        // ============================================
        // ✅ SEND LOGIN NOTIFICATION - WITH LOGS
       
        // ============================================
        // ✅ SUCCESS RESPONSE
        // ============================================
        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                assignedCourses: admin.assignedCourses
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error. Please try again.' 
        });
    }
});

// ✅ Verify token
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token is not valid' 
            });
        }

        res.json({ 
            success: true,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                assignedCourses: admin.assignedCourses
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Token is not valid' 
        });
    }
});

module.exports = router;