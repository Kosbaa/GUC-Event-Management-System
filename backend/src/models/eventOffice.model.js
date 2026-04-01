import mongoose from "mongoose";

const eventOfficeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ["active", "blocked"], default: "active" },
}
, { timestamps: true });

export default mongoose.model("EventOffice", eventOfficeSchema);
