const express = require('express');
const Syllabus = require('../models/Syllabus');

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const { q, course, semester, branch } = req.query;
    let query = { isActive: true };
    
    if (course) query.courseCode = course.toUpperCase();
    if (semester) query.semester = parseInt(semester);
    if (branch) query.branch = branch.toUpperCase();
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { subject: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    const syllabi = await Syllabus.find(query)
      .sort({ courseCode: 1, semester: 1 })
      .populate('uploaderId', 'username email')
      .limit(50);
    
    res.json(syllabi);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;