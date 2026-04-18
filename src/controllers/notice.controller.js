const path = require("path");
const fs = require("fs");
const Notice = require("../models/notice.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const { asyncHandler } = require("../middlewares/errorHandler");
const { notify, notifyBranch, notifyCollege } = require("../utils/notify");

// POST /api/notices  (college - scope:college | staff - scope:branch)
const addNotice = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

  let scope, college, branch, postedBy, postedByRole;

  if (req.role === "college") {
    scope = "college";
    college = req.user._id;
    branch = null;
    postedBy = req.user._id;
    postedByRole = "College";
  } else {
    if (!req.user.branch)
      return res.status(400).json({ message: "No branch assigned to your account" });
    scope = "branch";
    college = req.user.college;
    branch = req.user.branch;
    postedBy = req.user._id;
    postedByRole = "Staff";
  }

  const notice = await Notice.create({ title, content, images, scope, college, branch, postedBy, postedByRole });
  await notice.populate("branch", "branchName branchCode");

  // Send push notification async (don't await - don't block response)
  const notifData = { type: "notice", noticeId: notice._id.toString() };
  if (scope === "branch") {
    // branch staff + students ko notify karo
    notifyBranch({ Staff, Student, branchId: branch, collegeId: college, title: `📢 ${title}`, body: content || "New notice posted", data: notifData }).catch(() => {});
    // college admin ko bhi branch notice ki info do
    College.findById(college).select("_id fcmToken").then((col) => {
      if (col) notify({ recipients: [{ _id: col._id, fcmToken: col.fcmToken, role: "College" }], title: `📢 Branch Notice: ${title}`, body: content || "New branch notice posted", data: notifData, college });
    }).catch(() => {});
  } else {
    notifyCollege({ Staff, Student, College, collegeId: college, title: `📢 ${title}`, body: content || "New notice posted", data: notifData }).catch(() => {});
  }

  res.status(201).json({ message: "Notice posted successfully", notice });
});

// GET /api/notices
const getNotices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let filter;
  if (req.role === "college") {
    filter = { college: req.user._id };
  } else {
    const collegeId = req.user.college;
    const branchId = req.user.branch;
    if (!branchId) return res.status(400).json({ message: "No branch assigned to your account" });
    filter = { college: collegeId, $or: [{ scope: "college" }, { scope: "branch", branch: branchId }] };
  }

  const [notices, total] = await Promise.all([
    Notice.find(filter)
      .populate("branch", "branchName branchCode")
      .populate("postedBy", "name collegeName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notice.countDocuments(filter),
  ]);

  res.json({ notices, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/notices/:id
const getNotice = asyncHandler(async (req, res) => {
  let filter = { _id: req.params.id };
  if (req.role === "college") {
    filter.college = req.user._id;
  } else {
    filter.college = req.user.college;
    filter.$or = [{ scope: "college" }, { scope: "branch", branch: req.user.branch }];
  }

  const notice = await Notice.findOne(filter)
    .populate("branch", "branchName branchCode")
    .populate("postedBy", "name collegeName");

  if (!notice) return res.status(404).json({ message: "Notice not found" });
  res.json({ notice });
});

// PUT /api/notices/:id
const updateNotice = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const notice = await Notice.findOne({ _id: req.params.id, postedBy: req.user._id });
  if (!notice) return res.status(404).json({ message: "Notice not found" });

  if (title) notice.title = title;
  if (content !== undefined) notice.content = content;
  if (req.files?.length) {
    notice.images = [...notice.images, ...req.files.map((f) => `/uploads/${f.filename}`)];
  }

  await notice.save();
  await notice.populate("branch", "branchName branchCode");
  res.json({ message: "Notice updated successfully", notice });
});

// DELETE /api/notices/:id
const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findOneAndDelete({ _id: req.params.id, postedBy: req.user._id });
  if (!notice) return res.status(404).json({ message: "Notice not found" });

  notice.images.forEach((imgUrl) => {
    fs.unlink(path.join(__dirname, "../../", imgUrl), (err) => {
      if (err) console.error("File delete error:", err.message);
    });
  });

  res.json({ message: "Notice deleted successfully" });
});

// DELETE /api/notices/:id/image
const removeImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  const notice = await Notice.findOne({ _id: req.params.id, postedBy: req.user._id });
  if (!notice) return res.status(404).json({ message: "Notice not found" });

  notice.images = notice.images.filter((img) => img !== imageUrl);
  await notice.save();

  fs.unlink(path.join(__dirname, "../../", imageUrl), (err) => {
    if (err) console.error("File delete error:", err.message);
  });

  res.json({ message: "Image removed", notice });
});

module.exports = { addNotice, getNotices, getNotice, updateNotice, deleteNotice, removeImage };
