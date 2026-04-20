const mongoose = require("mongoose");

const resourceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    college: { type: mongoose.Schema.Types.ObjectId, ref: "College", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: "createdByRole" },
    createdByRole: { type: String, enum: ["College", "Staff"] },
  },
  { timestamps: true }
);

resourceCategorySchema.index({ name: 1, college: 1 }, { unique: true });

module.exports = mongoose.model("ResourceCategory", resourceCategorySchema);
