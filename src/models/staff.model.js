const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const staffSchema = new mongoose.Schema(
  {
    // Login & Basic
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    mobile: { type: String, default: null },
    profilePic: { type: String, default: null },

    // College, Role, Branch
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },

    // Personal Details (updatable by staff)
    personalDetails: {
      dob: { type: Date, default: null },
      gender: { type: String, enum: ["Male", "Female", "Other"], default: null },
      bloodGroup: { type: String, default: null },
      address: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      pincode: { type: String, default: null },
      aadharNumber: { type: String, default: null },
      panNumber: { type: String, default: null },
    },

    // Professional Details (updatable by staff)
    professionalDetails: {
      employeeId: { type: String, default: null },
      designation: { type: String, default: null },
      department: { type: String, default: null },
      joiningDate: { type: Date, default: null },
      experience: { type: String, default: null },
      qualification: { type: String, default: null },
      specialization: { type: String, default: null },
    },

    // Study/Academic Details (updatable by staff)
    studyDetails: {
      highestDegree: { type: String, default: null },
      university: { type: String, default: null },
      passingYear: { type: Number, default: null },
      percentage: { type: String, default: null },
      researchPapers: { type: String, default: null },
      certifications: { type: String, default: null },
    },

    fcmToken: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

staffSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Staff", staffSchema);
