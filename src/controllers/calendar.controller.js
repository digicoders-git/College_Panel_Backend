const Calendar = require("../models/calendar.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const { asyncHandler } = require("../middlewares/errorHandler");
const { notifyBranch } = require("../utils/notify");

// POST /api/calendar  (staff)
const addEvent = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const { title, description, eventDate, endDate, eventType } = req.body;

  const event = await Calendar.create({
    title, description, eventDate, endDate, eventType,
    college: req.user.college,
    branch: req.user.branch,
    createdBy: req.user._id,
  });

  await event.populate("branch", "branchName branchCode");

  // Notify all staff + students of this branch
  notifyBranch({
    Staff, Student,
    branchId: req.user.branch,
    collegeId: req.user.college,
    title: `📆 New Event: ${title}`,
    body: `${eventType || "Event"} scheduled on ${new Date(eventDate).toDateString()}`,
    data: { type: "calendar", eventId: event._id.toString() },
  }).catch(() => {});

  res.status(201).json({ message: "Event added successfully", event });
});

// GET /api/calendar  (staff | student - own branch)
const getAll = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const filter = { college: req.user.college || req.user._id };

  let dateFilter = {};
  if (month && year) {
    const m = parseInt(month);
    const y = parseInt(year);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    dateFilter = { eventDate: { $gte: start, $lte: end } };
  }

  if (req.role !== "college") {
    if (req.user.branch) {
      filter.$or = [
        { branch: req.user.branch, ...dateFilter },
        { branch: null, ...dateFilter },
      ];
    } else {
      filter.branch = null;
      Object.assign(filter, dateFilter);
    }
  } else {
    Object.assign(filter, dateFilter);
  }

  const events = await Calendar.find(filter)
    .populate("branch", "branchName branchCode")
    .populate("createdBy", "name")
    .sort({ eventDate: 1 });

  res.json({ events });
});

// PUT /api/calendar/:id  (staff - own event)
const updateEvent = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const { title, description, eventDate, endDate, eventType } = req.body;

  const event = await Calendar.findOneAndUpdate(
    { _id: req.params.id, college: req.user.college, branch: req.user.branch },
    { title, description, eventDate, endDate, eventType },
    { new: true, runValidators: true }
  ).populate("branch", "branchName branchCode");

  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ message: "Event updated successfully", event });
});

// DELETE /api/calendar/:id  (staff - own event)
const deleteEvent = asyncHandler(async (req, res) => {
  if (!req.user.branch)
    return res.status(400).json({ message: "No branch assigned to your account" });

  const event = await Calendar.findOneAndDelete({
    _id: req.params.id,
    college: req.user.college,
    branch: req.user.branch,
  });
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ message: "Event deleted successfully" });
});

module.exports = { addEvent, getAll, updateEvent, deleteEvent };
