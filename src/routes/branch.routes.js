const router = require("express").Router();
const { addBranch, getAllBranches, getBranch, updateBranch, deleteBranch } = require("../controllers/branch.controller");
const { protect, superAdminOnly, collegeOnly } = require("../middlewares/auth");
const { validateBranch } = require("../middlewares/validators");

// Only superadmin or college can access branches
const superAdminOrCollege = (req, res, next) => {
  if (req.role === "superadmin" || req.role === "college") return next();
  return res.status(403).json({ message: "Access denied" });
};

router.use(protect, superAdminOrCollege);

router.post("/", validateBranch, addBranch);
router.get("/", getAllBranches);
router.get("/:id", getBranch);
router.put("/:id", updateBranch);
router.delete("/:id", deleteBranch);

module.exports = router;
