import GymSession from "../models/gymSession.model.js";
import Student from "../models/student.model.js";
import Faculty from "../models/faculty.model.js";
import { sendEmail } from "../lib/mailer.js";

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

export async function isGymSessionAvailable(
  date,
  time,
  duration,
  excludeSessionId = null
) {
  const newStart = timeToMinutes(time);
  const newEnd = timeToMinutes(duration) + newStart;

  const sessions = await GymSession.find({ date });

  for (const session of sessions) {
    if (
      excludeSessionId &&
      (session._id?.equals?.(excludeSessionId) ||
        session._id?.toString() === excludeSessionId.toString())
    ) {
      continue; // skip the session currently being edited
    }
    const existingStart = timeToMinutes(session.time);
    const existingEnd = timeToMinutes(session.duration) + existingStart;

    // Check overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return false; // conflict found
    }
  }

  return true; // no conflicts
}

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime(); // numeric for easy compare
}

function nowHHMM() {
  const n = new Date();
  const hh = String(n.getHours()).padStart(2, "0");
  const mm = String(n.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

async function resolveRegistrantContacts(registrants = []) {
  const contacts = [];
  for (const reg of registrants) {
    if (!reg?.user || !reg?.userType) continue;
    const Model = reg.userType === "Student" ? Student : Faculty;
    const doc = await Model.findById(reg.user).select(
      "email firstName lastName"
    );
    if (!doc?.email) continue;
    const name =
      [doc.firstName, doc.lastName].filter(Boolean).join(" ").trim() ||
      doc.email;
    contacts.push({ email: doc.email, name });
  }
  // dedupe by email
  const seen = new Set();
  return contacts.filter((c) => {
    if (seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });
}

async function notifyGymRegistrants(session, action = "updated") {
  try {
    if (!session?.registrants?.length) return;
    const contacts = await resolveRegistrantContacts(session.registrants);
    if (!contacts.length) return;

    const when = session.date
      ? new Date(session.date).toLocaleDateString()
      : "scheduled date";
    const timeLabel = session.time ? ` at ${session.time}` : "";
    const subject =
      action === "cancelled"
        ? "Gym session cancelled"
        : "Gym session updated";
    const textBody =
      action === "cancelled"
        ? `Hello,

The gym session you registered for on ${when}${timeLabel} has been cancelled.

Type: ${session.type || "Gym Session"}
Duration: ${session.duration || "N/A"}

Please check the schedule for alternatives.

GUC Events Team`
        : `Hello,

The gym session you registered for has been updated. Please review the new details below.

Date: ${when}${timeLabel}
Type: ${session.type || "Gym Session"}
Duration: ${session.duration || "N/A"}

If you can no longer attend, please update your plans accordingly.

GUC Events Team`;

    for (const c of contacts) {
      await sendEmail({
        to: c.email,
        subject,
        text: textBody,
      });
    }
  } catch (err) {
    console.error("[gym notify] failed to send notifications:", err.message);
  }
}

export const createGymSession = async (req, res) => {
  try {
    const { date, time, duration, type, maxParticipants } = req.body;

    const available = await isGymSessionAvailable(date, time, duration);
    if (!available)
      return res.status(400).json({ message: "Gym session already booked" });

    const session = new GymSession({
      date,
      time,
      duration,
      type,
      maxParticipants,
    });
    await session.save();

    res.status(201).json({ message: "Gym session created", session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};

export const editGymSession = async (req, res) => {
  try {
    const { id } = req.params;
    let { date, time, duration } = req.body;

    // First, get the requested Gym Session
    const currentGymSession = await GymSession.findById(id);
    if (!currentGymSession) {
      return res.status(404).json({ message: "Gym Session not found" });
    }

    if (!date) {
      date = currentGymSession.date;
    }
    if (!time) {
      time = currentGymSession.time;
    }
    if (!duration) {
      duration = currentGymSession.duration;
    }

    const available = await isGymSessionAvailable(date, time, duration, id);
    if (!available)
      return res
        .status(400)
        .json({ message: "Gym session is not available at this time" });

    const today = toDateOnly(new Date());
    const sessionDay = toDateOnly(currentGymSession.date);

    // If session day is before today -> passed
    if (sessionDay < today) {
      return res
        .status(400)
        .json({ message: "Cannot update: session day is in the past" });
    }

    // If same day, check time string lexicographically (assuming "HH:mm")
    if (sessionDay === today) {
      return res
        .status(400)
        .json({ message: "Cannot update: too late session is today" });
    }

    // Only allow known fields to be updated
    const allowedFields = ["date", "time", "duration"];

    const update = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // If updating date or time, check if the new start date is in the past
    if (update.date && new Date(toDateOnly(update.date)) < today) {
      return res.status(400).json({
        message: "Cannot set date in the past",
      });
    }
    if (update.date && new Date(update.date) == today) {
      if (update.time && new Date(update.time) < nowHHMM()) {
        return res.status(400).json({
          message: "Cannot set time in the past",
        });
      }
    }

    const updatedSession = await GymSession.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedSession) {
      return res.status(404).json({ message: "Gym Session not found" });
    }

    await notifyGymRegistrants(updatedSession, "updated");

    res.status(200).json({
      message: "Gym Session updated successfully",
      gymSession: updatedSession,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};

export const deleteGymSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await GymSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Gym Session not found" });
    }

    await session.deleteOne();
    await notifyGymRegistrants(session, "cancelled");

    res.json({ message: "Gym Session Cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const sessions = await GymSession.find().populate(
      "registrants.user",
      "firstName lastName UniId email"
    );
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};
