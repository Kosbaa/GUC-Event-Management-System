import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    UniId: { type: String, unique: true, required: true },
    role: {
      type: String,
      enum: ["Staff", "TA", "Professor", "pending"],
      default: "pending",
    },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true }
);

export default mongoose.model("Faculty", facultySchema);
