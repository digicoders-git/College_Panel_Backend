const jwt = require("jsonwebtoken");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const Branch = require("../models/branch.model");
const Staff = require("../models/staff.model");
const { asyncHandler } = require("../middlewares/errorHandler");
const { notify } = require("../utils/notify");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// GET /api/students/verify-college?code=ABCPOLY  (public)
const verifyCollege = asyncHandler(async (req, res) => {
  const college = await College.findOne({
    collegeCode: req.query.code?.toUpperCase(),
    isActive: true,
  }).select("collegeName collegeCode collegeShortName logo themeColorPrimary themeColorSecondary appName");

  if (!college) return res.status(404).json({ message: "Invalid or inactive college code" });
  res.json({ college });
});

// GET /api/students/branches?code=ABCPOLY  (public)
const getBranchesByCollegeCode = asyncHandler(async (req, res) => {
  const college = await College.findOne({ collegeCode: req.query.code?.toUpperCase(), isActive: true });
  if (!college) return res.status(404).json({ message: "Invalid or inactive college code" });

  const branches = await Branch.find({
    $or: [
      { createdBy: college._id },
      { createdByRole: "SuperAdmin" }
    ]
  }).select("branchName branchCode totalSeats");
  res.json({ branches });
});

// POST /api/students/register  (public)
const register = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, collegeCode, branchId } = req.body;

  const college = await College.findOne({ collegeCode: collegeCode?.toUpperCase(), isActive: true });
  if (!college) return res.status(400).json({ message: "Invalid or inactive college code" });

  const branch = await Branch.findOne({
    _id: branchId,
    $or: [{ createdBy: college._id }, { createdByRole: "SuperAdmin" }]
  });
  if (!branch) return res.status(400).json({ message: "Invalid branch for this college" });

  if (await Student.findOne({ email }))
    return res.status(400).json({ message: "Email already registered" });

  const student = await Student.create({
    name, email, mobile, password,
    college: college._id,
    branch: branch._id,
    status: "pending",
    ...(req.body.fcmToken && { fcmToken: req.body.fcmToken }),
  });

  // Notify college admin + branch HOD staff
  const notifData = { type: "registration", studentId: student._id.toString() };
  const notifTitle = "🎓 New Student Registration";
  const notifBody = `${student.name} has registered for ${branch.branchName} branch`;

  Promise.all([
    // college admin
    College.findById(college._id).select("_id fcmToken").then((col) => {
      if (col) notify({ recipients: [{ _id: col._id, fcmToken: col.fcmToken, role: "College" }], title: notifTitle, body: notifBody, data: notifData, college: college._id });
    }),
    // branch HOD/staff
    Staff.find({ college: college._id, branch: branch._id, isActive: true }).select("_id fcmToken").then((staffList) => {
      if (staffList.length) notify({ recipients: staffList.map((s) => ({ _id: s._id, fcmToken: s.fcmToken, role: "Staff" })), title: notifTitle, body: notifBody, data: notifData, college: college._id });
    }),
  ]).catch(() => { });

  res.status(201).json({
    message: "Registration successful, pending approval",
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
      status: student.status,
      college: { id: college._id, name: college.collegeName, code: college.collegeCode },
      branch: { id: branch._id, name: branch.branchName, code: branch.branchCode },
    },
  });
});

// POST /api/students/login  (public)
// FIX: fetch with password first for comparePassword, then re-fetch without for response
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const studentWithPassword = await Student.findOne({ email }).populate("college", "isActive");
  if (!studentWithPassword || !(await studentWithPassword.comparePassword(password)))
    return res.status(401).json({ message: "Invalid email or password" });

  if (!studentWithPassword.college?.isActive) return res.status(403).json({ message: "College is deactivated" });
  if (!studentWithPassword.isActive) return res.status(403).json({ message: "Account is deactivated" });

  if (studentWithPassword.status === "pending")
    return res.status(403).json({ message: "Registration pending approval" });

  if (studentWithPassword.status === "disapproved")
    return res.status(403).json({
      message: "Registration disapproved",
      reason: studentWithPassword.disapproveReason,
      canResubmit: true,
      token: generateToken(studentWithPassword._id),
    });

  const student = await Student.findById(studentWithPassword._id)
    .select("-password")
    .populate("college", "collegeName collegeCode isActive appName logo themeColorPrimary themeColorSecondary")
    .populate("branch", "branchName branchCode");

  res.json({ message: "Login successful", token: generateToken(student._id), role: "student", student });
});

// GET /api/students/profile  (student)
const getProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user._id)
    .select("-password")
    .populate("college", "collegeName collegeCode appName logo themeColorPrimary themeColorSecondary")
    .populate("branch", "branchName branchCode");
  res.json({ student });
});

// PUT /api/students/profile  (student updates own details)
const updateProfile = asyncHandler(async (req, res) => {
  const { name, mobile, personalDetails, academicDetails } = req.body;
  const updateData = {};

  if (name) updateData.name = name;
  if (mobile) updateData.mobile = mobile;
  if (req.file) updateData.profilePic = `/uploads/${req.file.filename}`;
  if (personalDetails) {
    updateData.personalDetails = typeof personalDetails === "string"
      ? JSON.parse(personalDetails)
      : personalDetails;
  }
  if (academicDetails) {
    updateData.academicDetails = typeof academicDetails === "string"
      ? JSON.parse(academicDetails)
      : academicDetails;
  }

  const student = await Student.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true })
    .select("-password")
    .populate("college", "collegeName collegeCode")
    .populate("branch", "branchName branchCode");

  res.json({ message: "Profile updated successfully", student });
});

// PUT /api/students/change-password  (student)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const student = await Student.findById(req.user._id);

  if (!(await student.comparePassword(currentPassword)))
    return res.status(400).json({ message: "Current password is incorrect" });

  student.password = newPassword;
  await student.save();
  res.json({ message: "Password changed successfully" });
});

// PUT /api/students/resubmit  (student - after disapproval)
const resubmit = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.user._id);
  if (student.status !== "disapproved")
    return res.status(400).json({ message: "Only disapproved registrations can be resubmitted" });

  const { name, mobile, branchId } = req.body;
  if (name) student.name = name;
  if (mobile) student.mobile = mobile;
  if (branchId) {
    const branch = await Branch.findOne({
      _id: branchId,
      $or: [{ createdBy: student.college }, { createdByRole: "SuperAdmin" }]
    });
    if (!branch) return res.status(400).json({ message: "Invalid branch" });
    student.branch = branch._id;
  }

  student.status = "pending";
  student.disapproveReason = null;
  await student.save();
  res.json({ message: "Resubmitted successfully, pending approval", status: student.status });
});

// GET /api/students/branch  (staff - HOD sees only own branch students)
const getBranchStudents = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const { status } = req.query;
  const filter = { college: req.user.college, branch: req.user.branch };
  if (status) filter.status = status;

  const students = await Student.find(filter)
    .select("-password")
    .populate("branch", "branchName branchCode")
    .sort({ createdAt: -1 });
  res.json({ students });
});

// GET /api/students  (college - all students) — with pagination
const getAllStudents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { college: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.branchId) filter.branch = req.query.branchId;

  const [students, total] = await Promise.all([
    Student.find(filter)
      .select("-password")
      .populate("branch", "branchName branchCode")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);
  res.json({ students, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/students/:id  (college)
const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, college: req.user._id })
    .select("-password")
    .populate("branch", "branchName branchCode");
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json({ student });
});

// PATCH /api/students/:id/approve  (staff - HOD, same branch only)
const approve = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const student = await Student.findOne({
    _id: req.params.id,
    college: req.user.college,
    branch: req.user.branch,
  });
  if (!student) return res.status(404).json({ message: "Student not found or not in your branch" });
  if (student.status === "approved") return res.status(400).json({ message: "Already approved" });

  student.status = "approved";
  student.disapproveReason = null;
  await student.save();

  // Push notification to student
  notify({
    recipients: [{ _id: student._id, fcmToken: student.fcmToken, role: "Student" }],
    title: "✅ Registration Approved",
    body: "Your registration has been approved. You can now login.",
    data: { type: "approval", status: "approved" },
    college: student.college,
  }).catch(() => { });

  res.json({ message: "Student approved successfully", status: student.status });
});

// PATCH /api/students/:id/disapprove  (staff - HOD, same branch only)
const disapprove = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const { reason } = req.body;
  const student = await Student.findOne({
    _id: req.params.id,
    college: req.user.college,
    branch: req.user.branch,
  });
  if (!student) return res.status(404).json({ message: "Student not found or not in your branch" });

  student.status = "disapproved";
  student.disapproveReason = reason || null;
  await student.save();

  // Push notification to student
  notify({
    recipients: [{ _id: student._id, fcmToken: student.fcmToken, role: "Student" }],
    title: "❌ Registration Disapproved",
    body: reason || "Your registration has been disapproved. Please resubmit.",
    data: { type: "approval", status: "disapproved" },
    college: student.college,
  }).catch(() => { });

  res.json({ message: "Student disapproved", status: student.status, reason: student.disapproveReason });
});

// DELETE /api/students/:id  (college or staff)
const deleteStudent = asyncHandler(async (req, res) => {
  const collegeId = req.role === "college" ? req.user._id : req.user.college;
  const student = await Student.findOneAndDelete({ _id: req.params.id, college: collegeId });
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json({ message: "Student deleted successfully" });
});

module.exports = {
  verifyCollege, getBranchesByCollegeCode, register, login,
  getProfile, updateProfile, changePassword, resubmit,
  getBranchStudents, getAllStudents, getStudent, approve, disapprove, deleteStudent,
};
