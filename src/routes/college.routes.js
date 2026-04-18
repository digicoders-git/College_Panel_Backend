const router = require("express").Router();
const {
  addCollege, login, getAllColleges, getProfile, getCollege,
  updateProfile, updateCollege, changePassword, deleteCollege, toggleStatus, getDashboard,
} = require("../controllers/college.controller");
const { protect, superAdminOnly, collegeOnly } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { validateAddCollege, validateLogin, validateChangePassword } = require("../middlewares/validators");

const uploadFields = upload.fields([{ name: "logo", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]);

// Public
router.post("/login", validateLogin, login);

// College own routes
router.get("/profile", protect, collegeOnly, getProfile);
router.put("/profile", protect, collegeOnly, uploadFields, updateProfile);
router.put("/change-password", protect, collegeOnly, validateChangePassword, changePassword);

router.get("/dashboard", protect, collegeOnly, getDashboard);

// SuperAdmin only
router.post("/", protect, superAdminOnly, uploadFields, validateAddCollege, addCollege);
router.get("/", protect, superAdminOnly, getAllColleges);
router.get("/:id", protect, superAdminOnly, getCollege);
router.put("/:id", protect, superAdminOnly, uploadFields, updateCollege);
router.delete("/:id", protect, superAdminOnly, deleteCollege);
router.patch("/:id/toggle-status", protect, superAdminOnly, toggleStatus);

module.exports = router;
