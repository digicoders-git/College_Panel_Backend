const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "ResourceCategory", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    year: { type: String, default: null },        // e.g. "2024", "2023-24"
    semester: { type: String, default: null },    // e.g. "1", "2", "3"
    fileUrl: { type: String, default: null },     // uploaded file path
    externalLink: { type: String, default: null },// optional external URL
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "uploadedByRole" },
    uploadedByRole: { type: String, enum: ["College", "Staff"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);
