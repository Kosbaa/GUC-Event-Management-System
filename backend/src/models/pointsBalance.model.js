import mongoose from "mongoose";

const PointsBalanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

PointsBalanceSchema.index({ user: 1, userRole: 1 }, { unique: true });

export default mongoose.model("PointsBalance", PointsBalanceSchema);
