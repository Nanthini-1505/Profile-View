import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import User from "../models/User.js";
import HR from "../models/HR.js";
import College from "../models/College.js";

const router = express.Router();

// Temporary in-memory token store
const resetTokens = new Map();

/* ===============================
   REGISTER
================================ */

// 🔹 Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, company, college, phone, address, state, district } = req.body;

    // 1️⃣ Required field check
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }
    if (role.toLowerCase() === "college" && !college) {
      return res.status(400).json({ message: "College name is required for role 'College'" });
    }
    if (role.toLowerCase() === "hr" && !company) {
      return res.status(400).json({ message: "Company name is required for role 'HR'" });
    }

    // 2️⃣ Check duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered. Please login." });
    }

    // 3️⃣ HR Email Validation
    if (role.toLowerCase() === "hr" && company) {
      const [localPart, domain] = email.toLowerCase().split("@");

      // Split domain into parts (for subdomain check)
      const domainParts = domain.split(".");

      // Extract company keywords (ignore short words < 3 letters)
      const companyWords = company
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2);

      // 1. Check if domain or any subdomain part contains company word
      const domainMatch = companyWords.some(word =>
        domain.includes(word) || domainParts.some(part => part.includes(word))
      );

      // 2. Check if localPart contains company word (for gmail/outlook cases)
      const localMatch = companyWords.some(word => localPart.includes(word));

      // ✅ Allow if either domain/subdomain OR localPart matches
      if (!domainMatch && !localMatch) {
        return res.status(400).json({
          message:
            "HR email must contain at least one word from company name (in local-part, domain, or subdomain)."
        });
      }
    }

    // 4️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Save user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role.toLowerCase() === "hr" ? "HR" : "College",
      phone,
      address,
      state,
      district,
      company: role.toLowerCase() === "hr" ? company : null,
      college: role.toLowerCase() === "college" ? college : null,
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// LOGIN ROUTE
// backend/routes/authRoutes.js
// backend/routes/authRoutes.js
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password, and role are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Role check
    if (user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({
        message: `This account is registered as ${user.role}. Please login as ${user.role}.`
      });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "fallbackSecret", // prevent crash
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});




/* ===============================
   EMAIL TRANSPORTER
================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    // Email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset',
      html: `<p>Click here to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Reset link sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending reset link', error });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired token', error });
  }
});

/* ===============================
   LIST ROUTES
================================ */
router.get("/hr-list", async (req, res) => {
  try {
    const hrs = await HR.find({}, "name email phone company"); // <-- include company
    res.json(hrs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching HR list" });
  }
});


router.get("/college-list", async (req, res) => {
  try {
    const colleges = await College.find({}, "name email phone");
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ message: "Error fetching college list" });
  }
});

/* ===============================
   GET USER BY ID
================================ */
router.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// GET user profile by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, company, college } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, company, college },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
