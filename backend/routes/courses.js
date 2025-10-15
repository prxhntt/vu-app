const express = require('express');
const Course = require('../models/Course');
const Syllabus = require('../models/Syllabus');
const { auth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ name: 1 });
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:code', async (req, res) => {
  try {
    const course = await Course.findOne({ 
      code: req.params.code.toUpperCase(), 
      isActive: true 
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:code/syllabi', async (req, res) => {
  try {
    const courseCode = req.params.code.toUpperCase();
    const { semester } = req.query;
    
    let query = { courseCode, isActive: true };
    if (semester) {
      query.semester = parseInt(semester);
    }

    const syllabi = await Syllabus.find(query)
      .sort({ semester: 1, subject: 1 })
      .populate('uploaderId', 'username email');
    
    res.json(syllabi);
  } catch (error) {
    console.error('Error fetching syllabi:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { code, name, branch, description, duration, semesters } = req.body;
    
    const course = new Course({
      code: code.toUpperCase(),
      name,
      branch: branch.toUpperCase(),
      description,
      duration: duration || 4,
      semesters: semesters || 8
    });
    
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Course code already exists' });
    }
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;