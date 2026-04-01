import mongoose from "mongoose";

const UserCouponSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    userRole: { type: String, required: true },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    status: { type: String, enum: ["owned", "used"], default: "owned" },
    purchasedAt: { type: Date, default: Date.now },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

UserCouponSchema.index({ user: 1, userRole: 1, coupon: 1, status: 1 });

export default mongoose.model("UserCoupon", UserCouponSchema);
