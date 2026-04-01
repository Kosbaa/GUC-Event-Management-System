import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed",
    },
    value: { type: Number, required: true },
    applicableEventType: { type: String, enum: ["workshop", "trip"] },
    priceInPoints: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventOffice",
    },
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1 }, { unique: true });

export default mongoose.model("Coupon", CouponSchema);
