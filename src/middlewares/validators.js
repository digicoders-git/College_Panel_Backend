const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array().map((e) => ({ field: e.path, message: e.msg })) });
  next();
};

// SuperAdmin
const validateSuperAdminRegister = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  validate,
];

const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

const validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  validate,
];

// College
const validateAddCollege = [
  body("collegeName").trim().notEmpty().withMessage("College name is required"),
  body("collegeCode").trim().notEmpty().withMessage("College code is required"),
  body("type").isIn(["Polytechnic", "Degree", "School"]).withMessage("Invalid college type"),
  body("loginEmail").isEmail().withMessage("Valid login email is required"),
  body("loginPassword").isLength({ min: 6 }).withMessage("Login password must be at least 6 characters"),
  validate,
];

// Branch
const validateBranch = [
  body("branchName").trim().notEmpty().withMessage("Branch name is required"),
  body("branchCode").trim().notEmpty().withMessage("Branch code is required"),
  body("totalSeats").isInt({ min: 1 }).withMessage("Total seats must be a positive number"),
  validate,
];

// Role
const validateRole = [
  body("roleName").trim().notEmpty().withMessage("Role name is required"),
  validate,
];

// Staff
const validateAddStaff = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").notEmpty().withMessage("Role is required"),
  validate,
];

// Student
const validateStudentRegister = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("mobile").trim().notEmpty().withMessage("Mobile is required"),
  body("collegeCode").trim().notEmpty().withMessage("College code is required"),
  body("branchId").notEmpty().withMessage("Branch is required"),
  validate,
];

// Timetable
const validateTimetable = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  validate,
];

// Calendar
const validateEvent = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("eventDate").isISO8601().withMessage("Valid event date is required"),
  validate,
];

// Notice
const validateNotice = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  validate,
];

module.exports = {
  validateSuperAdminRegister, validateLogin, validateChangePassword,
  validateAddCollege, validateBranch, validateRole,
  validateAddStaff, validateStudentRegister, validateTimetable, validateEvent, validateNotice,
};
