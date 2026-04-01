import mongoose from "mongoose";

const courtSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  court: {
    type: String,
    enum: ["Basketball", "Tennis", "Volleyball", "Football"],
    required: true,
  },
  date: { type: Date, required: true },
  time: { type: String }, // Time slot in HH:MM format (e.g., "09:00", "10:00")
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }, // For student reservations
  reservedBy: { type: String, default: "Event Office" }, // "Event Office" or "name-Id" format for students
});

const Court = mongoose.model("Court", courtSchema);

export default Court;
