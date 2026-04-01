import mongoose from "mongoose";

const PointsConfigSchema = new mongoose.Schema(
  {
    pointsPerAmount: { type: Number, default: 10 }, // points awarded per amountUnit
    amountUnit: { type: Number, default: 1000 }, // EGP
  },
  { timestamps: true }
);

export default mongoose.model("PointsConfig", PointsConfigSchema);
