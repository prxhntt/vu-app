const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// ✅ Multer - Temporary storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = path.join(__dirname, '../uploads/temp');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================
// ✅ PUBLIC - GET ALL TIMETABLES
// ============================================
router.get('/', async (req, res) => {
    try {
        const timetables = await Timetable.find({ isActive: true })
            .sort({ branch: 1, semester: 1 });
        res.json({ success: true, data: timetables });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// ✅ PUBLIC - GET TIMETABLE BY BRANCH + SEMESTER
// ============================================
router.get('/:branch/:semester', async (req, res) => {
    try {
        const { branch, semester } = req.params;
        const timetable = await Timetable.findOne({
            branch,
            semester: parseInt(semester),
            isActive: true
        });
        if (!timetable) {
            return res.json({ success: false, message: 'Timetable not found' });
        }
        res.json({ success: true, data: timetable });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// ✅ ADMIN - CREATE TIMETABLE
// ============================================
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { branch, branchName, semester } = req.body;

        if (!branch || !branchName || !semester || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'All fields including image are required'
            });
        }

        // Check if already exists
        const existing = await Timetable.findOne({ branch, semester });
        if (existing) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: `Timetable already exists for ${branchName} - Semester ${semester}`
            });
        }

        // ✅ Upload to Cloudinary
        let imageUrl = '';
        let publicId = '';
        try {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'vikrant-timetables',
                resource_type: 'image'
            });
            imageUrl = result.secure_url;
            publicId = result.public_id;
        } catch (cloudError) {
            console.error('Cloudinary upload error:', cloudError);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image to cloud'
            });
        }

        // ✅ Delete temp file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // Save to database
        const timetable = new Timetable({
            branch,
            branchName,
            semester: parseInt(semester),
            imageUrl,
            publicId
        });

        await timetable.save();

        res.json({
            success: true,
            data: timetable,
            message: 'Timetable added successfully!'
        });

    } catch (error) {
        console.error('Create timetable error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// ✅ ADMIN - DELETE TIMETABLE
// ============================================
router.delete('/:id', auth, async (req, res) => {
    try {
        const timetable = await Timetable.findById(req.params.id);
        if (!timetable) {
            return res.status(404).json({ success: false, message: 'Timetable not found' });
        }

        // ✅ Delete from Cloudinary
        if (timetable.publicId) {
            try {
                await cloudinary.uploader.destroy(timetable.publicId);
            } catch (cloudError) {
                console.error('Cloudinary delete error:', cloudError);
            }
        }

        await timetable.deleteOne();
        res.json({ success: true, message: 'Timetable deleted successfully' });

    } catch (error) {
        console.error('Delete timetable error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;