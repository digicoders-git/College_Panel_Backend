const router = require("express").Router();
const { addEvent, getAll, updateEvent, deleteEvent } = require("../controllers/calendar.controller");
const { protect, staffOnly, hasPermission } = require("../middlewares/auth");
const { validateEvent } = require("../middlewares/validators");

router.post("/", protect, staffOnly, hasPermission("manage_calendar"), validateEvent, addEvent);
router.put("/:id", protect, staffOnly, hasPermission("manage_calendar"), validateEvent, updateEvent);
router.delete("/:id", protect, staffOnly, hasPermission("manage_calendar"), deleteEvent);

router.get("/", protect, (req, res, next) => {
  if (req.role === "student" || req.role === "college") return next();
  if (req.role === "staff") return hasPermission("view_calendar")(req, res, next);
  return res.status(403).json({ message: "Access denied" });
}, getAll);

module.exports = router;
