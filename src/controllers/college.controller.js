const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const College = require("../models/college.model");
const Branch = require("../models/branch.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const Notice = require("../models/notice.model");
const { asyncHandler } = require("../middlewares/errorHandler");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/colleges  (superadmin)
const addCollege = asyncHandler(async (req, res) => {
  const { collegeCode, loginEmail } = req.body;

  if (await College.findOne({ collegeCode: collegeCode?.toUpperCase() }))
    return res.status(400).json({ message: "College code already exists" });

  if (await College.findOne({ loginEmail: loginEmail?.toLowerCase() }))
    return res.status(400).json({ message: "Login email already in use" });

  const data = { ...req.body };
  if (req.files?.logo) data.logo = `/uploads/${req.files.logo[0].filename}`;
  if (req.files?.coverImage) data.coverImage = `/uploads/${req.files.coverImage[0].filename}`;

  const college = await College.create(data);
  const result = college.toObject();
  delete result.loginPassword;
  res.status(201).json({ message: "College added successfully", college: result });
});

// POST /api/colleges/login  (college login)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const college = await College.findOne({ loginEmail: email?.toLowerCase() });

  if (!college || !(await college.comparePassword(password)))
    return res.status(401).json({ message: "Invalid email or password" });

  if (!college.isActive) return res.status(403).json({ message: "College is deactivated" });

  const result = college.toObject();
  delete result.loginPassword;
  res.json({ message: "Login successful", token: generateToken(college._id), role: "college", college: result });
});

// GET /api/colleges  (superadmin)
const getAllColleges = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [colleges, total] = await Promise.all([
    College.find().select("-loginPassword").sort({ createdAt: -1 }).skip(skip).limit(limit),
    College.countDocuments(),
  ]);
  res.json({ colleges, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/colleges/profile  (college - own profile)
const getProfile = asyncHandler(async (req, res) => {
  res.json({ college: req.user });
});

// GET /api/colleges/:id  (superadmin)
const getCollege = asyncHandler(async (req, res) => {
  const college = await College.findById(req.params.id).select("-loginPassword");
  if (!college) return res.status(404).json({ message: "College not found" });
  res.json({ college });
});

// PUT /api/colleges/profile  (college - update own profile)
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ["collegeName", "collegeShortName", "affiliation", "establishmentYear",
    "address", "city", "state", "pincode", "googleMapLink", "phone", "email",
    "website", "themeColorPrimary", "themeColorSecondary", "appName"];

  const data = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) data[key] = req.body[key]; });
  if (req.files?.logo) data.logo = `/uploads/${req.files.logo[0].filename}`;
  if (req.files?.coverImage) data.coverImage = `/uploads/${req.files.coverImage[0].filename}`;

  const college = await College.findByIdAndUpdate(req.user._id, data, { new: true, runValidators: true }).select("-loginPassword");
  res.json({ message: "Profile updated successfully", college });
});

// PUT /api/colleges/:id  (superadmin - full update)
const updateCollege = asyncHandler(async (req, res) => {
  const { collegeCode, loginEmail } = req.body;

  if (collegeCode) {
    const ex = await College.findOne({ collegeCode: collegeCode.toUpperCase(), _id: { $ne: req.params.id } });
    if (ex) return res.status(400).json({ message: "College code already exists" });
  }
  if (loginEmail) {
    const ex = await College.findOne({ loginEmail: loginEmail.toLowerCase(), _id: { $ne: req.params.id } });
    if (ex) return res.status(400).json({ message: "Login email already in use" });
  }

  const data = { ...req.body };
  if (req.files?.logo) data.logo = `/uploads/${req.files.logo[0].filename}`;
  if (req.files?.coverImage) data.coverImage = `/uploads/${req.files.coverImage[0].filename}`;

  const college = await College.findById(req.params.id);
  if (!college) return res.status(404).json({ message: "College not found" });

  const { loginPassword, ...rest } = data;
  Object.keys(rest).forEach((key) => { college[key] = rest[key]; });
  if (loginPassword) college.loginPassword = loginPassword;

  await college.save();
  const result = college.toObject();
  delete result.loginPassword;
  res.json({ message: "College updated successfully", college: result });
});

// PUT /api/colleges/change-password  (college)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const college = await College.findById(req.user._id);

  if (!(await college.comparePassword(currentPassword)))
    return res.status(400).json({ message: "Current password is incorrect" });

  college.loginPassword = newPassword;
  await college.save();
  res.json({ message: "Password changed successfully" });
});

// DELETE /api/colleges/:id  (superadmin)
const deleteCollege = asyncHandler(async (req, res) => {
  const college = await College.findByIdAndDelete(req.params.id);
  if (!college) return res.status(404).json({ message: "College not found" });
  res.json({ message: "College deleted successfully" });
});

// PATCH /api/colleges/:id/toggle-status  (superadmin)
const toggleStatus = asyncHandler(async (req, res) => {
  const college = await College.findById(req.params.id);
  if (!college) return res.status(404).json({ message: "College not found" });
  college.isActive = !college.isActive;
  await college.save();
  res.json({ message: `College ${college.isActive ? "activated" : "deactivated"}`, isActive: college.isActive });
});

// GET /api/colleges/dashboard  (college)
const getDashboard = asyncHandler(async (req, res) => {
  const cidObj = req.user._id;

  const [branches, totalStaff, notices, studentStats] = await Promise.all([
    Branch.find({ college: cidObj }).select("branchName branchCode totalSeats").lean(),
    Staff.countDocuments({ college: cidObj }),
    Notice.countDocuments({ college: cidObj }),
    Student.aggregate([
      { $match: { college: cidObj } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const branchIds = branches.map((b) => b._id);

  const branchStudentCounts = await Student.aggregate([
    { $match: { college: cidObj, branch: { $in: branchIds } } },
    { $group: { _id: { branch: "$branch", status: "$status" }, count: { $sum: 1 } } },
  ]);

  const branchStudentMap = {};
  branchStudentCounts.forEach(({ _id, count }) => {
    if (_id?.branch) {
      const bid = _id.branch.toString();
      if (!branchStudentMap[bid]) branchStudentMap[bid] = { total: 0, pending: 0, approved: 0, disapproved: 0 };
      branchStudentMap[bid][_id.status] = count;
      branchStudentMap[bid].total += count;
    }
  });

  const branchStats = branches.map((b) => ({
    ...b,
    students: branchStudentMap[b._id.toString()] || { total: 0, pending: 0, approved: 0, disapproved: 0 },
  }));

  const students = { total: 0, pending: 0, approved: 0, disapproved: 0 };
  studentStats.forEach(({ _id, count }) => { if (_id) { students[_id] = count; students.total += count; } });

  res.json({
    overview: { totalBranches: branches.length, totalStaff, totalNotices: notices, students },
    branches: branchStats,
  });
});

module.exports = { addCollege, login, getAllColleges, getProfile, getCollege, updateProfile, updateCollege, changePassword, deleteCollege, toggleStatus, getDashboard };
