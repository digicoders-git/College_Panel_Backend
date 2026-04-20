const ResourceCategory = require("../models/resourceCategory.model");
const Resource = require("../models/resource.model");
const { asyncHandler } = require("../middlewares/errorHandler");
const path = require("path");
const fs = require("fs");

// ─── CATEGORIES ────────────────────────────────────────────────────────────────

// POST /api/resources/categories  (college | staff with manage_resources)
const addCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required" });

  const collegeId = req.role === "college" ? req.user._id : req.user.college;

  if (await ResourceCategory.findOne({ name: name.trim(), college: collegeId }))
    return res.status(400).json({ message: "Category already exists" });

  const category = await ResourceCategory.create({
    name: name.trim(),
    college: collegeId,
    createdBy: req.user._id,
    createdByRole: req.role === "college" ? "College" : "Staff",
  });

  res.status(201).json({ message: "Category added", category });
});

// GET /api/resources/categories  (college | staff | student)
const getCategories = asyncHandler(async (req, res) => {
  const collegeId = req.role === "college" ? req.user._id : req.user.college;
  const categories = await ResourceCategory.find({ college: collegeId }).sort({ name: 1 });
  res.json({ categories });
});

// DELETE /api/resources/categories/:id  (college only)
const deleteCategory = asyncHandler(async (req, res) => {
  const collegeId = req.role === "college" ? req.user._id : req.user.college;
  const cat = await ResourceCategory.findOneAndDelete({ _id: req.params.id, college: collegeId });
  if (!cat) return res.status(404).json({ message: "Category not found" });
  // delete all resources under this category
  const resources = await Resource.find({ category: req.params.id });
  for (const r of resources) {
    if (r.fileUrl) {
      fs.unlink(path.join(__dirname, "../../", r.fileUrl), () => {});
    }
  }
  await Resource.deleteMany({ category: req.params.id });
  res.json({ message: "Category deleted" });
});

// ─── RESOURCES ─────────────────────────────────────────────────────────────────

// POST /api/resources  (college | staff with manage_resources)
const addResource = asyncHandler(async (req, res) => {
  const { title, description, categoryId, year, semester, externalLink } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
  if (!categoryId) return res.status(400).json({ message: "Category is required" });

  const collegeId = req.role === "college" ? req.user._id : req.user.college;
  const branchId = req.role === "staff" ? req.user.branch : req.body.branchId;

  if (!branchId) return res.status(400).json({ message: "Branch is required" });

  const category = await ResourceCategory.findOne({ _id: categoryId, college: collegeId });
  if (!category) return res.status(404).json({ message: "Category not found" });

  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const resource = await Resource.create({
    title: title.trim(),
    description: description || null,
    category: categoryId,
    branch: branchId,
    college: collegeId,
    year: year || null,
    semester: semester || null,
    fileUrl,
    externalLink: externalLink || null,
    uploadedBy: req.user._id,
    uploadedByRole: req.role === "college" ? "College" : "Staff",
  });

  await resource.populate([
    { path: "category", select: "name" },
    { path: "branch", select: "branchName branchCode" },
  ]);

  res.status(201).json({ message: "Resource added", resource });
});

// GET /api/resources  (college | staff | student)
const getResources = asyncHandler(async (req, res) => {
  const { categoryId, branchId, year, semester } = req.query;

  const collegeId = req.role === "college" ? req.user._id : req.user.college;

  const filter = { college: collegeId };

  // student/staff sirf apni branch ke resources dekh sakte hain
  if (req.role === "student" || req.role === "staff") {
    filter.branch = req.user.branch;
  } else if (branchId) {
    filter.branch = branchId;
  }

  if (categoryId) filter.category = categoryId;
  if (year) filter.year = year;
  if (semester) filter.semester = semester;

  const resources = await Resource.find(filter)
    .populate("category", "name")
    .populate("branch", "branchName branchCode")
    .populate("uploadedBy", "name collegeName")
    .sort({ createdAt: -1 });

  res.json({ resources });
});

// DELETE /api/resources/:id  (college | staff - own upload)
const deleteResource = asyncHandler(async (req, res) => {
  const collegeId = req.role === "college" ? req.user._id : req.user.college;

  const filter = { _id: req.params.id, college: collegeId };
  // staff sirf apna upload delete kar sakta hai
  if (req.role === "staff") filter.uploadedBy = req.user._id;

  const resource = await Resource.findOneAndDelete(filter);
  if (!resource) return res.status(404).json({ message: "Resource not found" });

  if (resource.fileUrl) {
    fs.unlink(path.join(__dirname, "../../", resource.fileUrl), () => {});
  }

  res.json({ message: "Resource deleted" });
});

module.exports = { addCategory, getCategories, deleteCategory, addResource, getResources, deleteResource };
