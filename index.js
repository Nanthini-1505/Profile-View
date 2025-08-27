import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Route imports
import authRoutes from './routes/authRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import adminStatsRoutes from './routes/adminStatsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import collegeRoutes from './routes/collegeRoutes.js';
import Resume from './models/Resume.js';
import settingsRoutes from "./routes/settingsRoute.js";


dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/hr-list', hrRoutes);
app.use('/api/admin/college-list', collegeRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api/resumes', resumeRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/settings", settingsRoutes);

// ✅ Direct route to get resumes by collegeId
app.get('/api/resumes/:collegeId', async (req, res) => {
  const { collegeId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(collegeId)) {
    return res.status(400).json({ message: 'Invalid collegeId' });
  }

  try {
    const resumes = await Resume.find({ collegeId });
    res.json(resumes);
  } catch (err) {
    console.error('Error fetching resumes by collegeId:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resumeDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('✅ MongoDB Connected');
  });
})
.catch((err) => console.error('❌ MongoDB Connection Error:', err));
