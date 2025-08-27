import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileUrl: { type: String },
    uploadedBy: { type: String, enum: ["admin", "college"], required: true },
    collegeId: { type: String },
    collegeName: String,
    state: { type: String },
    district: { type: String },
    department: { type: String },
    content: { type: String }, // extracted searchable text
    viewed: { type: Boolean, default: false },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    selectedBy: [
      {
        hrId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        selected: { type: Boolean, default: false },
      },
    ],
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Resume || mongoose.model("Resume", resumeSchema);
