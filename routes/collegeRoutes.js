import express from 'express';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import College from '../models/College.js';

const router = express.Router();

// Get list of colleges
router.get('/', async (req, res) => {
  try {
    const colleges = await User.find(
      { role: 'College' },
      'name email phone address state  district'
    );
    res.json(colleges);
  } catch (err) {
    console.error('Error fetching college list:', err);
    res.status(500).json({ message: 'Error fetching college list' });
  }
});



export default router;
