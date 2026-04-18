const Notification = require("../models/notification.model");
const { sendPushNotification } = require("../config/firebase");

/**
 * notify({ recipients, title, body, data, college })
 * recipients: [{ _id, fcmToken, role }]  role = "Staff" | "Student" | "College"
 */
const notify = async ({ recipients, title, body, data = {}, college }) => {
  if (!recipients?.length) return;

  // 1. Save to DB (notification history)
  const docs = recipients.map((r) => ({
    title,
    body,
    data,
    recipient: r._id,
    recipientRole: r.role,
    college,
    isRead: false,
  }));
  await Notification.insertMany(docs, { ordered: false }).catch(() => {});

  // 2. Send FCM push
  const tokens = recipients.map((r) => r.fcmToken).filter(Boolean);
  if (tokens.length) await sendPushNotification({ tokens, title, body, data });
};

/**
 * notifyBranch - notify all staff + students of a branch
 */
const notifyBranch = async ({ Staff, Student, branchId, collegeId, title, body, data }) => {
  const [staffList, studentList] = await Promise.all([
    Staff.find({ branch: branchId, college: collegeId, isActive: true }).select("_id fcmToken"),
    Student.find({ branch: branchId, college: collegeId, isActive: true, status: "approved" }).select("_id fcmToken"),
  ]);

  const recipients = [
    ...staffList.map((s) => ({ _id: s._id, fcmToken: s.fcmToken, role: "Staff" })),
    ...studentList.map((s) => ({ _id: s._id, fcmToken: s.fcmToken, role: "Student" })),
  ];

  await notify({ recipients, title, body, data, college: collegeId });
};

/**
 * notifyCollege - notify all staff + students + college admin of entire college
 */
const notifyCollege = async ({ Staff, Student, College, collegeId, title, body, data }) => {
  const [staffList, studentList, collegeAdmin] = await Promise.all([
    Staff.find({ college: collegeId, isActive: true }).select("_id fcmToken"),
    Student.find({ college: collegeId, isActive: true, status: "approved" }).select("_id fcmToken"),
    College ? College.findById(collegeId).select("_id fcmToken") : Promise.resolve(null),
  ]);

  const recipients = [
    ...staffList.map((s) => ({ _id: s._id, fcmToken: s.fcmToken, role: "Staff" })),
    ...studentList.map((s) => ({ _id: s._id, fcmToken: s.fcmToken, role: "Student" })),
  ];

  // college admin ko bhi notify karo
  if (collegeAdmin) {
    recipients.push({ _id: collegeAdmin._id, fcmToken: collegeAdmin.fcmToken, role: "College" });
  }

  await notify({ recipients, title, body, data, college: collegeId });
};

module.exports = { notify, notifyBranch, notifyCollege };
