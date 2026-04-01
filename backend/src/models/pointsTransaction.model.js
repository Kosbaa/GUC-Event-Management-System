import mongoose from "mongoose";

const PointsTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Student" },
    type: { type: String, enum: ["earn", "spend"], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PointsTransactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("PointsTransaction", PointsTransactionSchema);
