import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "eventType" },
    eventType: { type: String, enum: ["Workshop", "Trip", "Conference", "Bazaar"], required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    value: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

// Enforce 1 rating per student per event
RatingSchema.index({ eventId: 1, student: 1 }, { unique: true });

export default mongoose.model("Rating", RatingSchema);
