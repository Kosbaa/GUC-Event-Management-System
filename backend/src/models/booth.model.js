// models/Booth.js
import mongoose from "mongoose";

const BoothSchema = new mongoose.Schema(
  {
    boothName: { type: String, required: true, maxlength: 100 },
    location: {
      type: String,
      required: true,
      enum: [
        "north",
        "south",
        "east",
        "west",
        "north-east",
        "north-west",
        "south-east",
        "south-west",
      ],
    },
    size: { type: String, enum: ["2x2", "4x4"], required: true },
    pricePerWeek: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Booth", BoothSchema);
