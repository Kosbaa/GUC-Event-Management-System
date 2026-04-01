import mongoose from "mongoose";

const PointsSettingSchema = new mongoose.Schema(
  {
    pointsPerAmount: {
      type: Number,
      default: 10, // points awarded per amountUnit
    },
    amountUnit: {
      type: Number,
      default: 1000, // amount in EGP that unlocks pointsPerAmount
    },
    currency: {
      type: String,
      default: "egp",
    },
  },
  { timestamps: true }
);

export default mongoose.model("PointsSetting", PointsSettingSchema);
