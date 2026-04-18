const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchName: { type: String, required: true, trim: true },
    branchCode: { type: String, required: true, uppercase: true, trim: true },
    totalSeats: { type: Number, required: true, min: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "createdByRole" },
    createdByRole: { type: String, required: true, enum: ["SuperAdmin", "College"] },
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", default: null },
  },
  { timestamps: true }
);

// branchCode unique per owner
branchSchema.index({ branchCode: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model("Branch", branchSchema);
