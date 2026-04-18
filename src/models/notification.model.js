const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },

    // who receives
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "recipientRole" },
    recipientRole: { type: String, required: true, enum: ["Staff", "Student", "College"] },

    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
