const Role = require("../models/role.model");
const { PERMISSIONS } = require("../models/role.model");
const { asyncHandler } = require("../middlewares/errorHandler");

// POST /api/roles
const addRole = asyncHandler(async (req, res) => {
  const { roleName, permissions = [] } = req.body;
  const college = req.user._id;

  if (await Role.findOne({ roleName: roleName?.trim(), college }))
    return res.status(400).json({ message: "Role already exists" });

  const role = await Role.create({ roleName, college, permissions });
  res.status(201).json({ message: "Role added successfully", role });
});

// GET /api/roles
const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find({ college: req.user._id }).sort({ createdAt: -1 });
  res.json({ roles });
});

// GET /api/roles/permissions  — available permissions list
const getPermissions = asyncHandler(async (req, res) => {
  res.json({ permissions: PERMISSIONS });
});

// PUT /api/roles/:id
const updateRole = asyncHandler(async (req, res) => {
  const { roleName, permissions } = req.body;

  if (roleName) {
    const ex = await Role.findOne({ roleName: roleName.trim(), college: req.user._id, _id: { $ne: req.params.id } });
    if (ex) return res.status(400).json({ message: "Role already exists" });
  }

  const role = await Role.findOneAndUpdate(
    { _id: req.params.id, college: req.user._id },
    { ...(roleName && { roleName }), ...(permissions && { permissions }) },
    { new: true, runValidators: true }
  );
  if (!role) return res.status(404).json({ message: "Role not found" });
  res.json({ message: "Role updated successfully", role });
});

// DELETE /api/roles/:id
const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findOneAndDelete({ _id: req.params.id, college: req.user._id });
  if (!role) return res.status(404).json({ message: "Role not found" });
  res.json({ message: "Role deleted successfully" });
});

module.exports = { addRole, getRoles, getPermissions, updateRole, deleteRole };
