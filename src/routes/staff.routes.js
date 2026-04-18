const router = require("express").Router();
const {
  addStaff, login, getAllStaff, getStaff, getProfile,
  updateProfile, changePassword, updateStaff, deleteStaff, toggleStatus,
} = require("../controllers/staff.controller");
const { protect, collegeOnly, staffOnly } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { validateAddStaff, validateLogin, validateChangePassword } = require("../middlewares/validators");

// Public
router.post("/login", validateLogin, login);

// Staff own routes
router.get("/profile", protect, staffOnly, getProfile);
router.put("/profile", protect, staffOnly, upload.single("profilePic"), updateProfile);
router.put("/change-password", protect, staffOnly, validateChangePassword, changePassword);

// College manages staff
router.post("/", protect, collegeOnly, validateAddStaff, addStaff);
router.get("/", protect, collegeOnly, getAllStaff);
router.get("/:id", protect, collegeOnly, getStaff);
router.put("/:id", protect, collegeOnly, updateStaff);
router.delete("/:id", protect, collegeOnly, deleteStaff);
router.patch("/:id/toggle-status", protect, collegeOnly, toggleStatus);

module.exports = router;
