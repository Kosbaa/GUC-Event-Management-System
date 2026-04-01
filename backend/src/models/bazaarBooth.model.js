import mongoose from "mongoose";

const BazaarBoothSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, maxlength: 100 },
    boothName: { type: String, required: true, maxlength: 100 },
    size: { type: String, enum: ["2x2", "4x4"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("BazaarBooth", BazaarBoothSchema);


