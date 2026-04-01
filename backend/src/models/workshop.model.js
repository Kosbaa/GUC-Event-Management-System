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
    certificateSent: { type: Boolean, default: false },
    certificateSentAt: { type: Date },
  },
  { _id: false }
);

const WorkshopSchema = new mongoose.Schema(
  {
    name: String,
    location: { type: String, enum: ["GUC Cairo", "GUC Berlin"] },
    shortDescription: String,
    agenda: String,
    facultyResponsible: String,
    professors: [String],
    startDate: Date,
    endDate: Date,
    startTime: String,
    endTime: String,
    budget: Number,
    priceToAttend: {
      type: Number,
      default: 0,
      min: 0,
    },
    fundingSource: { type: String, enum: ["External", "GUC"] },
    extraResources: String,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
    },
    archived: { type: Boolean, default: false },

    // 🆕 Approval fields
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "needs_edits"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventOffice",
    },
    rejectionReason: String,
    editRequestComments: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Workshop", WorkshopSchema);
