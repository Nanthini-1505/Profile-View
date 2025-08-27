import express from 'express';
import User from '../models/User.js';
import Resume from '../models/Resume.js';

const router = express.Router();

router.get('/adminstats', async (req, res) => {
  try {
    // Count dynamically based on the current database state
    const [adminResumeCount, collegeResumeCount, hrCount, collegeCount] = await Promise.all([
      Resume.countDocuments({ uploadedBy: 'admin' }),   // resumes uploaded by admin
      Resume.countDocuments({ uploadedBy: 'college' }), // resumes uploaded by colleges
      User.countDocuments({ role: 'HR' }),
      User.countDocuments({ role: 'College' }),
    ]);

    res.json({ adminResumeCount, collegeResumeCount, hrCount, collegeCount });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
