const Branch = require("../models/branch.model");
const mongoose = require("mongoose");
const { asyncHandler } = require("../middlewares/errorHandler");

const getOwner = (req) => ({
  createdBy: req.user._id,
  createdByRole: req.role === "superadmin" ? "SuperAdmin" : "College",
});

// POST /api/branches
const addBranch = asyncHandler(async (req, res) => {
  const { branchName, branchCode, totalSeats } = req.body;
  const owner = getOwner(req);

  if (await Branch.findOne({ branchCode: branchCode?.toUpperCase(), createdBy: owner.createdBy }))
    return res.status(400).json({ message: "Branch code already exists" });

  const { college } = req.body;
  if (req.role === "superadmin" && !college)
    return res.status(400).json({ message: "college is required" });
  const collegeRef = req.role === "college" ? { college: req.user._id } : { college: new mongoose.Types.ObjectId(college) };
  const branch = await Branch.create({ branchName, branchCode, totalSeats, ...owner, ...collegeRef });
  res.status(201).json({ message: "Branch added successfully", branch });
});

// GET /api/branches
const getAllBranches = asyncHandler(async (req, res) => {
  const filter = { $or: [{ createdBy: req.user._id }] };
  if (req.role === "college") {
    filter.$or.push({ createdByRole: "SuperAdmin" });
  }

  const branches = await Branch.find(filter).sort({ createdAt: -1 });
  res.json({ branches });
});

// GET /api/branches/:id
const getBranch = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, $or: [{ createdBy: req.user._id }] };
  if (req.role === "college") {
    filter.$or.push({ createdByRole: "SuperAdmin" });
  }

  const branch = await Branch.findOne(filter);
  if (!branch) return res.status(404).json({ message: "Branch not found" });
  res.json({ branch });
});

// PUT /api/branches/:id
const updateBranch = asyncHandler(async (req, res) => {
  const { branchName, branchCode, totalSeats } = req.body;

  if (branchCode) {
    const existing = await Branch.findOne({
      branchCode: branchCode.toUpperCase(),
      createdBy: req.user._id,
      _id: { $ne: req.params.id },
    });
    if (existing) return res.status(400).json({ message: "Branch code already exists" });
  }

  const branch = await Branch.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { branchName, branchCode, totalSeats },
    { new: true, runValidators: true }
  );
  if (!branch) return res.status(404).json({ message: "Branch not found" });
  res.json({ message: "Branch updated successfully", branch });
});

// DELETE /api/branches/:id
const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!branch) return res.status(404).json({ message: "Branch not found" });
  res.json({ message: "Branch deleted successfully" });
});

module.exports = { addBranch, getAllBranches, getBranch, updateBranch, deleteBranch };
