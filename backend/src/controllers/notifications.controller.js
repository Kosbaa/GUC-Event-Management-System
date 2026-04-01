import mongoose from "mongoose";
//import { authMiddleware } from "./middlewares/auth.js";
import NotificationTemplate, {
  RECIPIENT_MODELS,
  EVENT_MODELS,
  NOTIFICATION_TYPES,
} from "../models/notificationsTemplate.model.js";
import NotificationUser from "../models/notificationUser.model.js";
import { normalizeRoleName } from "../constants/roles.js";

/* ------------------ Small helpers for date/time ------------------ */
function makeFakeRes() {
  return {
    _status: 200,
    _json: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    },
  };
}

function isValidHHMM(str) {
  if (typeof str !== "string") return false;
  const m = str.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const hh = Number(m[1]), mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}
function combineDateAndTime(dateLike, hhmm) {
  const d = new Date(dateLike);
  if (hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
} function resolveUserIdentity(req) {
  const payload = req.user || {};
  let { id, model: userModel, role } = payload;

  // if token doesn't have model, infer from role
  if (!userModel) {
    userModel = inferUserModelFromRole(role);
  }

  if (!id || !userModel) {
    const err = new Error("Unauthorized: missing id/model");
    err.statusCode = 401;
    throw err;
  }

  // we keep userId as ObjectId to avoid confusion
  const userId = new mongoose.Types.ObjectId(id);

  return { userId, userModel, role };
}
async function computeExpiresAtFromEvent(data) {
  if (!data?.eventModel || !data?.event) return null;

  const { eventModel, event } = data;

  const modelMap = {
    Bazaar: (await import("../models/bazaar.model.js")).default,
    Conference: (await import("../models/conference.model.js")).default,
    Workshop: (await import("../models/workshop.model.js")).default,
    Trip: (await import("../models/trip.model.js")).default,
  };

  const EventModel = modelMap[eventModel];
  if (!EventModel) return null;

  // We assume each event has at least `endDate`,
  // and optionally `endTime` as "HH:mm"
  const doc = await EventModel.findById(event).select("endDate endTime");
  if (!doc || !doc.endDate) return null;

  const end = new Date(doc.endDate);

  if (doc.endTime && typeof doc.endTime === "string") {
    const m = doc.endTime.match(/^(\d{2}):(\d{2})$/);
    if (m) {
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      end.setHours(hh, mm, 0, 0);
    } else {
      // bad format → just push to end of day
      end.setHours(23, 59, 0, 0);
    }
  } else {
    // if no time, treat as "end of that day"
    end.setHours(23, 59, 0, 0);
  }

  return end;
} function inferUserModelFromRole(role) {
  if (!role || typeof role !== "string") return null;

  const r = role.toLowerCase().trim();

  if (r === "student") return "Student";

  // ⭐ Any of these should be treated as Faculty
  if (["faculty", "ta", "staff", "prof", "professor"].includes(r)) {
    return "Faculty";
  }

  if (r === "admin") return "Admin";

  if (r === "event office" || r === "eventoffice") {
    return "EventOffice";
  }

  if (r === "vendor") return "Vendor";

  return null;
}
/* ------------------ Core validator ------------------ */
function validateTemplateInput({
  title,
  message,
  type,
  audienceModel,
  audienceFilter,
  data,
  // multi-audience controller-level flags
  audienceModels,
  allAudiences,
}) {
  if (!title || !message) throw new Error("title and message are required.");
  if (type && !NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid type. Allowed: ${NOTIFICATION_TYPES.join(", ")}`);
  }

  // single audience only if not using multi/all
  if (!allAudiences && !audienceModels) {
    if (!audienceModel || !RECIPIENT_MODELS.includes(audienceModel)) {
      throw new Error(`audienceModel must be one of: ${RECIPIENT_MODELS.join(", ")}`);
    }
  }

  if (audienceFilter && typeof audienceFilter !== "object") {
    throw new Error("audienceFilter, if provided, must be an object or null.");
  }

  // Event-type validation (NEW_EVENT / EVENT_REMINDER)
  if ((type === "NEW_EVENT" || type === "EVENT_REMINDER") && data) {
    const { eventModel, event, startsAt, startTime, reminderLabel } = data;
    if (!eventModel || !EVENT_MODELS.includes(eventModel)) {
      throw new Error(`data.eventModel must be one of: ${EVENT_MODELS.join(", ")}`);
    }
    if (!event) throw new Error("data.event (ObjectId) is required for event notifications.");
    if (!mongoose.Types.ObjectId.isValid(event)) {
      throw new Error("data.event must be a valid ObjectId.");
    }

    if (!startsAt) {
      const need = type === "NEW_EVENT" ? "NEW_EVENT" : "EVENT_REMINDER";
      throw new Error(`data.startsAt is required for ${need}.`);
    }
    const startsAtDate = new Date(startsAt);
    if (isNaN(startsAtDate.getTime())) throw new Error("data.startsAt must be a valid Date.");

    let effectiveStart = startsAtDate;
    if (startTime !== undefined) {
      if (startTime !== null && !isValidHHMM(startTime)) {
        throw new Error('data.startTime must be "HH:mm" when provided.');
      }
      if (startTime) effectiveStart = combineDateAndTime(startsAtDate, startTime);
    }

    if (effectiveStart.getTime() <= Date.now()) {
      throw new Error("Event start (date/time) must be in the future.");
    }

    if (type === "EVENT_REMINDER") {
      if (reminderLabel && typeof reminderLabel !== "string") {
        throw new Error("data.reminderLabel must be a string if provided.");
      }
    }
  }
}

/* ------------------ Visible query (lazy-read) ------------------ */
function buildVisibleTemplatesQuery(userId, userModel, role) {
  const normalizedRole = normalizeRoleName(role);
  const orConditions = [
    { audienceFilter: null }, // broadcast to this model
    { "audienceFilter._id": userId }, // personal (ObjectId)
    { "audienceFilter._id": String(userId) }, // personal (String)
  ];

  if (role) {
    const candidates = [role];
    if (normalizedRole && normalizedRole !== role) {
      candidates.push(normalizedRole);
    }
    orConditions.push({ "audienceFilter.roles": { $in: candidates } });
  }

  return {
    audienceModel: userModel,
    $or: orConditions,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
    ]
  };
}

/* ------------------ Generic creators ------------------ */
// Broadcast: single, multi, or all audiences (lazy-read)
export const createBroadcastNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type = "BROADCAST",
      audienceModel,
      audienceModels,
      allAudiences = false,
      audienceFilter = null, // must be null if multi/all broadcast
      data = null,
    } = req.body;

    // decide targets
    let targets;
    if (allAudiences) {
      targets = RECIPIENT_MODELS.slice();
    } else if (Array.isArray(audienceModels) && audienceModels.length) {
      const invalid = audienceModels.filter((m) => !RECIPIENT_MODELS.includes(m));
      if (invalid.length) {
        return res.status(400).json({ ok: false, message: `Invalid audienceModels: ${invalid.join(", ")}` });
      }
      targets = audienceModels;
    } else {
      if (!audienceModel) {
        return res.status(400).json({ ok: false, message: "audienceModel is required when not using audienceModels or allAudiences." });
      }
      if (!RECIPIENT_MODELS.includes(audienceModel)) {
        return res.status(400).json({ ok: false, message: `audienceModel must be one of: ${RECIPIENT_MODELS.join(", ")}` });
      }
      targets = [audienceModel];
    }

    if (targets.length > 1 && audienceFilter) {
      // Allow if it's a map (object) where keys are models
      // We'll validate inside the loop or here if we want strictness
      if (typeof audienceFilter !== 'object') {
        return res.status(400).json({ ok: false, message: "audienceFilter must be an object map when broadcasting to multiple audience models." });
      }
    }

    // validate common payload
    // Note: We skip strict single-model validation here if multi-target, 
    // relying on the loop below to assign correct filters.
    if (targets.length === 1) {
      validateTemplateInput({
        title, message, type,
        audienceModel: targets[0],
        audienceFilter: audienceFilter,
        data, audienceModels, allAudiences,
      });
    } else {
      // basic validation
      if (!title || !message) throw new Error("title and message are required.");
    }

    let expiresAt = null;
    if (type === "NEW_EVENT" && data?.eventModel && data?.event) {
      try {
        expiresAt = await computeExpiresAtFromEvent(data);
      } catch (e) {
        console.error("[notifications] computeExpiresAtFromEvent error:", e);
        // if it fails, we just leave expiresAt = null, fallback to cron/createdAt logic
      }
    }

    // construct one template per audience (lazy-read broadcast)
    const now = new Date();
    const docs = targets.map((model) => {
      let specificFilter = null;
      if (targets.length > 1 && audienceFilter && typeof audienceFilter === 'object') {
        // Extract filter for this specific model
        const f = audienceFilter[model];
        // If it's a non-empty object, use it. If empty object or null/undefined, use null.
        if (f && Object.keys(f).length > 0) {
          specificFilter = f;
        }
      } else if (targets.length === 1) {
        specificFilter = audienceFilter;
      }

      return {
        title,
        message,
        type,
        audienceModel: model,
        audienceFilter: specificFilter,
        data,
        createdBy: req.user?.id,
        createdByModel: req.user?.model,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };
    });

    const inserted = await NotificationTemplate.insertMany(docs);
    res.status(201).json({
      ok: true,
      inserted: inserted.length,
      targets,
      templates: inserted,
      message:
        targets.length === RECIPIENT_MODELS.length
          ? "Broadcast created for all audiences."
          : `Broadcast created for: ${targets.join(", ")}`,
    });

  } catch (err) {
    console.error("[notifications] createBroadcastNotification error:", err);
    res.status(400).json({ ok: false, message: err.message });
  }
};

// Personal: one recipient (per-user doc)
// Personal: one recipient (per-user doc)
export const createPersonalNotification = async (req, res) => {
  try {
    const {
      recipientId,
      recipientModel, // "Student" | "Faculty" | "EventOffice" | "Admin"
      title,
      message,
      type = "SYSTEM",
      data = null,
    } = req.body;

    if (!recipientId) {
      throw new Error("recipientId is required.");
    }
    if (!recipientModel) {
      throw new Error("recipientModel is required.");
    }

    // ✅ Make sure recipientModel is valid
    if (!RECIPIENT_MODELS.includes(recipientModel)) {
      throw new Error(
        `recipientModel must be one of: ${RECIPIENT_MODELS.join(", ")}`
      );
    }

    // ✅ Validate like all other templates
    validateTemplateInput({
      title,
      message,
      type,
      audienceModel: recipientModel,
      audienceFilter: { _id: recipientId }, // logically personal
      data,
    });

    // ✅ Convert string id → ObjectId for consistent querying
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    const template = await NotificationTemplate.create({
      title,
      message,
      type,
      audienceModel: recipientModel,        // e.g. "Student" / "Faculty"
      audienceFilter: { _id: recipientObjectId }, // personal target
      data,
      createdBy: req.user?.id || null,
      createdByModel: req.user?.model || null,
    });

    return res.status(201).json({ ok: true, template });
  } catch (err) {
    console.error("[notifications] createPersonalNotification error:", err);
    return res.status(400).json({ ok: false, message: err.message });
  }
};

/* ------------------ Readers ------------------ */
export const getUserNotifications = async (req, res) => {
  try {
    // ✅ NEW: Resolve user identity & model consistently (using helper)
    const { userId, userModel, role } = resolveUserIdentity(req);
    const userObjectId = userId;

    // 2) Visible templates for this user:
    const q = buildVisibleTemplatesQuery(userObjectId, userModel, role);

    const templates = await NotificationTemplate.find(q)
      .sort({ createdAt: -1 })
      .lean();

    if (!templates.length) {
      return res.status(200).json({ ok: true, total: 0, items: [] });
    }

    // 3) Fetch this user's read/dismiss state for these templates
    const templateIds = templates.map((t) => t._id);
    const states = await NotificationUser.find({
      userId: userObjectId,
      userModel,
      templateId: { $in: templateIds },
    })
      .select("templateId readAt deletedAt")
      .lean();

    const stateMap = new Map(states.map((s) => [String(s.templateId), s]));

    // 4) Populate creator names
    // Group templates by createdByModel to batch fetch names
    const creatorsByModel = {};
    for (const t of templates) {
      if (t.createdBy && t.createdByModel) {
        if (!creatorsByModel[t.createdByModel]) {
          creatorsByModel[t.createdByModel] = new Set();
        }
        creatorsByModel[t.createdByModel].add(String(t.createdBy));
      }
    }

    // Fetch creator names from each model
    const creatorNames = {};
    for (const [modelName, creatorIds] of Object.entries(creatorsByModel)) {
      try {
        let Model;
        if (modelName === "Student") {
          Model = (await import("../models/student.model.js")).default;
        } else if (modelName === "Faculty") {
          Model = (await import("../models/faculty.model.js")).default;
        } else if (modelName === "EventOffice") {
          Model = (await import("../models/eventOffice.model.js")).default;
        } else if (modelName === "Admin") {
          Model = (await import("../models/admin.model.js")).default;
        } else if (modelName === "Vendor") {
          Model = (await import("../models/vendor.model.js")).default;
        }

        if (Model) {
          const users = await Model.find({ _id: { $in: Array.from(creatorIds) } })
            .select("name firstName lastName")
            .lean();

          for (const user of users) {
            // Handle different name formats
            if (user.name) {
              creatorNames[String(user._id)] = user.name;
            } else if (user.firstName || user.lastName) {
              const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
              creatorNames[String(user._id)] = fullName || "Unknown User";
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch names for model ${modelName}:`, err);
      }
    }

    // 5) Merge state, filter out dismissed, shape response
    const items = [];
    for (const t of templates) {
      const s = stateMap.get(String(t._id));

      // user dismissed this one → hide it completely
      if (s?.deletedAt) continue;

      // Get creator name
      let createdByName = null;
      if (t.createdByModel === "EventOffice") {
        createdByName = "Event Office";
      } else if (t.createdBy) {
        createdByName = creatorNames[String(t.createdBy)] || null;
      }

      items.push({
        _id: t._id, // this is the templateId you use in read/delete routes
        title: t.title,
        message: t.message,
        type: t.type,
        data: t.data || null,
        createdAt: t.createdAt,
        readAt: s?.readAt || null,
        createdBy: t.createdBy || null,
        createdByModel: t.createdByModel || null,
        createdByName,
      });
    }

    return res.status(200).json({
      ok: true,
      total: items.length,
      items,
    });
  } catch (err) {
    console.error("[notifications] getUserNotifications error:", err);
    if (err.statusCode === 401) {
      return res.status(401).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: err.message });
  }
};

const ROLE_TO_MODEL = {
  Student: "Student",
  Faculty: "Faculty",
  Admin: "Admin",
  "Event Office": "EventOffice",
  Vendor: "Vendor",
};

export const markNotificationAsRead = async (req, res) => {
  try {
    // ✅ Use central identity resolver (handles Student / TA / Staff / Professor / etc.)
    const { userId, userModel } = resolveUserIdentity(req);

    // Accept either /read/:templateId or /read/:id
    const templateIdParam = req.params.templateId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(templateIdParam)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid templateId." });
    }

    const templateObjectId = new mongoose.Types.ObjectId(templateIdParam);

    const record = await NotificationUser.findOneAndUpdate(
      // 🔑 Only match on unique index fields: userId + templateId
      { userId, templateId: templateObjectId },
      {
        // ✅ Only mark as read; DO NOT clear deletedAt (dismissed notifications stay hidden)
        $set: {
          userModel,
          readAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({ ok: true, record });
  } catch (err) {
    console.error("[notifications] markNotificationAsRead error:", err);
    if (err.statusCode === 401) {
      return res.status(401).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: err.message });
  }
};



/* ------------------ Convenience creators for your requirements ------------------ */

// 1) NEW EVENT → broadcast to Student/Staff/TA/Professor + optionally EventOffice (use allAudiences or list)
// 1) NEW EVENT → broadcast based on allowedRoles (from the event)
// notifications.controller.js

export const createNewEventBroadcast = async (req, res) => {
  try {
    const { title, message, allowedRoles = [], data } = req.body;

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [];

    // --- 1) Split roles into groups ---
    const wantsStudents = roles.includes("Student");

    const facultyRoleSet = new Set(
      roles.filter((r) =>
        ["Professor", "TA", "Teaching Assistant", "Staff"].includes(r)
      )
    );

    // --- 2) Build audienceModels + audienceFilter ---
    const audienceModels = [];
    const audienceFilter = {};

    // Students: if allowed, target Student model with no extra filter
    if (wantsStudents) {
      audienceModels.push("Student");
      // no extra student filtering here (all students get it)
      audienceFilter.Student = {};
    }

    // Faculty subroles: if any of Professor/TA/Staff selected,
    // send to Faculty collection but **filtered by role**.
    if (facultyRoleSet.size > 0) {
      audienceModels.push("Faculty");
      // Use "roles" array for the new filter logic
      audienceFilter.Faculty = { roles: Array.from(facultyRoleSet) };
    }

    // Event Office: ALWAYS notify
    audienceModels.push("EventOffice");
    audienceFilter.EventOffice = {}; // all EventOffice users

    // --- 3) Enrich data with event details (if not already present) ---
    let enrichedData = { ...data };
    if (data?.eventModel && data?.event) {
      try {
        const modelMap = {
          Bazaar: (await import("../models/bazaar.model.js")).default,
          Conference: (await import("../models/conference.model.js")).default,
          Workshop: (await import("../models/workshop.model.js")).default,
          Trip: (await import("../models/trip.model.js")).default,
        };
        const Model = modelMap[data.eventModel];
        if (Model) {
          const eventDoc = await Model.findById(data.event).lean();
          if (eventDoc) {
            enrichedData = {
              ...enrichedData,
              shortDescription: eventDoc.shortDescription,
              startDate: eventDoc.startDate,
              endDate: eventDoc.endDate,
              startTime: eventDoc.startTime,
              endTime: eventDoc.endTime,
              registrationDeadline: eventDoc.registrationDeadline,
              location: eventDoc.location,
            };
          }
        }
      } catch (err) {
        console.error("[createNewEventBroadcast] failed to enrich data:", err);
        // ignore, proceed with basic data
      }
    }

    const innerReq = {
      user: req.user,
      body: {
        title,
        message,
        type: "NEW_EVENT",
        audienceModels,
        audienceFilter,
        data: enrichedData,
      },
    };
    const innerRes = makeFakeRes();

    await createBroadcastNotification(innerReq, innerRes);

    if (innerRes._status >= 400) {
      console.error("[createNewEventBroadcast] error:", innerRes._json);
      return res
        .status(innerRes._status)
        .json(innerRes._json || { message: "Notification error" });
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[createNewEventBroadcast] exception:", err);
    return res.status(500).json({ message: err.message });
  }
};



// 2) Reminders are per-user → handled later by the job (no change needed here)

// 3) When doctors/professors submit workshop requests → Events Office broadcast
export const notifyWorkshopRequestSubmitted = async (req, res) => {
  // expects: { title?, message?, data:{ requestId?, eventModel:"Workshop", event, startsAt, startTime? } }
  req.body.type = "WORKSHOP_REQUEST_SUBMITTED";
  req.body.audienceModel = "EventOffice";
  req.body.title ||= "New workshop request submitted";
  req.body.message ||= "There is a new workshop request awaiting review.";
  return createBroadcastNotification(req, res);
};

// 4) Professor receives decision (accepted/rejected) → personal
export const notifyWorkshopDecision = async (req, res) => {
  // expects: { professorId, decision:"accepted"|"rejected", data:{ eventModel:"Workshop", event } }
  const { professorId, decision } = req.body;
  const decisionText = decision === "accepted" ? "accepted" : "rejected";
  req.body.recipientId = professorId;
  req.body.recipientModel = "Faculty";
  req.body.type = "WORKSHOP_REQUEST_DECISION";
  req.body.title ||= `Your workshop has been ${decisionText}`;
  req.body.message ||= `Your workshop request has been ${decisionText}.`;
  return createPersonalNotification(req, res);
};

// 5) New loyalty partner → broadcast to Student/Staff/TA/Professor (i.e., Student + Faculty)
export const createNewLoyaltyPartnerBroadcast = async (req, res) => {
  // expects: { title?, message?, data:{ vendorId?, vendorName? } }
  req.body.type = "NEW_LOYALTY_PARTNER";
  req.body.title ||= "New loyalty program partner added";
  req.body.message ||= "Check out the new partner in the loyalty program.";
  req.body.audienceModels = ["Student", "Faculty"];
  return createBroadcastNotification(req, res);
};

// 5b) Pending loyalty application → notify EventOffice and Admin
export const notifyPendingLoyaltyApplication = async (req, res) => {
  // expects: { title?, message?, data:{ vendorId?, vendorName?, discountRate?, promoCode? } }
  req.body.type = "PENDING_LOYALTY_APPLICATION";
  req.body.title ||= "New loyalty program application";
  req.body.message ||= "A vendor has submitted a loyalty program application.";
  req.body.audienceModels = ["EventOffice", "Admin"];
  return createBroadcastNotification(req, res);
};

// 5c) New vendor signup → notify EventOffice and Admin
export const notifyNewVendorSignup = async (req, res) => {
  // expects: { title?, message?, data:{ vendorId?, vendorName? } }
  req.body.type = "NEW_VENDOR_SIGNUP";
  req.body.title ||= "New vendor registration";
  req.body.message ||= "A new vendor has registered.";
  req.body.audienceModels = ["EventOffice", "Admin"];
  return createBroadcastNotification(req, res);
};

// 6) Pending vendor requests → Events Office + Admin broadcast
export const notifyPendingVendorRequests = async (req, res) => {
  // expects: { title?, message?, data:{ vendorCount? } }
  req.body.type = "PENDING_VENDOR_REQUESTS";
  req.body.title ||= "Pending vendor requests";
  req.body.message ||= "There are vendor requests pending your review.";
  req.body.audienceModels = ["EventOffice", "Admin"];
  return createBroadcastNotification(req, res);
};
export const dismissNotification = async (req, res) => {
  try {
    const { userId, userModel } = resolveUserIdentity(req);

    const templateIdParam = req.params.templateId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(templateIdParam)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid templateId." });
    }

    const templateObjectId = new mongoose.Types.ObjectId(templateIdParam);

    const record = await NotificationUser.findOneAndUpdate(
      // 🔑 filter only on the unique-index fields
      { userId, templateId: templateObjectId },
      // 🔧 set state + correct userModel
      {
        $set: {
          userModel,
          deletedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({ ok: true, record });
  } catch (err) {
    console.error("[notifications] dismissNotification error:", err);
    if (err.statusCode === 401) {
      return res.status(401).json({ ok: false, message: err.message });
    }
    res.status(500).json({ ok: false, message: err.message });
  }
};


export const deleteNotification = async (req, res) => {
  try {
    const { templateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ ok: false, message: "Invalid templateId." });
    }

    // Delete the notification template itself
    const deletedTemplate = await NotificationTemplate.findByIdAndDelete(templateId);
    if (!deletedTemplate) {
      return res.status(404).json({ ok: false, message: "Notification not found." });
    }

    // Clean up associated read states
    await NotificationUser.deleteMany({ templateId });

    res.status(200).json({
      ok: true,
      message: "Notification deleted successfully.",
      deletedId: templateId,
    });
  } catch (err) {
    console.error("[notifications] deleteNotification error:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
};
export const getUserNotificationsCount = async (req, res) => {
  try {
    const { id: userId, model: userModel, role } = req.user;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const q = buildVisibleTemplatesQuery(userObjectId, userModel, role);

    const templates = await NotificationTemplate.find(q).select("_id").lean();
    const templateIds = templates.map(t => t._id);

    const states = await NotificationUser.find({
      userId: userObjectId,
      userModel,
      templateId: { $in: templateIds },
    }).select("templateId readAt deletedAt").lean();

    const dismissed = new Set(states.filter(s => s.deletedAt).map(s => String(s.templateId)));
    const read = new Set(states.filter(s => s.readAt).map(s => String(s.templateId)));

    const totalVisible = templateIds.filter(id => !dismissed.has(String(id)));
    const totalUnread = totalVisible.filter(id => !read.has(String(id))).length;

    res.status(200).json({ ok: true, totalVisible: totalVisible.length, totalUnread });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId, userModel, role } = resolveUserIdentity(req);
    const userObjectId = userId;
    const now = new Date();

    // Same visibility logic as getUserNotifications
    const q = buildVisibleTemplatesQuery(userObjectId, userModel, role);

    // 1) Fetch all templates currently visible for this user
    const templates = await NotificationTemplate.find(q)
      .select("_id")
      .lean();
    const templateIds = templates.map((t) => t._id);

    if (!templateIds.length) {
      return res.status(200).json({ ok: true, marked: 0 });
    }

    // 2) Fetch states for this user for those templates
    const states = await NotificationUser.find({
      userId: userObjectId,
      userModel,
      templateId: { $in: templateIds },
    })
      .select("templateId deletedAt")
      .lean();

    // 3) Build a set of dismissed templateIds
    const dismissedSet = new Set(
      states
        .filter((s) => s.deletedAt)
        .map((s) => String(s.templateId))
    );

    // 4) Only mark as read ones that are NOT dismissed
    const ops = templateIds
      .filter((tid) => !dismissedSet.has(String(tid)))
      .map((tid) => ({
        updateOne: {
          filter: { userId: userObjectId, userModel, templateId: tid },
          update: { $set: { readAt: now } },   // ❌ no touching deletedAt
          upsert: true,
        },
      }));

    if (ops.length) {
      await NotificationUser.bulkWrite(ops);
    }

    return res.status(200).json({ ok: true, marked: ops.length });
  } catch (err) {
    console.error("[notifications] markAllNotificationsAsRead error:", err);
    const status = err.statusCode === 401 ? 401 : 500;
    return res.status(status).json({ ok: false, message: err.message });
  }
};

export const dismissAllNotificationsForUser = async (req, res) => {
  try {
    // ✅ NEW: use central identity resolver
    // ✅ NEW: use central identity resolver
    const { userId, userModel, role } = resolveUserIdentity(req);
    const userObjectId = userId;
    const now = new Date();

    // first, find all currently visible templates (same as getUserNotifications)
    const q = buildVisibleTemplatesQuery(userObjectId, userModel, role);

    const templates = await NotificationTemplate.find(q).select("_id").lean();
    const templateIds = templates.map((t) => t._id);

    if (!templateIds.length) {
      return res
        .status(200)
        .json({ ok: true, dismissed: 0, message: "No notifications to dismiss" });
    }

    // upsert for each visible template
    const ops = templateIds.map((tid) => ({
      updateOne: {
        filter: { userId: userObjectId, userModel, templateId: tid },
        update: { $set: { deletedAt: now } },
        upsert: true,
      },
    }));

    await NotificationUser.bulkWrite(ops);

    res.status(200).json({ ok: true, dismissed: ops.length });
  } catch (err) {
    console.error("[notifications] dismissAllNotificationsForUser error:", err);
    const status = err.statusCode === 401 ? 401 : 500;
    res.status(status).json({ ok: false, message: err.message });
  }
};


export const getDismissedNotificationsForUser = async (req, res) => {
  try {
    const { userId, userModel } = resolveUserIdentity(req);

    // 1) get all dismissed state rows for this user
    const states = await NotificationUser.find({
      userId,
      userModel,
      deletedAt: { $ne: null },
    })
      .select("templateId readAt deletedAt createdAt")
      .lean();

    if (!states.length) {
      return res.status(200).json({ ok: true, total: 0, items: [] });
    }

    const templateIds = states.map((s) => s.templateId);
    const templates = await NotificationTemplate.find({
      _id: { $in: templateIds },
    })
      .select("title message type data createdAt")
      .lean();

    const templateMap = new Map(templates.map((t) => [String(t._id), t]));

    const items = states
      .map((s) => {
        const t = templateMap.get(String(s.templateId));
        if (!t) return null; // template might have been deleted
        return {
          templateId: t._id,
          title: t.title,
          message: t.message,
          type: t.type,
          data: t.data || null,
          createdAt: t.createdAt,
          readAt: s.readAt || null,
          dismissedAt: s.deletedAt,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.dismissedAt) - new Date(a.dismissedAt));

    return res.status(200).json({
      ok: true,
      total: items.length,
      items,
    });
  } catch (err) {
    console.error("[notifications] getDismissedNotificationsForUser error:", err);
    if (err.statusCode === 401) {
      return res.status(401).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: err.message });
  }
};
export const restoreNotificationForUser = async (req, res) => {
  try {
    const { userId, userModel } = resolveUserIdentity(req);

    const templateIdParam = req.params.templateId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(templateIdParam)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid templateId." });
    }
    const templateId = new mongoose.Types.ObjectId(templateIdParam);

    const record = await NotificationUser.findOneAndUpdate(
      { userId, templateId },
      {
        $set: { userModel },
        $unset: { deletedAt: 1 }, // remove dismiss
      },
      { new: true }
    );

    return res.status(200).json({
      ok: true,
      record,
    });
  } catch (err) {
    console.error("[notifications] restoreNotificationForUser error:", err);
    if (err.statusCode === 401) {
      return res.status(401).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: err.message });
  }
};
export const deleteNotificationUserState = async (req, res) => {
  try {
    const { userId } = resolveUserIdentity(req);

    const templateIdParam = req.params.templateId || req.params.id;
    if (!mongoose.Types.ObjectId.isValid(templateIdParam)) {
      return res
        .status(400)
        .json({ ok: false, message: "Invalid templateId." });
    }
    const templateId = new mongoose.Types.ObjectId(templateIdParam);

    const result = await NotificationUser.deleteOne({ userId, templateId });

    return res.status(200).json({
      ok: true,
      deleted: result.deletedCount,
    });
  } catch (err) {
    console.error("[notifications] deleteNotificationUserState error:", err);
    if (err.statusCode === 401) {
      return res.status(401).json({ ok: false, message: err.message });
    }
    return res.status(500).json({ ok: false, message: err.message });
  }
};


