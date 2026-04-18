const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    // Login & Basic
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    mobile: { type: String, required: true },
    profilePic: { type: String, default: null },

    // College & Branch
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },

    // Registration Status
    status: {
      type: String,
      enum: ["pending", "approved", "disapproved"],
      default: "pending",
    },
    disapproveReason: { type: String, default: null },

    // Personal Details (updatable)
    personalDetails: {
      dob: { type: Date, default: null },
      gender: { type: String, enum: ["Male", "Female", "Other"], default: null },
      bloodGroup: { type: String, default: null },
      fatherName: { type: String, default: null },
      motherName: { type: String, default: null },
      address: { type: String, default: null },
      city: { type: String, default: null },
      state: { type: String, default: null },
      pincode: { type: String, default: null },
      aadharNumber: { type: String, default: null },
    },

    // Academic Details (updatable)
    academicDetails: {
      rollNumber: { type: String, default: null },
      enrollmentNumber: { type: String, default: null },
      admissionYear: { type: Number, default: null },
      currentSemester: { type: Number, default: null },
      previousSchool: { type: String, default: null },
      previousPercentage: { type: String, default: null },
    },

    fcmToken: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

studentSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Student", studentSchema);
