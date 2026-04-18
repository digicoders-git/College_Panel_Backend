const router = require("express").Router();
const {
  saveFcmToken, testPushNotification, getNotifications, markRead, markAllRead, deleteNotification, clearAll,
} = require("../controllers/notification.controller");
const { protect } = require("../middlewares/auth");

router.use(protect);

router.patch("/fcm-token", saveFcmToken);
router.post("/test", testPushNotification);
router.get("/", getNotifications);
router.patch("/read-all", markAllRead);
router.delete("/clear-all", clearAll);
router.patch("/:id/read", markRead);
router.delete("/:id", deleteNotification);

module.exports = router;
