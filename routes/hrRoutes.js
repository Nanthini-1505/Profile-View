import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Get all HR users with formatted phone
router.get('/', async (req, res) => {
  try {
    const hrList = await User.find({ role: 'HR' }, 'name email phone company address state district');
    const formatted = hrList.map(hr => ({
      ...hr.toObject(),
      phone: hr.phone && hr.phone.trim() !== '' ? hr.phone : 'N/A',
    }));
    res.status(200).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching HR list' });
  }
});
// /**
//  * Total resumes uploaded (for all HRs)
//  */
// router.get("/total-resumes", async (req, res) => {
//   try {
//     const totalResumes = await Resume.countDocuments();
//     res.json({ totalResumes });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// /**
//  * Get all resumes with selection info for this HR
//  */
// router.get("/resumes/:hrId", async (req, res) => {
//   try {
//     const { hrId } = req.params;
//     const resumes = await Resume.find();

//     const data = resumes.map(r => ({
//       _id: r._id,
//       fileName: r.fileName,
//        fileUrl: r.fileUrl || "",
//       selectedByHR: r.selectedBy.includes(hrId),
//     }));

//     res.json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// /**
//  * Select/unselect a resume
//  */
// router.post("/select-resume", async (req, res) => {
//   try {
//     const { hrUserId, resumeId, selected } = req.body;
//     const resume = await Resume.findById(resumeId);
//     if (!resume) return res.status(404).json({ message: "Resume not found" });

//     if (selected) {
//       if (!resume.selectedBy.includes(hrUserId)) resume.selectedBy.push(hrUserId);
//     } else {
//       resume.selectedBy = resume.selectedBy.filter(id => id.toString() !== hrUserId);
//     }

//     await resume.save();
//     res.json({ message: "Resume selection updated", resume });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


// 📌 Get all resumes selected by this HR
// routes/hrRoutes.js
router.get("/resumes/all/:hrId", async (req, res) => {
  try {
    // return all resumes, but annotate with selection status
    const { hrId } = req.params;
    const resumes = await Resume.find();

    const data = resumes.map((r) => {
      const sel = r.selectedBy.find(
        (s) => String(s.hrId) === String(hrId) && s.selected
      );
      return {
        ...r.toObject(),
        selectedByHR: !!sel,
      };
    });

    res.json(data);
  } catch (err) {
    console.error("Error fetching all resumes:", err);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/resumes/:hrId", async (req, res) => {
  try {
    const { hrId } = req.params;
    const resumes = await Resume.find({
      selectedBy: { $elemMatch: { hrId, selected: true } },
    });
    res.json(resumes);
  } catch (err) {
    console.error("Error fetching HR resumes:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 📌 Select or unselect a resume by HR

router.post("/select/:resumeId/:hrId", async (req, res) => {
  try {
    const { resumeId, hrId } = req.params;
    const { selected } = req.body;

    const resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const hrObjectId = new mongoose.Types.ObjectId(hrId);

    // check if HR already selected/unselected
    const existing = resume.selectedBy.find(
      (s) => s.hrId && s.hrId.toString() === hrObjectId.toString()
    );

    if (existing) {
      existing.selected = selected;
    } else {
      resume.selectedBy.push({ hrId: hrObjectId, selected });
    }

    await resume.save();
    res.json({ message: "Resume selection updated", resume });
  } catch (err) {
    console.error("Error selecting resume:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// 📌 Get total resumes count
router.get("/total-resumes", async (req, res) => {
  try {
    const totalResumes = await Resume.countDocuments();
    res.json({ totalResumes });
  } catch (err) {
    console.error("Error fetching total resumes:", err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * Download resume by ID
 */
router.get("/download/:resumeId", async (req, res) => {
  try {
    const { resumeId } = req.params;
    const resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const filePath = path.join(process.cwd(), resume.fileUrl); // fileUrl stores relative path like 'uploads/resumes/file.pdf'

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found on server" });

    res.download(filePath, resume.fileName); // triggers download with original file name
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/**
 * Mark resume as viewed by HR
 */
router.patch('/:resumeId/viewed', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { viewedBy } = req.body;

    const resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    if (!resume.viewedBy.includes(viewedBy)) resume.viewedBy.push(viewedBy);

    await resume.save();
    res.json({ message: 'Resume marked as viewed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------- SETTINGS -------------------

// Get HR profile by ID
router.get("/profile/:hrId", async (req, res) => {
  try {
    const hr = await User.findById(req.params.hrId).select("-password");
    if (!hr || hr.role !== "HR") return res.status(404).json({ message: "HR not found" });
    res.json(hr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update HR profile by ID
router.put("/profile/:hrId", async (req, res) => {
  try {
    const { name, phone, company } = req.body;

    const updatedHR = await User.findByIdAndUpdate(
      req.params.hrId,
      { name, phone, company },
      { new: true }
    ).select("-password");

    if (!updatedHR || updatedHR.role !== "HR") return res.status(404).json({ message: "HR not found" });

    res.json(updatedHR);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;