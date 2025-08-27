import express from "express";
import User from "../models/User.js"; // your User model

const router = express.Router();

// GET HR user by email
router.get("/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email, role: "HR" });
    if (!user) return res.status(404).json({ error: "HR user not found" });

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// PUT / Update HR user settings
router.put("/:email", async (req, res) => {
  try {
    const { name, phone, company } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.email, role: "HR" },
      { name, phone, company },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: "HR user not found" });

    res.json({
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      company: updatedUser.company,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
