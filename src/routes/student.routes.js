const router = require("express").Router();
const {
  verifyCollege, getBranchesByCollegeCode, register, login,
  getProfile, updateProfile, changePassword, resubmit,
  getBranchStudents, getAllStudents, getStudent, approve, disapprove, deleteStudent,
} = require("../controllers/student.controller");
const { protect, collegeOnly, staffOnly, studentOnly, hasPermission } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { validateStudentRegister, validateLogin, validateChangePassword } = require("../middlewares/validators");

// Public
router.get("/verify-college", verifyCollege);
router.get("/branches", getBranchesByCollegeCode);
router.post("/register", validateStudentRegister, register);
router.post("/login", validateLogin, login);

// Student own routes
router.get("/profile", protect, studentOnly, getProfile);
router.put("/profile", protect, studentOnly, updateProfile);
router.put("/profile/upload-pic", protect, studentOnly, upload.single("profilePic"), updateProfile);
router.put("/change-password", protect, studentOnly, validateChangePassword, changePassword);
router.put("/resubmit", protect, studentOnly, resubmit);

// Staff - view_students permission for listing, manage_students for actions
router.get("/branch", protect, staffOnly, hasPermission("view_students"), getBranchStudents);
router.patch("/:id/approve", protect, staffOnly, hasPermission("manage_students"), approve);
router.patch("/:id/disapprove", protect, staffOnly, hasPermission("manage_students"), disapprove);
router.delete("/:id/delete", protect, staffOnly, hasPermission("manage_students"), deleteStudent);

// College - manage all students
router.get("/", protect, collegeOnly, getAllStudents);
router.get("/:id", protect, collegeOnly, getStudent);
router.delete("/:id", protect, collegeOnly, deleteStudent);

module.exports = router;
