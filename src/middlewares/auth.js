const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/superAdmin.model");
const College = require("../models/college.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const Role = require("../models/role.model");

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) return res.status(401).json({ message: "Unauthorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await SuperAdmin.findById(decoded.id).select("-password");
    if (user) {
      req.user = user;
      req.role = "superadmin";
      return next();
    }

    user = await College.findById(decoded.id).select("-loginPassword");
    if (user) {
      if (!user.isActive) return res.status(403).json({ message: "College is deactivated" });
      req.user = user;
      req.role = "college";
      return next();
    }

    user = await Staff.findById(decoded.id).select("-password");
    if (user) {
      if (!user.isActive) return res.status(403).json({ message: "Account is deactivated" });
      req.user = user;
      req.role = "staff";
      return next();
    }

    user = await Student.findById(decoded.id).select("-password");
    if (user) {
      if (!user.isActive) return res.status(403).json({ message: "Account is deactivated" });
      req.user = user;
      req.role = "student";
      return next();
    }

    return res.status(401).json({ message: "User not found" });
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.role !== "superadmin")
    return res.status(403).json({ message: "Access denied, superadmin only" });
  next();
};

const collegeOnly = (req, res, next) => {
  if (req.role !== "college")
    return res.status(403).json({ message: "Access denied, college only" });
  next();
};

const staffOnly = (req, res, next) => {
  if (req.role !== "staff")
    return res.status(403).json({ message: "Access denied, staff only" });
  next();
};

const studentOnly = (req, res, next) => {
  if (req.role !== "student")
    return res.status(403).json({ message: "Access denied, student only" });
  next();
};

// staff ke role ki permissions check karta hai
const hasPermission = (permission) => async (req, res, next) => {
  if (req.role !== "staff")
    return res.status(403).json({ message: "Access denied" });

  const role = await Role.findById(req.user.role).lean();
  if (!role || !role.permissions.includes(permission))
    return res.status(403).json({ message: `Access denied, '${permission}' permission required` });

  next();
};

module.exports = { protect, superAdminOnly, collegeOnly, staffOnly, studentOnly, hasPermission };
