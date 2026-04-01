import mongoose from "mongoose";

export const RECIPIENT_MODELS = ["Student", "Faculty", "EventOffice", "Admin"];
export const EVENT_MODELS = ["Bazaar", "Conference", "Workshop", "Trip"];

// includes your new system use-cases
export const NOTIFICATION_TYPES = [
  "BROADCAST",              // generic system-wide messages
  "SYSTEM",                 // general personal/system
  "NEW_EVENT",              // new event published
  "EVENT_REMINDER",         // 24H / 1H reminders (per-user, later by job)
  "WORKSHOP_REQUEST_SUBMITTED",  // doctor/prof submits; Events Office sees
  "WORKSHOP_REQUEST_DECISION",   // professor gets accept/reject
  "NEW_LOYALTY_PARTNER",         // loyalty program partner added
  "PENDING_VENDOR_REQUESTS",     // admin/event office reminder
  "PENDING_LOYALTY_APPLICATION", // vendor submits loyalty application
  "NEW_VENDOR_SIGNUP",           // new vendor registers
  "EVENT_WAITLIST_SPOT",         // spot opened for waitlist
  "EVENT_WAITLIST_PROMOTED",     // user auto-promoted from waitlist
];

const NotificationTemplateSchema = new mongoose.Schema(
  {
    // who this template is visible to (high-level audience)
    audienceModel: { type: String, enum: RECIPIENT_MODELS, required: true },

    /**
     * Optional: limit to specific person or subgroup.
     * - null = true broadcast to the audienceModel
     * - { _id: <userId> } = personal
     * - { role: "AdminTypeA" } or any other shape you later enforce in code
     */
    audienceFilter: { type: mongoose.Schema.Types.Mixed, default: null },

    // content
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },

    /**
     * Flexible data payload.
     * Event notifications: { eventModel, event, startsAt, startTime?, reminderLabel? }
     * Loyalty/vendor/workshop system notifications may use: { partnerId?, vendorCount?, requestId?, decision? }
     */
    data: { type: mongoose.Schema.Types.Mixed, default: null },

    // audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByModel",
    },
    createdByModel: { type: String, enum: RECIPIENT_MODELS },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Helpful indexes
NotificationTemplateSchema.index({ audienceModel: 1, createdAt: -1 });
NotificationTemplateSchema.index({ expiresAt: 1 });
// Personal filter lookups
NotificationTemplateSchema.index({ "audienceFilter._id": 1 });

// Dedupe / fast lookup for per-user reminders (optional but recommended)
NotificationTemplateSchema.index({
  audienceModel: 1,
  "audienceFilter._id": 1,
  type: 1,
  "data.eventModel": 1,
  "data.event": 1,
  "data.reminderLabel": 1,
});

export default mongoose.model("NotificationTemplate", NotificationTemplateSchema);
