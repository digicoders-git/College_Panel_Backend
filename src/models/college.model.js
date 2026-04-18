const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const collegeSchema = new mongoose.Schema(
  {
    // Basic Info
    collegeName: { type: String, required: true, trim: true },
    collegeShortName: { type: String, trim: true, default: null },
    collegeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["Polytechnic", "Degree", "School"], required: true },
    affiliation: { type: String, trim: true, default: null },
    establishmentYear: { type: Number, default: null },

    // Location Info
    address: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    pincode: { type: String, trim: true, default: null },
    googleMapLink: { type: String, default: null },

    // Contact Info
    phone: { type: String, default: null },
    email: { type: String, lowercase: true, trim: true, default: null },
    website: { type: String, default: null },

    // Branding
    logo: { type: String, default: null },
    coverImage: { type: String, default: null },
    themeColorPrimary: { type: String, default: "#1976d2" },
    themeColorSecondary: { type: String, default: "#ffffff" },
    appName: { type: String, trim: true, default: null },

    // Login Credentials (set by superadmin)
    loginEmail: { type: String, required: true, unique: true, lowercase: true, trim: true },
    loginPassword: { type: String, required: true, minlength: 6 },

    fcmToken: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

collegeSchema.pre("save", async function (next) {
  if (!this.isModified("loginPassword")) return next();
  this.loginPassword = await bcrypt.hash(this.loginPassword, 10);
  next();
});

collegeSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.loginPassword);
};

module.exports = mongoose.model("College", collegeSchema);
