const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

      
        const admin = await Admin.findOne({ 
            email: { $regex: new RegExp(email, 'i') },
            isActive: true 
        });

        if (!admin) {
            console.log('Admin not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }


        const isMatch = (admin.password === password);
        
        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(401).json({ message: 'Invalid credentials' });
        }

      
        const token = jwt.sign(
            { 
                id: admin._id, 
                email: admin.email,
                role: admin.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Secure login successful for:', email);

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
        console.error('Login security error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error. Please try again.' 
        });
    }
});


router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Token is not valid' });
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
        res.status(401).json({ message: 'Token is not valid' });
    }
});

module.exports = router;