const jwt = require("jsonwebtoken");
const Staff = require("../models/staff.model");
const { asyncHandler } = require("../middlewares/errorHandler");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/staff  (college adds staff)
const addStaff = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, role, branch } = req.body;

  if (await Staff.findOne({ email }))
    return res.status(400).json({ message: "Email already registered" });

  const staff = await Staff.create({ name, email, mobile, password, role, branch, college: req.user._id });
  await staff.populate("role branch college", "roleName branchName branchCode collegeName collegeCode");
  res.status(201).json({ message: "Staff added successfully", staff });
});

// POST /api/staff/login
// FIX: fetch staff WITH password first for comparePassword, then re-fetch without password for response
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const staffWithPassword = await Staff.findOne({ email }).populate("college", "isActive");
  if (!staffWithPassword || !(await staffWithPassword.comparePassword(password)))
    return res.status(401).json({ message: "Invalid email or password" });

  if (!staffWithPassword.isActive) return res.status(403).json({ message: "Account is deactivated" });
  if (!staffWithPassword.college?.isActive) return res.status(403).json({ message: "College is deactivated" });

  const staff = await Staff.findById(staffWithPassword._id)
    .select("-password")
    .populate("role", "roleName")
    .populate("branch", "branchName branchCode")
    .populate("college", "collegeName collegeCode isActive themeColorPrimary themeColorSecondary appName logo");

  res.json({ message: "Login successful", token: generateToken(staff._id), role: "staff", staff });
});

// GET /api/staff  (college gets all its staff) — with pagination
const getAllStaff = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { college: req.user._id };
  if (req.query.branchId) filter.branch = req.query.branchId;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

  const [staff, total] = await Promise.all([
    Staff.find(filter)
      .select("-password")
      .populate("role", "roleName")
      .populate("branch", "branchName branchCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Staff.countDocuments(filter),
  ]);
  res.json({ staff, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/staff/:id  (college gets one staff)
const getStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ _id: req.params.id, college: req.user._id })
    .select("-password")
    .populate("role", "roleName")
    .populate("branch", "branchName branchCode");
  if (!staff) return res.status(404).json({ message: "Staff not found" });
  res.json({ staff });
});

// GET /api/staff/profile  (staff gets own profile)
const getProfile = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.user._id)
    .select("-password")
    .populate("role", "roleName")
    .populate("branch", "branchName branchCode")
    .populate("college", "collegeName collegeCode appName logo themeColorPrimary themeColorSecondary")
    .lean();

  res.json({ staff });
});

// PUT /api/staff/profile  (staff updates own profile)
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const { personalDetails, professionalDetails, studyDetails, name, mobile } = req.body;
    const staff = await Staff.findById(req.user._id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    if (name) staff.name = name;
    if (mobile) staff.mobile = mobile;
    if (req.file) staff.profilePic = `/uploads/${req.file.filename}`;

    const applyUpdate = (field, incoming) => {
      if (!incoming) return;
      try {
        const parsedIncoming = typeof incoming === "string" ? JSON.parse(incoming) : incoming;
        if (parsedIncoming && typeof parsedIncoming === "object") {
          // If existing data is corrupted as a string, parse it first
          let existing = staff[field];
          if (typeof existing === "string") {
            try { existing = JSON.parse(existing); } catch (e) { existing = {}; }
          }
          
          Object.keys(parsedIncoming).forEach(k => {
            const val = (parsedIncoming[k] === "" || parsedIncoming[k] === undefined) ? null : parsedIncoming[k];
            staff.set(`${field}.${k}`, val);
          });
        }
      } catch (e) {
        console.error(`Error updating ${field}:`, e);
      }
    };

    applyUpdate("personalDetails", personalDetails);
    applyUpdate("professionalDetails", professionalDetails);
    applyUpdate("studyDetails", studyDetails);

    await staff.save();

    const updatedStaff = await Staff.findById(staff._id)
      .select("-password")
      .populate("role", "roleName")
      .populate("branch", "branchName branchCode")
      .populate("college", "collegeName collegeCode isActive themeColorPrimary themeColorSecondary appName logo")
      .lean();

    res.json({ message: "Profile updated successfully", staff: updatedStaff });
  } catch (err) {
    console.error("Staff Update Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

// PUT /api/staff/change-password  (staff)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const staff = await Staff.findById(req.user._id);

  if (!(await staff.comparePassword(currentPassword)))
    return res.status(400).json({ message: "Current password is incorrect" });

  staff.password = newPassword;
  await staff.save();
  res.json({ message: "Password changed successfully" });
});

// PUT /api/staff/:id  (college updates staff)
const updateStaff = asyncHandler(async (req, res) => {
  const { role, branch, isActive, name, mobile } = req.body;
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, college: req.user._id },
    { role, branch, isActive, name, mobile },
    { new: true, runValidators: true }
  ).select("-password").populate("role", "roleName").populate("branch", "branchName branchCode");

  if (!staff) return res.status(404).json({ message: "Staff not found" });
  res.json({ message: "Staff updated successfully", staff });
});

// DELETE /api/staff/:id  (college)
const deleteStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findOneAndDelete({ _id: req.params.id, college: req.user._id });
  if (!staff) return res.status(404).json({ message: "Staff not found" });
  res.json({ message: "Staff deleted successfully" });
});

// PATCH /api/staff/:id/toggle-status  (college)
const toggleStatus = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ _id: req.params.id, college: req.user._id });
  if (!staff) return res.status(404).json({ message: "Staff not found" });
  staff.isActive = !staff.isActive;
  await staff.save();
  res.json({ message: `Staff ${staff.isActive ? "activated" : "deactivated"}`, isActive: staff.isActive });
});

module.exports = { addStaff, login, getAllStaff, getStaff, getProfile, updateProfile, changePassword, updateStaff, deleteStaff, toggleStatus };
