import mongoose from "mongoose";
import {
  PARTICIPANT_ROLES,
  DEFAULT_ALLOWED_ROLES,
} from "../constants/roles.js";

const PaymentSnapshotSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled_refunded"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["stripe_card", "wallet", "free"],
      default: undefined,
    },
    amountDue: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    paidAt: Date,
    refundedAt: Date,
  },
  { _id: false }
);

const RegistrantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "registrants.userType",
      required: true,
    },
    userType: {
      type: String,
      enum: ["Student", "Faculty", "Staff", "Professor", "TA"],
      required: true,
    },
    registeredAt: { type: Date, default: Date.now },
    payment: { type: PaymentSnapshotSchema, default: () => ({}) },
  },
  { _id: false }
);

const TripSchema = new mongoose.Schema(
  {
    name: String,
    location: String,
    price: Number,
    shortDescription: String,
    startDate: Date,
    endDate: Date,
    startTime: String,
    endTime: String,
    capacity: Number,
    registrationDeadline: Date,
    allowedRoles: {
      type: [String],
      enum: PARTICIPANT_ROLES,
      default: DEFAULT_ALLOWED_ROLES,
    },
    registrants: [RegistrantSchema],
    waitlist: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "waitlist.userType",
          required: true,
        },
        userType: {
          type: String,
          enum: ["Student", "Faculty", "Staff", "Professor", "TA"],
          required: true,
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("Trip", TripSchema);
