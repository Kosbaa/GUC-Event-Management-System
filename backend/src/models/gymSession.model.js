import mongoose from "mongoose";

const RegistrantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "registrants.userType",
      required: true,
    },
    userType: { type: String, enum: ["Student", "Faculty"], required: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GymSessionSchema = new mongoose.Schema(
  {
    date: Date,
    time: String,
    duration: String,
    type: {
      type: String,
      enum: [
        "Yoga",
        "Pilates",
        "Aerobics",
        "Zumba",
        "Cross Circuit",
        "Kick-boxing",
      ],
    },
    maxParticipants: Number,
    registrants: [RegistrantSchema],
  },
  { timestamps: true }
);

export default mongoose.model("GymSession", GymSessionSchema);
