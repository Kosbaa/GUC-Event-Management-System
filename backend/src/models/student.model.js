import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    UniId: { type: String, unique: true, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    points: { type: Number, default: 0 },
    myCoupons: [
      {
        couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
        used: { type: Boolean, default: false },
        obtainedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
