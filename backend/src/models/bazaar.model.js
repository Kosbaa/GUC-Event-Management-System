import mongoose from "mongoose";
import {
  PARTICIPANT_ROLES,
  DEFAULT_ALLOWED_ROLES,
} from "../constants/roles.js";

const VendorRequestSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    attendees: [
      {
        name: String,
        email: String,

        idDocument: {
          data: Buffer,
          contentType: String,
        },
      },
    ],
    boothSize: { type: String, enum: ["2x2", "4x4"], required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "awaiting_payment",
        "accepted",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },
    boothPrice: { type: Number },
    paymentIntentId: { type: String },
    paidAt: Date,
    paymentDeadline: Date,
    appliedAt: { type: Date, default: Date.now },
    cancelledAt: Date,
  },
  { _id: false }
);

const BazaarSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    shortDescription: { type: String },
    registrationDeadline: { type: Date, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: String,
    endTime: String,
    capacity: { type: Number, required: true },
    price2x2: {
      type: Number,
      required: true,
      min: 0,
    },
    price4x4: {
      type: Number,
      required: true,
      min: 0,
    },
    vendorRequests: [VendorRequestSchema],
    archived: { type: Boolean, default: false },
    allowedRoles: {
      type: [String],
      enum: PARTICIPANT_ROLES,
      default: DEFAULT_ALLOWED_ROLES,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Bazaar", BazaarSchema);
