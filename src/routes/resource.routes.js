const router = require("express").Router();
const { addCategory, getCategories, deleteCategory, addResource, getResources, deleteResource } = require("../controllers/resource.controller");
const { protect, collegeOnly, hasPermission } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

// college or staff with manage_resources
const collegeOrManage = (req, res, next) => {
  if (req.role === "college") return next();
  return hasPermission("manage_resources")(req, res, next);
};

// college or staff with view_resources or student
const canView = (req, res, next) => {
  if (req.role === "college" || req.role === "student") return next();
  if (req.role === "staff") return hasPermission("view_resources")(req, res, next);
  return res.status(403).json({ message: "Access denied" });
};

// ── Categories ──
router.post("/categories", protect, collegeOrManage, addCategory);
router.get("/categories", protect, canView, getCategories);
router.delete("/categories/:id", protect, collegeOrManage, deleteCategory);

// ── Resources ──
router.post("/", protect, collegeOrManage, upload.single("file"), addResource);
router.get("/", protect, canView, getResources);
router.delete("/:id", protect, collegeOrManage, deleteResource);

module.exports = router;
