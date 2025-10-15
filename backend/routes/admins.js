const express = require('express');
const Admin = require('../models/Admin');
const Syllabus = require('../models/Syllabus');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();


router.get('/syllabi', auth, async (req, res) => {
  try {
    let query = { isActive: true };
    
   
    if (req.admin.role !== 'superadmin') {
      query.uploaderId = req.admin._id;
    }

    const syllabi = await Syllabus.find(query)
      .sort({ createdAt: -1 })
      .populate('uploaderId', 'username email');
    
    res.json(syllabi);
  } catch (error) {
    console.error('Error fetching admin syllabi:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/analytics', auth, async (req, res) => {
  try {
    let matchQuery = { isActive: true };
    

    if (req.admin.role !== 'superadmin') {
      matchQuery.uploaderId = req.admin._id;
    }

    const analytics = await Syllabus.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' },
          totalViews: { $sum: '$viewCount' }
        }
      }
    ]);

    const topDownloaded = await Syllabus.find(matchQuery)
      .sort({ downloadCount: -1 })
      .limit(10)
      .select('title courseCode downloadCount viewCount');

    res.json({
      totalFiles: analytics[0]?.totalFiles || 0,
      totalDownloads: analytics[0]?.totalDownloads || 0,
      totalViews: analytics[0]?.totalViews || 0,
      topDownloaded
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, role, assignedCourses } = req.body;
    
    const admin = new Admin({
      username,
      email,
      password,
      role: role || 'admin',
      assignedCourses: assignedCourses || []
    });
    
    await admin.save();
    

    const adminResponse = admin.toObject();
    delete adminResponse.password;
    
    res.status(201).json(adminResponse);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;