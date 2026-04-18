const router = require("express").Router();
const { upload, getAll, remove } = require("../controllers/timetable.controller");
const { protect, staffOnly } = require("../middlewares/auth");
const { hasPermission } = require("../middlewares/auth");
const uploadMiddleware = require("../middlewares/upload");
const { validateTimetable } = require("../middlewares/validators");

router.post("/", protect, staffOnly, hasPermission("manage_timetable"), uploadMiddleware.single("file"), validateTimetable, upload);
router.delete("/:id", protect, staffOnly, hasPermission("manage_timetable"), remove);

router.get("/", protect, (req, res, next) => {
  if (req.role === "student") return next();
  if (req.role === "staff") return hasPermission("view_timetable")(req, res, next);
  return res.status(403).json({ message: "Access denied" });
}, getAll);

module.exports = router;
