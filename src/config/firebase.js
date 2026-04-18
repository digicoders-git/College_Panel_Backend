const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) return;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath || !fs.existsSync(path.resolve(serviceAccountPath))) {
    console.warn("Firebase: service account file not found, push notifications disabled");
    return;
  }

  const serviceAccount = require(path.resolve(serviceAccountPath));
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    messagingSenderId,
  });

  firebaseInitialized = true;
  console.log("Firebase initialized with web push support");
};

const sendPushNotification = async ({ tokens, title, body, data = {} }) => {
  if (!firebaseInitialized || !tokens?.length) {
    console.log("FCM: Not initialized or no tokens", { firebaseInitialized, tokenCount: tokens?.length });
    return;
  }

  const validTokens = tokens.filter(Boolean);
  if (!validTokens.length) {
    console.log("FCM: No valid tokens after filter");
    return;
  }

  console.log("FCM: Sending to tokens:", validTokens.length, validTokens[0]?.substring(0, 50) + "...");
  
  try {
    const payload = {
      // notification object nahi bhejte — sirf data bhejte hain
      // isse foreground + background dono mein SW handle karta hai reliably
      data: {
        title,
        body,
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", contentAvailable: true } } },
      webpush: {
        headers: { Urgency: "high" },
        data: {
          title,
          body,
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        },
        fcmOptions: { link: "/" },
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      ...payload,
    });

    console.log("FCM Response:", {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.log("FCM Error for token", i, ":", r.error?.message);
      }
    });

    const failed = response.responses
      .map((r, i) => (!r.success ? validTokens[i] : null))
      .filter(Boolean);

    if (failed.length) {
      // Silently remove invalid/expired tokens from DB
      const Staff = require("../models/staff.model");
      const Student = require("../models/student.model");
      const College = require("../models/college.model");
      await Promise.all([
        Staff.updateMany({ fcmToken: { $in: failed } }, { $set: { fcmToken: null } }),
        Student.updateMany({ fcmToken: { $in: failed } }, { $set: { fcmToken: null } }),
        College.updateMany({ fcmToken: { $in: failed } }, { $set: { fcmToken: null } }),
      ]).catch(() => {});
    }
    return response;
  } catch (err) {
    console.error("FCM send error:", err.message);
    console.error("FCM full error:", err);
  }
};

module.exports = { initFirebase, sendPushNotification };
