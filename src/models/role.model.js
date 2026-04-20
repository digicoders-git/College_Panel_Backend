const mongoose = require("mongoose");

const PERMISSIONS = [
  "manage_students",
  "manage_notices",
  "manage_timetable",
  "manage_calendar",
  "manage_resources",
  "view_notices",
  "view_timetable",
  "view_calendar",
  "view_students",
  "view_resources",
];

const roleSchema = new mongoose.Schema(
  {
    roleName: { type: String, required: true, trim: true },
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    permissions: [{ type: String, enum: PERMISSIONS }],
  },
  { timestamps: true }
);

roleSchema.index({ roleName: 1, college: 1 }, { unique: true });

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
module.exports.PERMISSIONS = PERMISSIONS;
