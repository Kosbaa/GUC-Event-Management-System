import cron from "node-cron";
import mongoose from "mongoose";
import NotificationTemplate from "../models/notificationsTemplate.model.js";
import { normalizeRoleName, sanitizeAllowedRoles, DEFAULT_ALLOWED_ROLES } from "../constants/roles.js";

// === Event models (keep names matching your enums) ===
import Bazaar from "../models/bazaar.model.js";
import Conference from "../models/conference.model.js";
import Workshop from "../models/workshop.model.js";
import Trip from "../models/trip.model.js";

const EVENT_MODEL_MAP = { Bazaar, Conference, Workshop, Trip };

// Rules:
// Rules:
const REGISTERED_ONLY = new Set(["Trip", "Workshop"]);           // personal to registrants + EO broadcast
const OPEN_ACCESS = new Set(["Bazaar", "Conference"]);           // broadcast to allowed roles + EO broadcast
const EVENT_OFFICE_ONLY = ["EventOffice"];                       // always gets broadcast
const FACULTY_SUBROLES = new Set(["Professor", "Staff", "TA"]);

/* ---------------- utilities ---------------- */
function isValidHHMM(str) {
  const m = typeof str === "string" ? str.match(/^(\d{2}):(\d{2})$/) : null;
  if (!m) return false;
  const hh = +m[1], mm = +m[2];
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function combineDateAndTime(dateLike, hhmm) {
  const d = new Date(dateLike);
  if (hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

function inWindow(ts, startInclusive, endExclusive) {
  return ts >= startInclusive && ts < endExclusive;
}

function mapRoleToAudience(role) {
  const normalized = normalizeRoleName(role);
  if (normalized === "Student") return "Student";
  if (["Staff", "TA", "Professor", "Faculty"].includes(normalized)) return "Faculty";
  return null;
}

function normalizeAudienceFilter(filter) {
  if (!filter || typeof filter !== "object") return null;
  const out = {};
  if (Array.isArray(filter.roles) && filter.roles.length) {
    const roles = Array.from(
      new Set(
        filter.roles
          .map((r) => normalizeRoleName(r))
          .filter((r) => FACULTY_SUBROLES.has(r))
      )
    ).sort();
    if (roles.length) out.roles = roles;
  }
  return Object.keys(out).length ? out : null;
}

function buildBroadcastTargets(allowedRoles = []) {
  // If caller passes an array, sanitize it. Only fall back to defaults when undefined/null.
  const cleaned = sanitizeAllowedRoles(allowedRoles);
  const roles = cleaned ?? (Array.isArray(allowedRoles) ? allowedRoles : DEFAULT_ALLOWED_ROLES);

  const normalized = roles
    .map((r) => normalizeRoleName(r))
    .filter(Boolean);

  const wantsStudents = normalized.includes("Student");
  const facultyRoleSet = new Set(
    normalized.filter((r) => FACULTY_SUBROLES.has(r))
  );

  const targets = [];
  if (wantsStudents) {
    targets.push({ audienceModel: "Student", audienceFilter: null });
  }

  // Mirror NEW_EVENT logic: only target Faculty when specific subroles are requested.
  if (facultyRoleSet.size > 0) {
    targets.push({
      audienceModel: "Faculty",
      audienceFilter: { roles: Array.from(facultyRoleSet).sort() },
    });
  }

  return targets;
}

/* ---------------- deduped creators ---------------- */
// Personal reminder (for registrants)
async function upsertPersonalReminder({ audienceModel, userId, eventModel, eventId, effectiveStart, label, eventName }) {
  const filter = {
    audienceModel,
    "audienceFilter._id": new mongoose.Types.ObjectId(userId),
    type: "EVENT_REMINDER",
    "data.eventModel": eventModel,
    "data.event": new mongoose.Types.ObjectId(eventId),
    "data.reminderLabel": label,
  };

  const title = label === "24H"
    ? `Event '${eventName}' starts in 24 hours`
    : `Event '${eventName}' starts in 1 hour`;

  // Clean any stale duplicates for this user/label/event
  await NotificationTemplate.deleteMany(filter);

  const update = {
    $set: {
      title,
      message: `The event "${eventName}" is starting soon. Open to view details.`,
      data: {
        eventModel,
        event: eventId,
        startsAt: effectiveStart,
        reminderLabel: label,            // "24H" | "1H"
      },
    },
    $setOnInsert: {
      type: "EVENT_REMINDER",
      audienceModel,                   // "Student" | "Faculty"
      audienceFilter: { _id: userId }, // personal
    },
  };

  const res = await NotificationTemplate.updateOne(filter, update, { upsert: true });
  return res.upsertedCount > 0;
}

// Broadcast reminder (for EO / open-access)
async function upsertBroadcastReminder({ audienceModel, audienceFilter = null, eventModel, eventId, effectiveStart, label, eventName }) {
  const normalizedFilter = normalizeAudienceFilter(audienceFilter);
  const filter = {
    audienceModel,
    audienceFilter: normalizedFilter,
    type: "EVENT_REMINDER",
    "data.eventModel": eventModel,
    "data.event": new mongoose.Types.ObjectId(eventId),
    "data.reminderLabel": label,
  };

  const title = label === "24H"
    ? `Event '${eventName}' starts in 24 hours`
    : `Event '${eventName}' starts in 1 hour`;

  // Clean any stale duplicates (regardless of audienceFilter) for this audience/event/label
  await NotificationTemplate.deleteMany({
    audienceModel,
    type: "EVENT_REMINDER",
    "data.eventModel": eventModel,
    "data.event": new mongoose.Types.ObjectId(eventId),
    "data.reminderLabel": label,
  });

  const update = {
    $set: {
      title,
      message: `The event "${eventName}" is starting soon. Open to view details.`,
      data: {
        eventModel,
        event: eventId,
        startsAt: effectiveStart,
        reminderLabel: label,
      },
    },
    $setOnInsert: {
      type: "EVENT_REMINDER",
      audienceModel,           // "Student" | "Faculty" | "EventOffice"
      audienceFilter: normalizedFilter,    // broadcast
    },
  };

  const res = await NotificationTemplate.updateOne(filter, update, { upsert: true });
  return res.upsertedCount > 0;
}

/* ---------------- scanning ---------------- */
async function scanEventsForHorizon(horizonMs, windowMinutes = 1) {
  const now = Date.now();
  const wStart = new Date(now + horizonMs);
  const wEnd = new Date(now + horizonMs + windowMinutes * 60 * 1000);

  const candidates = [];
  for (const [eventModel, Model] of Object.entries(EVENT_MODEL_MAP)) {
    // Prefilter by day (perf)
    const minDay = new Date(wStart); minDay.setHours(0, 0, 0, 0);
    const maxDay = new Date(wEnd); maxDay.setHours(23, 59, 59, 999);

    // We only need startDate/startTime, NAME, and allowedRoles (for Conference)
    const docs = await Model.find({ startDate: { $gte: minDay, $lte: maxDay } })
      .select("_id startDate startTime name allowedRoles registrants")
      .lean();

    for (const d of docs) {
      const eff = combineDateAndTime(d.startDate, isValidHHMM(d.startTime) ? d.startTime : undefined);
      if (inWindow(eff, wStart, wEnd)) {
        candidates.push({
          eventModel,
          eventId: d._id,
          effectiveStart: eff,
          eventName: d.name || "Event",
          allowedRoles: d.allowedRoles || [],
          registrants: d.registrants || []
        });
      }
    }
  }

  return { candidates, wStart, wEnd };
}

/* ---------------- per-candidate processing ---------------- */
async function processCandidate({ eventModel, eventId, effectiveStart, label, eventName, allowedRoles, registrants }) {
  let created = 0;
  const seenRegistrants = new Set();

  // 1. Always notify Event Office (Broadcast)
  for (const audienceModel of EVENT_OFFICE_ONLY) {
    const ok = await upsertBroadcastReminder({
      audienceModel, eventModel, eventId, effectiveStart, label, eventName,
    });
    if (ok) created++;
  }

  // 2. Handle Registered-Only Events (Trip, Workshop)
  if (REGISTERED_ONLY.has(eventModel)) {
    // Notify each registrant personally
    for (const r of registrants) {
      // Schema: { user: ObjectId, userType: "Student"|"Faculty" }
      if (!r?.user || !r?.userType) continue;

      // dedupe same user per label
      const key = `${r.user}_${label}`;
      if (seenRegistrants.has(key)) continue;

      // Double check userType is valid audience
      const audience = mapRoleToAudience(r.userType);
      if (!audience) continue;

      const ok = await upsertPersonalReminder({
        audienceModel: audience,
        userId: r.user,
        eventModel,
        eventId,
        effectiveStart,
        label,
        eventName,
      });
      if (ok) {
        seenRegistrants.add(key);
        created++;
      }
    }
    return created;
  }

  // 3. Handle Open-Access Events (Bazaar, Conference)
  if (OPEN_ACCESS.has(eventModel)) {
    // Broadcast to allowed roles (Student + Faculty subroles)
    const targets = buildBroadcastTargets(allowedRoles);

    for (const { audienceModel, audienceFilter } of targets) {
      const ok = await upsertBroadcastReminder({
        audienceModel, audienceFilter, eventModel, eventId, effectiveStart, label, eventName,
      });
      if (ok) created++;
    }
    return created;
  }

  return created;
}

async function processHorizon(label, horizonMs) {
  const { candidates } = await scanEventsForHorizon(horizonMs, 1); // 1-minute window
  let total = 0;
  for (const c of candidates) {
    total += await processCandidate({ ...c, label });
  }
  return total;
}

/* ---------------- entry point ---------------- */
export function startEventReminderCron() {
  // every minute
  cron.schedule("* * * * *", async () => {
    try {
      const c24 = await processHorizon("24H", 24 * 60 * 60 * 1000);
      const c1 = await processHorizon("1H", 1 * 60 * 60 * 1000);
      console.log(`[reminders] 24H sent=${c24}, 1H sent=${c1}`);
    } catch (err) {
      console.error("[reminders] error:", err);
    }
  });
}
