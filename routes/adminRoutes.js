import express from 'express';
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === 'sprofileview@gmail.com' && password === 'pv') {
    return res.json({
      message: 'Login successful',
      token: 'mock-admin-token',
    });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

export default router;
