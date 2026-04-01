import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["init", "credit", "debit", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true }, // stored in cents
    currency: { type: String, default: "egp" },
    description: { type: String },
    stripeReference: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: "egp",
    },
    balance: {
      type: Number,
      default: 0, // stored in cents (e.g. $1.00 => 100)
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    history: {
      type: [TransactionSchema],
      default: [],
    },
    lastTransactionAt: Date,
  },
  { timestamps: true }
);

WalletSchema.index({ user: 1, userRole: 1 }, { unique: true });

export default mongoose.model("Wallet", WalletSchema);
