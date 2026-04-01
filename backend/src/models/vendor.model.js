import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    companyName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked", "active"],
      default: "pending",
    },
    taxCardStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    logoStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    approvedAt: { type: Date },
    taxCard: {
      data: Buffer,
      contentType: String,
    },
    logo: {
      data: Buffer,
      contentType: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Vendor", vendorSchema);
