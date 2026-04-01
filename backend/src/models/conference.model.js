import mongoose from "mongoose";
import {
  PARTICIPANT_ROLES,
  DEFAULT_ALLOWED_ROLES,
} from "../constants/roles.js";

const ConferenceSchema = new mongoose.Schema({
  name: String,
  shortDescription: String,
  agenda: String,
  startDate: Date,
  endDate: Date,
  startTime: String,
  endTime: String,
  website: String,
  budget: Number,
  fundingSource: { type: String, enum: ["External", "GUC"] },
  extraResources: String,
  archived: { type: Boolean, default: false },
  allowedRoles: {
    type: [String],
    enum: PARTICIPANT_ROLES,
    default: DEFAULT_ALLOWED_ROLES,
  },
}
, { timestamps: true });

export default mongoose.model("Conference", ConferenceSchema);
