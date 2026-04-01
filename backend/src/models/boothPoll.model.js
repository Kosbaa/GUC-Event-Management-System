import mongoose from "mongoose";

const CandidateSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "BoothBooking", required: true },
    companyName: { type: String, required: true },
  },
  { _id: true }
);

const VoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true }, // Student/Faculty/Staff user id
    role: { type: String, required: true }, // Student | Faculty | TA | Staff | ...
    voteFor: { type: mongoose.Schema.Types.ObjectId, required: true }, // candidate _id
    email: { type: String }, 
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BoothPollSchema = new mongoose.Schema(
  {
    location: {
      type: String,
      enum: ["north","south","east","west","north-east","north-west","south-east","south-west"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: String, required: true }, // e.g., "2 weeks"
    candidates: { type: [CandidateSchema], validate: v => v.length >= 2 },
    votes: [VoteSchema],
    status: { type: String, enum: ["open", "closed"], default: "open" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "EventOffice", required: true },
  },
  { timestamps: true }
);

// one vote per user per poll
BoothPollSchema.index({ _id: 1, "votes.user": 1 }, { unique: false });

export default mongoose.model("BoothPoll", BoothPollSchema);