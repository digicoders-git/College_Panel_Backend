const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const superAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    profileImage: { type: String, default: null },
    phone: { type: String, default: null },
  },
  { timestamps: true }
);

superAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

superAdminSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
