const Notification = require("../models/notification.model");
const Staff = require("../models/staff.model");
const Student = require("../models/student.model");
const College = require("../models/college.model");
const { asyncHandler } = require("../middlewares/errorHandler");
const { sendPushNotification } = require("../config/firebase");

// PATCH /api/notifications/fcm-token  (all roles - save FCM token after app login)
const saveFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ message: "fcmToken is required" });

  let Model;
  if (req.role === "staff") Model = Staff;
  else if (req.role === "student") Model = Student;
  else if (req.role === "college") Model = College;
  else return res.status(403).json({ message: "Not allowed" });

  await Model.findByIdAndUpdate(req.user._id, { fcmToken });
  res.json({ message: "FCM token saved" });
});

// POST /api/notifications/test - Test push notification to yourself
const testPushNotification = asyncHandler(async (req, res) => {
  let Model, role;
  if (req.role === "staff") { Model = Staff; role = "Staff"; }
  else if (req.role === "student") { Model = Student; role = "Student"; }
  else if (req.role === "college") { Model = College; role = "College"; }
  else return res.status(403).json({ message: "Not allowed" });

  const user = await Model.findById(req.user._id).select("fcmToken college");
  
  if (!user.fcmToken) {
    return res.status(400).json({ message: "No FCM token found. Send your FCM token first via /fcm-token endpoint" });
  }

  const result = await sendPushNotification({
    tokens: [user.fcmToken],
    title: "Test Notification ✅",
    body: "Push notification working!",
    data: { type: "test" },
  });

  if (result) {
    res.json({ 
      message: "Test notification sent! Check your browser/app",
      successCount: result.successCount,
      failureCount: result.failureCount
    });
  } else {
    res.status(500).json({ message: "Failed to send notification" });
  }
});

// GET /api/notifications  (all roles)
const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { recipient: req.user._id };
  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.json({ notifications, total, unreadCount, page, pages: Math.ceil(total / limit) });
});

// PATCH /api/notifications/:id/read  (mark single as read)
const markRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true }
  );
  res.json({ message: "Marked as read" });
});

// PATCH /api/notifications/read-all  (mark all as read)
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: "All notifications marked as read" });
});

// DELETE /api/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  res.json({ message: "Notification deleted" });
});

// DELETE /api/notifications/clear-all
const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  res.json({ message: "All notifications cleared" });
});

module.exports = { saveFcmToken, testPushNotification, getNotifications, markRead, markAllRead, deleteNotification, clearAll };
