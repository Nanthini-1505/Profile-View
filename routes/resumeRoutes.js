import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import Resume from "../models/Resume.js";
import College from "../models/College.js";
import path from "path";
import fs from "fs";
import { createRequire } from "module";

const router = express.Router();
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const uploadPath = path.join(process.cwd(), "uploads", "resumes");

// Ensure uploads folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ==========================
// Admin / Base64 Upload
// ==========================
router.post("/upload-base64", async (req, res) => {
  try {
    const { fileName, fileData, uploadedBy, collegeId } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ message: "File name and data are required" });
    }

    // ✅ Only PDF
    if (path.extname(fileName).toLowerCase() !== ".pdf") {
      return res.status(400).json({ message: "Only PDF files are supported" });
    }

    // Save file
    const storedName = Date.now() + "-" + fileName;
    const filePath = path.join(uploadPath, storedName);
    const base64Data = fileData.replace(/^data:.*;base64,/, "");
    fs.writeFileSync(filePath, base64Data, "base64");

    // Extract text from PDF (safe mode)
    let resumeText = "";
    try {
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      resumeText = pdfData.text?.trim() || "";
    } catch (e) {
      console.warn("PDF parse failed, saving without content:", e.message);
    }

    // Save in DB
    const resume = new Resume({
      fileName,
      storedName,
      fileUrl: `/uploads/resumes/${storedName}`,
      uploadedBy,
      collegeId,
      content: resumeText,
    });

    await resume.save();
    res.json({ message: "PDF uploaded successfully", resume });
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// ==========================
// College File Upload (Multer)
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/resumes/");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

// ✅ Allow both PDF and Word docs
function fileFilter(req, file, cb) {
  const allowedTypes = [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF or Word files allowed"), false);
  }
}

const upload = multer({ storage, fileFilter });

// College upload
router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { department, collegeId, collegeName } = req.body;
    if (!department || !collegeId) {
      return res.status(400).json({ message: "Department and College are required" });
    }

    let resumeText = "";

    if (req.file.mimetype === "application/pdf") {
      try {
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        resumeText = pdfData.text?.trim() || "";
      } catch (e) {
        console.warn("PDF parse failed:", e.message);
      }
    }

    const newResume = new Resume({
      fileName: req.file.originalname,
      storedName: req.file.filename,
      fileUrl: `/uploads/resumes/${req.file.filename}`,
      department,
      collegeId,
      collegeName,
      uploadedBy: "college",
      uploadedAt: new Date(),
      content: resumeText,
    });

    await newResume.save();
    res.status(200).json({ message: "Resume uploaded successfully", resume: newResume });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ============ 📌 Search Resumes ============
// HR or admin can search across all resumes
router.get("/search", async (req, res) => {
  try {
    const { q, collegeId } = req.query;
    if (!q) return res.status(400).json({ message: "Search query required" });

    const filter = { content: { $regex: q, $options: "i" } };
    if (collegeId) filter.collegeId = collegeId;

    const results = await Resume.find(filter).select("fileName fileUrl uploadedBy collegeId content");
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

// ============ 📌 Get Resume Count ============
router.get("/count/:collegeId", async (req, res) => {
  try {
    const { collegeId } = req.params;
    const count = await Resume.countDocuments({ collegeId });
    res.json({ collegeId, count });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ============ 📌 Get Resumes ============
router.get("/college/:collegeId", async (req, res) => {
  try {
    const { collegeId } = req.params;
    const resumes = await Resume.find({ collegeId }).sort({ createdAt: -1 });
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ============ 📌 Delete Resume ============
router.delete("/:id", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // remove file
    if (resume.fileUrl) {
      const filePath = path.join(process.cwd(), "uploads", "resumes", path.basename(resume.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Resume.findByIdAndDelete(req.params.id);
    res.json({ message: "Resume deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Server error while deleting resume" });
  }
});

export default router;
