import mongoose from "mongoose";
import { RECIPIENT_MODELS } from "./notificationsTemplate.model.js";

/**
 * Minimal per-user record created lazily when the user reads
 * a broadcast/personal template. This avoids storing 20k copies.
 */
const NotificationUserSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, required: true },
    userModel:  { type: String, enum: RECIPIENT_MODELS, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "NotificationTemplate", required: true },
    readAt:     { type: Date, default: null },
    deletedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// One row per user + template (prevents duplicates on repeated PATCH /read)
NotificationUserSchema.index({ userId: 1, templateId: 1 }, { unique: true });
// Helpful for listing per user
NotificationUserSchema.index({ userId: 1, createdAt: -1 });
// ✅ TTL index – auto-delete 24 h (86400 s) after deletedAt is set
NotificationUserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 86400 });
//NotificationUserSchema.index(
  //{ readAt: 1 },
  //{ expireAfterSeconds:604800  }// auto-delete 7 days after readAt is set
//);

export default mongoose.model("NotificationUser", NotificationUserSchema);
