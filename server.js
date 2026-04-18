require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./src/config/db");
const { initFirebase } = require("./src/config/firebase");
const { errorHandler } = require("./src/middlewares/errorHandler");
const superAdminRoutes = require("./src/routes/superAdmin.routes");
const branchRoutes = require("./src/routes/branch.routes");
const collegeRoutes = require("./src/routes/college.routes");
const roleRoutes = require("./src/routes/role.routes");
const staffRoutes = require("./src/routes/staff.routes");
const studentRoutes = require("./src/routes/student.routes");
const timetableRoutes = require("./src/routes/timetable.routes");
const calendarRoutes = require("./src/routes/calendar.routes");
const noticeRoutes = require("./src/routes/notice.routes");
const notificationRoutes = require("./src/routes/notification.routes");

const app = express();

// Connect DB
connectDB();

// Init Firebase
initFirebase();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static folder for uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/notifications", notificationRoutes);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
