import mongoose from "mongoose";

const LoyaltyApplicationSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    discountRate: { type: Number, required: true },
    promoCode: { type: String },
    status: { type: String, default: "pending" },
    termsFile: {
      data: Buffer,
      contentType: String,
      originalName: String,
      legacyPath: String,
      uploadedAt: { type: Date, default: Date.now },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { minimize: false }
);

LoyaltyApplicationSchema.pre("init", function (doc) {
  if (doc?.termsFile && typeof doc.termsFile === "string") {
    doc.termsFile = {
      legacyPath: doc.termsFile,
      originalName: doc.termsFile.split(/[\\/]/).pop() || "terms.pdf",
      uploadedAt: doc.createdAt || new Date(),
    };
  }
});

export default mongoose.model("LoyaltyApplication", LoyaltyApplicationSchema);
