import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "eventType" },
    eventType: { type: String, enum: ["Workshop", "Trip", "Conference", "Bazaar"], required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    rating: { type: mongoose.Schema.Types.ObjectId, ref: "Rating" }, // optional link to rating
    text: { type: String, maxlength: 1000, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", CommentSchema);
