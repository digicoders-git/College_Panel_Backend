const router = require("express").Router();
const { register, login, getProfile, updateProfile, changePassword, getDashboard, getCollegeStats } = require("../controllers/superAdmin.controller");
const { protect } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const { validateSuperAdminRegister, validateLogin, validateChangePassword } = require("../middlewares/validators");

router.post("/register", validateSuperAdminRegister, register);
router.post("/login", validateLogin, login);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
router.put("/change-password", protect, validateChangePassword, changePassword);

router.get("/dashboard", protect, getDashboard);
router.get("/colleges/:id/stats", protect, getCollegeStats);

module.exports = router;
