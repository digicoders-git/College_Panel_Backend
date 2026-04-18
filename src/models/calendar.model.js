const mongoose = require("mongoose");

const calendarSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    eventDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    eventType: {
      type: String,
      enum: ["Holiday", "Exam", "Event", "Meeting", "Other"],
      default: "Other",
    },
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Calendar", calendarSchema);
