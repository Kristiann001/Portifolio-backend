import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Simple CORS
app.use(cors());
app.use(express.json());

// Debug logging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection - SIMPLE
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/portfolioDB')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('MongoDB error:', err));

// Simple Schemas
const achievementSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  link: String
}, { timestamps: true });

const educationSchema = new mongoose.Schema({
  institution: String,
  title: String,
  duration: String,
  description: String,
  image: String
}, { timestamps: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
const Project = mongoose.model('Project', projectSchema);
const Education = mongoose.model('Education', educationSchema);

// Create uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Simple file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static(uploadsDir));

// ==================== ADMIN PASSWORD CHECK ====================
app.post('/admin/verify', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.json({ success: false, error: 'Wrong password' });
  }
});

// ==================== ACHIEVEMENTS ====================
// Get achievements
app.get('/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find().sort({ createdAt: -1 });
    // Transform image paths to URLs
    const achievementsWithUrls = achievements.map(ach => ({
      ...ach._doc,
      image: ach.image.startsWith('http') ? ach.image : `${req.protocol}://${req.get('host')}/uploads/${ach.image}`
    }));
    res.json(achievementsWithUrls);
  } catch (error) {
    res.json([]); // Return empty array on error
  }
});

// Add achievement
app.post('/achievements', upload.single('image'), async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    
    let image = '';
    if (req.file) {
      image = req.file.filename;
    } else if (imageUrl) {
      image = imageUrl;
    }
    
    const achievement = new Achievement({
      title,
      description,
      image
    });
    
    await achievement.save();
    res.json(achievement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update achievement
app.put('/achievements/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, imageUrl } = req.body;
    const updateData = { title, description };
    
    if (req.file) {
      updateData.image = req.file.filename;
    } else if (imageUrl) {
      updateData.image = imageUrl;
    }
    
    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    res.json(achievement);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Delete achievement
app.delete('/achievements/:id', async (req, res) => {
  try {
    await Achievement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ==================== PROJECTS ====================
// Get projects
app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    // Transform image paths to URLs
    const projectsWithUrls = projects.map(proj => ({
      ...proj._doc,
      image: proj.image.startsWith('http') ? proj.image : `${req.protocol}://${req.get('host')}/uploads/${proj.image}`
    }));
    res.json(projectsWithUrls);
  } catch (error) {
    res.json([]); // Return empty array on error
  }
});

// Add project
app.post('/projects', upload.single('image'), async (req, res) => {
  try {
    const { title, description, link, imageUrl } = req.body;
    
    let image = '';
    if (req.file) {
      image = req.file.filename;
    } else if (imageUrl) {
      image = imageUrl;
    }
    
    const project = new Project({
      title,
      description,
      image,
      link: link || ''
    });
    
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update project
app.put('/projects/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, link, imageUrl } = req.body;
    const updateData = { title, description, link: link || '' };
    
    if (req.file) {
      updateData.image = req.file.filename;
    } else if (imageUrl) {
      updateData.image = imageUrl;
    }
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Delete project
app.delete('/projects/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ==================== EMAIL ====================
app.post('/send', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: subject || 'Portfolio Contact',
      text: `Name: ${name || 'Anonymous'}\nEmail: ${email}\n\n${message}`
    });
    
    res.json({ success: true });
  } catch (error) {
    console.log('Email error:', error);
    res.status(500).json({ success: false, error: 'Email failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
