const path = require("path");
const fs = require("fs");
const Timetable = require("../models/timetable.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const { asyncHandler } = require("../middlewares/errorHandler");
const { notifyBranch } = require("../utils/notify");

// POST /api/timetable  (staff - HOD uploads)
const upload = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const { title } = req.body;
  if (!req.file) return res.status(400).json({ message: "File is required" });

  const timetable = await Timetable.create({
    title,
    fileUrl: `/uploads/${req.file.filename}`,
    college: req.user.college,
    branch: req.user.branch,
    uploadedBy: req.user._id,
  });

  await timetable.populate("branch", "branchName branchCode");

  // Notify all staff + students of this branch
  notifyBranch({
    Staff, Student,
    branchId: req.user.branch,
    collegeId: req.user.college,
    title: "📅 New Timetable Uploaded",
    body: `${title} has been uploaded for your branch`,
    data: { type: "timetable", timetableId: timetable._id.toString() },
  }).catch(() => {});

  res.status(201).json({ message: "Timetable uploaded successfully", timetable });
});

// GET /api/timetable  (staff - own branch | student - own branch)
const getAll = asyncHandler(async (req, res) => {
  const branchId = req.user.branch;
  const collegeId = req.user.college;

  if (!branchId) return res.status(400).json({ message: "No branch assigned to your account" });

  const timetables = await Timetable.find({ college: collegeId, branch: branchId })
    .populate("branch", "branchName branchCode")
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 });

  res.json({ timetables });
});

// DELETE /api/timetable/:id  (staff - HOD only, own branch)
// FIX: deletes physical file from uploads/ on record delete
const remove = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const timetable = await Timetable.findOneAndDelete({
    _id: req.params.id,
    college: req.user.college,
    branch: req.user.branch,
  });
  if (!timetable) return res.status(404).json({ message: "Timetable not found" });

  // Delete physical file
  const filePath = path.join(__dirname, "../../", timetable.fileUrl);
  fs.unlink(filePath, (err) => {
    if (err) console.error("File delete error:", err.message);
  });

  res.json({ message: "Timetable deleted successfully" });
});

module.exports = { upload, getAll, remove };
