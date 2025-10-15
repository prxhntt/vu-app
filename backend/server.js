const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

dotenv.config();

cloudinary.config({
  cloud_name: 'dhysyq9ap',
  api_key: '314467727221991',
  api_secret: 'qdvAy383GA9o5jZ0DwdSkoD80vo'
});

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vu-syllabusportal.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:5002'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/contact.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/course/:courseCode', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/course-details.html'));
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/syllabi', require('./routes/syllabi'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/search', require('./routes/search'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Prxhntt:<db_password>@cluster0.pbsnvwz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.log('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
});