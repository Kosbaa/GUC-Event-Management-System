// models/BoothBooking.js
import mongoose from "mongoose";

const PaymentSnapshotSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_payment",
        "paid",
        "cancelled",
        "cancelled_refunded",
      ],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["stripe_card", "wallet", "free"],
    },
    amountDue: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    currency: { type: String, default: "egp" },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    deadline: Date,
    paidAt: Date,
    refundedAt: Date,
  },
  { _id: false }
);

const BoothBookingSchema = new mongoose.Schema(
  {
    booth: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booth",
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    companyName: { type: String, required: true },
    duration: {
      type: String,
      enum: ["1 week", "2 weeks", "3 weeks", "4 weeks"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    attendees: [
      {
        name: { type: String, maxlength: 50 },
        email: { type: String, maxlength: 100 },

        idDocument: {
          data: Buffer,
          contentType: String,
        },
      },
    ],
    pricePerWeekSnapshot: { type: Number, default: 0 },
    boothPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_payment",
        "approved",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },
    expired: { type: Boolean, default: false },
    rejectionReason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "EventOffice" },
    approvedAt: { type: Date },
    payment: { type: PaymentSnapshotSchema, default: () => ({}) },
    paymentDeadline: { type: Date },
    paymentIntentId: { type: String },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-calculate endDate
BoothBookingSchema.pre("save", function (next) {
  const weeks = parseInt(this.duration.split(" ")[0]);
  const end = new Date(this.startDate);
  end.setDate(end.getDate() + weeks * 7);
  this.endDate = end;
  next();
});

export default mongoose.model("BoothBooking", BoothBookingSchema);
