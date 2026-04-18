const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: null },
    images: [{ type: String }], // array of uploaded file URLs

    // "college" = visible to all students of college
    // "branch"  = visible only to students of that branch
    scope: { type: String, enum: ["college", "branch"], required: true },

    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null }, // required when scope=branch

    postedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "postedByRole" },
    postedByRole: { type: String, required: true, enum: ["College", "Staff"] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notice", noticeSchema);
