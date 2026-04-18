const multer = require("multer");
const path = require("path");
const fs = require("fs");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, fieldSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase().replace(".", ""));
    ext ? cb(null, true) : cb(new Error("File type not allowed"));
  },
});

module.exports = upload;
