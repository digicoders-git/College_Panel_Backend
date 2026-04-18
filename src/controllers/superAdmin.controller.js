const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const SuperAdmin = require("../models/superAdmin.model");
const College = require("../models/college.model");
const Branch = require("../models/branch.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const Notice = require("../models/notice.model");
const { asyncHandler } = require("../middlewares/errorHandler");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/super-admin/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await SuperAdmin.findOne({ email }))
    return res.status(400).json({ message: "Email already registered" });

  const admin = await SuperAdmin.create({ name, email, password, phone });
  res.status(201).json({
    message: "SuperAdmin registered successfully",
    token: generateToken(admin._id),
    admin: { id: admin._id, name: admin.name, email: admin.email },
  });
});

// POST /api/super-admin/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await SuperAdmin.findOne({ email });
  if (!admin || !(await admin.comparePassword(password)))
    return res.status(401).json({ message: "Invalid email or password" });

  res.json({
    message: "Login successful",
    token: generateToken(admin._id),
    admin: { id: admin._id, name: admin.name, email: admin.email },
  });
});

// GET /api/super-admin/profile
const getProfile = asyncHandler(async (req, res) => {
  res.json({ admin: req.user });
});

// PUT /api/super-admin/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updateData = { name, phone };
  if (req.file) updateData.profileImage = `/uploads/${req.file.filename}`;

  const admin = await SuperAdmin.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  res.json({ message: "Profile updated successfully", admin });
});

// PUT /api/super-admin/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await SuperAdmin.findById(req.user._id);

  if (!(await admin.comparePassword(currentPassword)))
    return res.status(400).json({ message: "Current password is incorrect" });

  admin.password = newPassword;
  await admin.save();
  res.json({ message: "Password changed successfully" });
});

// GET /api/super-admin/dashboard
// Returns platform-wide stats + per-college breakdown
const getDashboard = asyncHandler(async (req, res) => {
  const [totalColleges, activeColleges, totalBranches, totalStaff, totalStudents, colleges] =
    await Promise.all([
      College.countDocuments(),
      College.countDocuments({ isActive: true }),
      Branch.countDocuments(),
      Staff.countDocuments(),
      Student.countDocuments(),
      College.find().select("_id collegeName collegeCode type isActive").lean(),
    ]);

  // per-college breakdown
  const collegeIds = colleges.map((c) => new mongoose.Types.ObjectId(c._id.toString()));

  const [branchCounts, staffCounts, studentCounts, noticeCounts] = await Promise.all([
    Branch.aggregate([{ $match: { college: { $in: collegeIds } } }, { $group: { _id: "$college", count: { $sum: 1 } } }]),
    Staff.aggregate([{ $match: { college: { $in: collegeIds } } }, { $group: { _id: "$college", count: { $sum: 1 } } }]),
    Student.aggregate([
      { $match: { college: { $in: collegeIds } } },
      { $group: { _id: { college: "$college", status: "$status" }, count: { $sum: 1 } } },
    ]),
    Notice.aggregate([{ $match: { college: { $in: collegeIds } } }, { $group: { _id: "$college", count: { $sum: 1 } } }]),
  ]);

  const toMap = (arr) => arr.reduce((m, i) => { if (i._id) m[i._id.toString()] = i.count; return m; }, {});
  const branchMap = toMap(branchCounts);
  const staffMap = toMap(staffCounts);
  const noticeMap = toMap(noticeCounts);

  // student status map: { collegeId: { total, pending, approved, disapproved } }
  const studentMap = {};
  studentCounts.forEach(({ _id, count }) => {
    if (_id && _id.college) {
      const cid = _id.college.toString();
      if (!studentMap[cid]) studentMap[cid] = { total: 0, pending: 0, approved: 0, disapproved: 0 };
      studentMap[cid][_id.status] = count;
      studentMap[cid].total += count;
    }
  });

  const collegeStats = colleges.map((c) => {
    const cid = c._id.toString();
    return {
      ...c,
      branches: branchMap[cid] || 0,
      staff: staffMap[cid] || 0,
      notices: noticeMap[cid] || 0,
      students: studentMap[cid] || { total: 0, pending: 0, approved: 0, disapproved: 0 },
    };
  });

  res.json({
    overview: { totalColleges, activeColleges, inactiveColleges: totalColleges - activeColleges, totalBranches, totalStaff, totalStudents },
    colleges: collegeStats,
  });
});

// GET /api/super-admin/colleges/:id/stats
const getCollegeStats = asyncHandler(async (req, res) => {
  const collegeId = req.params.id;

  const college = await College.findById(collegeId).select("collegeName collegeCode type isActive").lean();
  if (!college) return res.status(404).json({ message: "College not found" });

  const [staff, students, branches] = await Promise.all([
    Staff.find({ college: collegeId }).select("-password -fcmToken").populate("role", "roleName").populate("branch", "branchName branchCode").lean(),
    Student.find({ college: collegeId }).select("-password -fcmToken").populate("branch", "branchName branchCode").lean(),
    Branch.find({ college: collegeId }).select("branchName branchCode totalSeats").lean(),
  ]);

  res.json({
    college,
    stats: {
      totalStaff: staff.length,
      totalStudents: students.length,
      totalBranches: branches.length,
      studentsByStatus: {
        pending: students.filter((s) => s.status === "pending").length,
        approved: students.filter((s) => s.status === "approved").length,
        disapproved: students.filter((s) => s.status === "disapproved").length,
      },
    },
    staff,
    students,
    branches,
  });
});

module.exports = { register, login, getProfile, updateProfile, changePassword, getDashboard, getCollegeStats };
