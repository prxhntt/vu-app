const express = require('express');
const Syllabus = require('../models/Syllabus');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const fetch = require('node-fetch'); 

const router = express.Router();



router.get('/', async (req, res) => {
  try {
    const { course, semester, branch, search } = req.query;
    let query = { isActive: true };
    
    if (course) query.courseCode = course.toUpperCase();
    if (semester) query.semester = parseInt(semester);
    if (branch) query.branch = branch.toUpperCase();
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const syllabi = await Syllabus.find(query)
      .sort({ courseCode: 1, semester: 1, subject: 1 })
      .populate('uploaderId', 'username email');
    
    res.json(syllabi);
  } catch (error) {
    console.error('Error fetching syllabi:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id)
      .populate('uploaderId', 'username email');
    
    if (!syllabus || !syllabus.isActive) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }
    
    res.json(syllabus);
  } catch (error) {
    console.error('Error fetching syllabus:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/upload', auth, async (req, res) => {
  try {
    const { courseCode, semester, subject, title, description, version, fileData, fileName } = req.body;

    if (!fileData) {
      return res.status(400).json({ message: 'No file data received' });
    }

    const course = await Course.findOne({ code: courseCode.toUpperCase(), isActive: true });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

  
    const uploadResult = await cloudinary.uploader.upload(fileData, {
      resource_type: 'raw',
      folder: 'syllabus-pdfs',
      public_id: `syllabus_${courseCode}_${semester}_${Date.now()}`,
      format: 'pdf',
      type: 'upload',
      access_mode: 'public'
    });

    console.log('Cloudinary Upload:', {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format
    });

    const syllabus = new Syllabus({
      courseCode: courseCode.toUpperCase(),
      branch: course.branch,
      semester: parseInt(semester),
      subject,
      title,
      description,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileName: fileName || `syllabus_${courseCode}_${semester}.pdf`,
      fileSize: uploadResult.bytes,
      uploaderId: req.admin._id,
      version: version || 1
    });

    await syllabus.save();
    await syllabus.populate('uploaderId', 'username email');
    
    res.status(201).json({
      message: 'Syllabus uploaded successfully to cloud',
      syllabus: syllabus
    });

  } catch (error) {
    console.error('Error uploading syllabus:', error);
    res.status(500).json({ 
      message: 'Upload failed',
      error: error.message 
    });
  }
});


router.get('/:id/preview', async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    
    if (!syllabus || !syllabus.isActive) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }

    await Syllabus.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    
    const response = await fetch(syllabus.fileUrl);
    
    if (!response.ok) {
      throw new Error(`Cloudinary response: ${response.status}`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${syllabus.fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

   
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Error previewing PDF:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});


router.get('/:id/download', async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    
    if (!syllabus || !syllabus.isActive) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }

    await Syllabus.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } });

 
    const response = await fetch(syllabus.fileUrl);
    
    if (!response.ok) {
      throw new Error(`Cloudinary response: ${response.status}`);
    }


    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${syllabus.fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

 
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    
    if (!syllabus) {
      return res.status(404).json({ message: 'Syllabus not found' });
    }

    if (syllabus.publicId) {
      await cloudinary.uploader.destroy(syllabus.publicId, {
        resource_type: 'raw'
      });
    }

    await Syllabus.findByIdAndDelete(req.params.id);

    res.json({ message: 'Syllabus deleted successfully' });
  } catch (error) {
    console.error('Error deleting syllabus:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;