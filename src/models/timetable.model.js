const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);
