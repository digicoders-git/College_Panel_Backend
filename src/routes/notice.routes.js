const router = require("express").Router();
const { addNotice, getNotices, getNotice, updateNotice, deleteNotice, removeImage } = require("../controllers/notice.controller");
const { protect, hasPermission } = require("../middlewares/auth");
const uploadMiddleware = require("../middlewares/upload");
const { validateNotice } = require("../middlewares/validators");

const uploadImages = uploadMiddleware.array("images", 5);

// college ke liye direct allow, staff ke liye permission check
const noticeWriteAccess = (req, res, next) => {
  if (req.role === "college") return next();
  if (req.role === "staff") return hasPermission("manage_notices")(req, res, next);
  return res.status(403).json({ message: "Access denied" });
};

const noticeReadAccess = (req, res, next) => {
  if (req.role === "college" || req.role === "student") return next();
  if (req.role === "staff") return hasPermission("view_notices")(req, res, next);
  return res.status(403).json({ message: "Access denied" });
};

router.post("/", protect, noticeWriteAccess, uploadImages, validateNotice, addNotice);
router.get("/", protect, noticeReadAccess, getNotices);
router.get("/:id", protect, noticeReadAccess, getNotice);
router.put("/:id", protect, noticeWriteAccess, uploadImages, updateNotice);
router.delete("/:id", protect, noticeWriteAccess, deleteNotice);
router.delete("/:id/image", protect, noticeWriteAccess, removeImage);

module.exports = router;
