import mongoose from "mongoose";
import EventOffice from "../models/eventOffice.model.js";
import Bazaar from "../models/bazaar.model.js";
import Conference from "../models/conference.model.js";
import Workshop from "../models/workshop.model.js";
import Trip from "../models/trip.model.js";
import Booth from "../models/booth.model.js";
import BazaarBooth from "../models/bazaarBooth.model.js";
import BoothBooking from "../models/BoothBooking.js";
import ExcelJS from "exceljs";
import Student from "../models/student.model.js";
import Faculty from "../models/faculty.model.js";
import Rating from "../models/rating.model.js";
import Comment from "../models/comment.model.js";
import BoothPoll from "../models/boothPoll.model.js";

import Vendor from "../models/vendor.model.js";
import { sendEmail } from "../lib/mailer.js";
import QRCode from "qrcode";
import {
  resolveAllowedRolesInput,
  filterEventsForRole,
  normalizeRoleName,
  DEFAULT_ALLOWED_ROLES,
} from "../constants/roles.js";
import { normalizeRegistrationDeadline } from "../utils/registrationDeadline.js";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "TBD";

const buildCertificateId = (workshopId, userId) => {
  return `CERT-${String(workshopId).slice(-6).toUpperCase()}-${String(userId)
    .slice(-6)
    .toUpperCase()}`;
};

const buildCertificateHtml = ({
  attendeeName,
  roleLabel,
  workshopName,
  completionDate,
  location,
  certificateId,
}) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 4px solid #d4af37; padding: 32px; background: #fffdf5;">
    <h1 style="text-align:center; margin-bottom: 8px; color: #1f2937;">Certificate of Attendance</h1>
    <p style="text-align:center; color: #4b5563; margin-top: 0;">Certificate ID: <strong>${certificateId}</strong></p>
    <p style="margin: 32px 0; font-size: 18px; text-align:center;">
      This is to certify that<br />
      <span style="display:block; font-size: 26px; font-weight: bold; color: #111827; margin: 12px 0;">${attendeeName}</span>
      (${roleLabel}) has successfully attended the workshop
      <span style="display:block; font-size: 22px; font-weight: 600; color: #111827; margin: 12px 0;">"${workshopName}"</span>
      held at ${location || "GUC Campus"} on ${completionDate}.
    </p>
    <p style="text-align:center; color: #4b5563;">Issued by GUC Event Office</p>
  </div>
`;

const buildCertificateText = ({
  attendeeName,
  roleLabel,
  workshopName,
  completionDate,
  location,
  certificateId,
}) => `Certificate of Attendance
Certificate ID: ${certificateId}

This certifies that ${attendeeName} (${roleLabel}) attended the workshop "${workshopName}" held at ${
  location || "GUC Campus"
} on ${completionDate}.

Issued by GUC Event Office.`;

const ensureEventOfficeAccess = (user) =>
  ["Admin", "Event Office"].includes(user?.role);
const resolveUserRole = (req) => normalizeRoleName(req?.user?.role);

const filterEventsForUser = (docs, req) =>
  filterEventsForRole(docs, resolveUserRole(req), {
    userId: req?.user?.id,
  });

const fetchRegistrantProfile = async (userId, userType) => {
  if (userType === "Student") {
    const student = await Student.findById(userId).lean();
    if (!student) return null;
    const name =
      [student.firstName, student.lastName].filter(Boolean).join(" ").trim() ||
      "Student";
    return { email: student.email, name, role: "Student" };
  }
  const faculty = await Faculty.findById(userId).lean();
  if (!faculty) return null;
  const name =
    [faculty.firstName, faculty.lastName].filter(Boolean).join(" ").trim() ||
    faculty.email;
  const role = faculty.role || "Faculty";
  return { email: faculty.email, name, role };
};
import {
  createBroadcastNotification,
  // createNotificationTemplate,
  notifyWorkshopRequestSubmitted,
  notifyWorkshopDecision,
  //createNewLoyaltyPartnerBroadcast,
  notifyPendingVendorRequests,
  createNewEventBroadcast,
} from "./notifications.controller.js";

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

/**
 * Helper for Trip/Bazaar/Workshop
 * Location + startDate/endDate overlap check
 */
const isLocationAvailable = async (
  Model,
  location,
  startDate,
  endDate,
  excludeId = null
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const query = {
    location,
    startDate: { $lt: end },
    endDate: { $gt: start },
  };

  if (excludeId) query._id = { $ne: excludeId };

  return !(await Model.findOne(query));
};

//
/**
 * Conference availability
 * Only checks startDate/endDate overlap (no location)
 */
const isConferenceAvailable = async (startDate, endDate, excludeId = null) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const query = {
    startDate: { $lt: end },
    endDate: { $gt: start },
  };

  if (excludeId) query._id = { $ne: excludeId };

  return !(await Conference.findOne(query));
};

export const createBooth = async (req, res) => {
  try {
    const { boothName, location, size } = req.body;

    // Create a physical booth location
    const booth = new Booth({
      boothName,
      location,
      size,
    });

    await booth.save();

    res.status(201).json({
      message: "Booth location created successfully",
      booth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Seed booth locations for all available locations
// export const seedBoothLocations = async (req, res) => {
//   try {
//     const locations = [
//       "north", "south", "east", "west",
//       "north-east", "north-west", "south-east", "south-west"
//     ];

//     const sizes = ["2x2", "4x4"];

//     // Check if booths already exist
//     const existingBooths = await Booth.countDocuments();
//     if (existingBooths > 0) {
//       return res.status(400).json({
//         message: "Booth locations already exist in the database"
//       });
//     }

//     const booths = [];

//     // Create 2 booths for each location (one 2x2, one 4x4)
//     for (const location of locations) {
//       for (const size of sizes) {
//         const booth = new Booth({
//           boothName: `${location.charAt(0).toUpperCase() + location.slice(1)} Booth ${size}`,
//           location,
//           size,
//         });
//         await booth.save();
//         booths.push(booth);
//       }
//     }

//     res.status(201).json({
//       message: `Created ${booths.length} booth locations successfully`,
//       booths,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// export const createBazaar = async (req, res) => {
//   try {
//     const {
//       name,
//       location,
//       shortDescription,
//       registrationDeadline,
//       startDate,
//       endDate,
//       startTime,
//       endTime,
//       eventId,
//     } = req.body;

//     const existingBazaar = await Bazaar.findOne({ name, startDate });
//     if (existingBazaar) {
//       return res.status(400).json({ message: "Bazaar already exists" });
//     }

//     const available = await isLocationAvailable(
//       Bazaar,
//       location,
//       startDate,
//       endDate
//     );
//     if (!available)
//       return res.status(400).json({ message: "Location already booked" });

//     let bazaar = new Bazaar({
//       name,
//       location,
//       shortDescription,
//       registrationDeadline,
//       startDate,
//       endDate,
//       startTime,
//       endTime,
//       eventId,
//     });
//     await bazaar.save();

//     res.json({ message: "Bazaar created successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" + err.message });
//   }
// };

export const createConference = async (req, res) => {
  try {
    const {
      name,
      shortDescription,
      agenda,
      startDate,
      endDate,
      startTime,
      endTime,
      website,
      budget,
      fundingSource,
      extraResources,
      eventId,
      allowedRoles,
    } = req.body;

    const available = await isConferenceAvailable(startDate, endDate);
    if (!available)
      return res
        .status(400)
        .json({ message: "Conference slot already booked" });

    let conference = new Conference({
      name,
      shortDescription,
      agenda,
      startDate,
      endDate,
      startTime,
      endTime,
      website,
      budget,
      fundingSource,
      extraResources,
      eventId,
      allowedRoles: resolveAllowedRolesInput(allowedRoles),
    });
    await conference.save();

    const startsAt = startDate
      ? startTime
        ? mergeDateAndTime(startDate, startTime)
        : new Date(startDate)
      : null;

    // 🔔 CHANGED: use allowedRoles + createNewEventBroadcast
    const fakeReq = {
      user: req.user,
      body: {
        title: `Conference: ${conference.name}`,
        message: `Open to everyone allowed to attend. Check details.`, // (text only)
        allowedRoles: conference.allowedRoles, // NEW
        data: {
          eventModel: "Conference",
          event: conference._id,
          startsAt,
          startTime: startTime || null, // NEW (optional, helps reminders)
          reminderLabel: null,
        },
      },
    };
    const fakeRes = makeFakeRes();
    await createNewEventBroadcast(fakeReq, fakeRes); // CHANGED
    if (fakeRes._status >= 400) {
      console.error("[notif error conf]:", fakeRes._json);
    }

    res.json({ message: "Conference created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};


export const createWorkshop = async (req, res) => {
  try {
    const {
      name,
      shortDescription,
      agenda,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      facultyResponsible,
      professors,
      budget,
      fundingSource,
      extraResources,
      capacity,
      registrationDeadline,
      eventId,
      allowedRoles,
    } = req.body;

    const requesterRole = normalizeRoleName(req.user?.role);
    const privilegedRoles = ["Event Office", "Admin"];
    const effectiveAllowedRoles = privilegedRoles.includes(requesterRole)
      ? resolveAllowedRolesInput(allowedRoles)
      : DEFAULT_ALLOWED_ROLES;

    const available = await isLocationAvailable(
      Workshop,
      location,
      startDate,
      endDate
    );
    if (!available)
      return res.status(400).json({ message: "Location already booked" });

    const normalizedRegistrationDeadline = normalizeRegistrationDeadline(
      registrationDeadline,
      startDate,
      startTime
    );

    let workshop = new Workshop({
      name,
      shortDescription,
      agenda,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      facultyResponsible,
      professors,
      budget,
      fundingSource,
      extraResources,
      capacity,
      registrationDeadline: normalizedRegistrationDeadline ?? null,
      eventId,
      createdBy: req.user.id,
      priceToAttend: 0,
      allowedRoles: effectiveAllowedRoles,
    });
    await workshop.save();

    const startsAt =
      startDate && startTime
        ? mergeDateAndTime(startDate, startTime)
        : startDate
          ? new Date(startDate)
          : null;

    const fakeReq = {
      user: req.user,
      body: {
        data: {
          eventModel: "Workshop",
          event: workshop._id,
          startsAt,
        },
      },
    };
    const fakeRes = makeFakeRes();
    await notifyWorkshopRequestSubmitted(fakeReq, fakeRes);

    res.json({ message: "Workshop created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" + err.message });
  }
};

///////

const normalizeEventType = (type) => {
  if (!type) return "";
  const t = String(type).trim().toLowerCase();
  if (t === "workshop") return "Workshop";
  if (t === "trip") return "Trip";
  if (t === "conference") return "Conference";
  if (t === "bazaar") return "Bazaar";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
};

/////

export const createTrip = async (req, res) => {
  try {
    const {
      eventId,
      name,
      location,
      price,
      shortDescription,
      startDate,
      endDate,
      startTime,
      endTime,
      capacity,
      registrationDeadline,
      allowedRoles,
    } = req.body;

    const available = await isLocationAvailable(
      Trip,
      location,
      startDate,
      endDate
    );
    if (!available)
      return res.status(400).json({ message: "Location already booked" });

    const normalizedRegistrationDeadline = normalizeRegistrationDeadline(
      registrationDeadline,
      startDate,
      startTime
    );

    const trip = new Trip({
      eventId,
      name,
      location,
      price,
      shortDescription,
      startDate,
      endDate,
      startTime,
      endTime,
      capacity,
      registrationDeadline: normalizedRegistrationDeadline ?? null,
      allowedRoles: resolveAllowedRolesInput(allowedRoles),
    });
    await trip.save();

    const startsAt = startDate
      ? startTime
        ? mergeDateAndTime(startDate, startTime)
        : new Date(startDate)
      : null;

    // 🔔 CHANGED: use allowedRoles + createNewEventBroadcast
    const fakeReq = {
      user: req.user,
      body: {
        title: `New Trip: ${trip.name}`,
        message: `Location: ${trip.location}. Registration is open.`,
        allowedRoles: trip.allowedRoles, // NEW
        data: {
          eventModel: "Trip",
          event: trip._id,
          startsAt,
          startTime: startTime || null, // NEW (optional)
          reminderLabel: null,
        },
      },
    };
    const fakeRes = makeFakeRes();
    await createNewEventBroadcast(fakeReq, fakeRes); // CHANGED
    if (fakeRes._status >= 400) {
      console.error("[notif error trip]:", fakeRes._json);
    }

    res.json({ message: "Trip created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};

// PATCH: update trip by id (partial update)
export const updateTrip = async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the current trip to check its start date
    const currentTrip = await Trip.findById(id);
    if (!currentTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if trip has already started (start date has passed)
    const currentDate = new Date();
    if (currentTrip.startDate && currentTrip.startDate < currentDate) {
      return res.status(400).json({
        message: "Cannot update trip: start date has already passed",
      });
    }

    // Only allow known fields to be updated
    const allowedFields = [
      "name",
      "location",
      "price",
      "shortDescription",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "capacity",
      "registrationDeadline",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "allowedRoles")) {
      update.allowedRoles = resolveAllowedRolesInput(req.body.allowedRoles);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const nextStartDate = update.startDate || currentTrip.startDate;
    const nextStartTime = update.startTime || currentTrip.startTime;

    if (
      Object.prototype.hasOwnProperty.call(update, "registrationDeadline")
    ) {
      const normalizedDeadline = normalizeRegistrationDeadline(
        update.registrationDeadline,
        nextStartDate,
        nextStartTime
      );
      update.registrationDeadline = normalizedDeadline ?? null;
    }

    // If updating startDate, check if the new start date is in the past
    if (update.startDate && new Date(update.startDate) < currentDate) {
      return res.status(400).json({
        message: "Cannot set start date in the past",
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res
      .status(200)
      .json({ message: "Trip updated successfully", trip: updatedTrip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" + err.message });
  }
};
function mergeDateAndTime(dateObj, timeStr) {
  // Clone the date to avoid mutating the original
  const result = new Date(dateObj);

  // Split "HH:mm" into hours and minutes
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Set hours and minutes on the date
  result.setHours(hours, minutes, 0, 0);

  return result;
}

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const bazaar = await Bazaar.findById(id);
    if (bazaar) {
      const hasApprovedVendors = Array.isArray(bazaar.vendorRequests)
        ? bazaar.vendorRequests.some((req) =>
            ["accepted", "awaiting_payment"].includes(req.status)
          )
        : false;

      if (hasApprovedVendors) {
        return res.status(400).json({
          message:
            "Cannot delete a bazaar that has vendors in accepted or awaiting payment state",
        });
      }

      await bazaar.deleteOne();
      return res.json({ message: "Event deleted successfully" });
    }

    let deleted = await Conference.findByIdAndDelete(id);
    if (!deleted) {
      deleted = await Workshop.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await Trip.findByIdAndDelete(id);
    }
    // if (!deleted) {
    //deleted = await GymSession.findByIdAndDelete(id);
    //}
    if (!deleted) {
      deleted = await Booth.findByIdAndDelete(id);
    }
    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getBazaars = async (req, res) => {
  try {
    const bazaars = await Bazaar.find({ archived: { $ne: true } });
    const visibleBazaars = filterEventsForUser(bazaars, req);

    // Attach ratings and comments to each bazaar
    const bazaarsWithFeedback = await Promise.all(
      visibleBazaars.map((bazaar) =>
        attachFeedbackToEvent(bazaar.toObject(), "Bazaar")
      )
    );

    res.json(bazaarsWithFeedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ archived: { $ne: true } });
    const visibleTrips = filterEventsForUser(trips, req);

    // Attach ratings and comments to each trip
    const tripsWithFeedback = await Promise.all(
      visibleTrips.map((trip) => attachFeedbackToEvent(trip.toObject(), "Trip"))
    );

    res.json(tripsWithFeedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// GET /api/events/trips/:tripId/participants
export const getTripParticipants = async (req, res) => {
  try {
    const { tripId } = req.params;
    const requesterId = req?.user?.id;
    const requesterRole = normalizeRoleName(req?.user?.role);

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      return res.status(400).json({ message: "Invalid tripId" });
    }

    const trip = await Trip.findById(tripId).select(
      "name startDate endDate registrants"
    );

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const isPrivileged = ["Admin", "Event Office"].includes(requesterRole);
    const isRegistrant = (trip.registrants || []).some(
      (reg) => reg?.user?.toString?.() === requesterId
    );

    if (!isPrivileged && !isRegistrant) {
      return res.status(403).json({
        message: "You must be registered for this trip to view participants",
      });
    }

    const participants = (
      await Promise.all(
        (trip.registrants || []).map(async (registrant) => {
          const profile = await fetchRegistrantProfile(
            registrant.user,
            registrant.userType
          );
          if (!profile) return null;
          return {
            id: registrant.user?.toString?.() || registrant.user,
            name: profile.name,
            role: profile.role || registrant.userType || "Participant",
            registeredAt: registrant.registeredAt,
          };
        })
      )
    ).filter(Boolean);

    return res.json({
      trip: {
        id: trip._id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      participants,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};

// GET /api/events/workshops/:workshopId/participants
export const getWorkshopParticipantsForStudent = async (req, res) => {
  try {
    const { workshopId } = req.params;
    const requesterId = req?.user?.id;
    const requesterRole = normalizeRoleName(req?.user?.role);

    if (!mongoose.Types.ObjectId.isValid(workshopId)) {
      return res.status(400).json({ message: "Invalid workshopId" });
    }

    const workshop = await Workshop.findById(workshopId).select(
      "name startDate endDate registrants"
    );

    if (!workshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }

    const isPrivileged = ["Admin", "Event Office"].includes(requesterRole);
    const isRegistrant = (workshop.registrants || []).some(
      (reg) => reg?.user?.toString?.() === requesterId
    );

    if (!isPrivileged && !isRegistrant) {
      return res.status(403).json({
        message: "You must be registered for this workshop to view participants",
      });
    }

    const participants = (
      await Promise.all(
        (workshop.registrants || []).map(async (registrant) => {
          const profile = await fetchRegistrantProfile(
            registrant.user,
            registrant.userType
          );
          if (!profile) return null;
          return {
            id: registrant.user?.toString?.() || registrant.user,
            name: profile.name,
            role: profile.role || registrant.userType || "Participant",
            registeredAt: registrant.registeredAt,
          };
        })
      )
    ).filter(Boolean);

    return res.json({
      workshop: {
        id: workshop._id,
        name: workshop.name,
        startDate: workshop.startDate,
        endDate: workshop.endDate,
      },
      participants,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
};
export const getWorkshops = async (req, res) => {
  try {
    const userRole = resolveUserRole(req); // from auth middleware
    let filter = {};

    if (userRole === "Student") {
      // Students should NOT see rejected workshops
      filter.approvalStatus = { $ne: "rejected" };
    }
    // Hide archived workshops for everyone in listings
    filter.archived = { $ne: true };

    // Event Office and Admin see all workshops, no filter needed
    const workshops = await Workshop.find(filter).sort({ startDate: 1 });
    const visibleWorkshops = filterEventsForUser(workshops, req);

    // Attach ratings and comments to each workshop
    const workshopsWithFeedback = await Promise.all(
      visibleWorkshops.map((workshop) =>
        attachFeedbackToEvent(workshop.toObject(), "Workshop")
      )
    );

    res.json(workshopsWithFeedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getWorkshop2 = async (req, res) => {
  try {
    const { id } = req.params; // Assuming the user ID is passed as a parameter

    const workshops = await Workshop.find({ createdBy: id }); // Assuming 'createdBy' field stores the user ID

    if (!workshops || workshops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No workshops found for this user",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workshops retrieved successfully",
      data: workshops,
    });
  } catch (error) {
    console.error("Error getting workshops:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving workshops",
      error: error.message,
    });
  }
};

export const getConferences = async (req, res) => {
  try {
    const conferences = await Conference.find({ archived: { $ne: true } });
    const visibleConferences = filterEventsForUser(conferences, req);

    // Attach ratings and comments to each conference
    const conferencesWithFeedback = await Promise.all(
      visibleConferences.map((conference) =>
        attachFeedbackToEvent(conference.toObject(), "Conference")
      )
    );

    res.json(conferencesWithFeedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// GET /api/events/recommended
export const getRecommendedEvents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const now = new Date();
    const userRole = resolveUserRole(req);
    if (userRole === "Admin" || userRole === "Event Office") {
      return res.json({ recommended: [] });
    }
    const userProfile = await fetchRegistrantProfile(userId, userRole);
    const userEmail = (userProfile?.email || req.user?.email || "").toLowerCase();

    // Collect user history
    const [pastTrips, pastWorkshops, pastBazaars] = await Promise.all([
      Trip.find({
        "registrants.user": userId,
        startDate: { $lte: now },
      }).select("location registrants"),
      Workshop.find({
        "registrants.user": userId,
        startDate: { $lte: now },
        approvalStatus: { $ne: "rejected" },
      }).select("professors facultyResponsible registrants"),
      Bazaar.find({
        startDate: { $lte: now },
        archived: { $ne: true },
      }).select("vendorRequests startDate"),
    ]);

    const tripLocations = new Set(
      pastTrips
        .map((t) => (t.location || "").toLowerCase().trim())
        .filter(Boolean)
    );

    const pastWorkshopInstructors = new Set();
    pastWorkshops.forEach((w) => {
      (w.professors || []).forEach((prof) => {
        const key = String(prof || "").toLowerCase().trim();
        if (key) pastWorkshopInstructors.add(key);
      });
      if (w.facultyResponsible) {
        pastWorkshopInstructors.add(
          String(w.facultyResponsible).toLowerCase().trim()
        );
      }
    });

    const seenVendors = new Set();
    pastBazaars.forEach((bazaar) => {
      const requests = Array.isArray(bazaar.vendorRequests)
        ? bazaar.vendorRequests
        : [];
      const userWasThere = requests.some((request) => {
        const vendorMatch =
          request.vendor && String(request.vendor) === String(userId);
        const attendeeMatch =
          userEmail &&
          Array.isArray(request.attendees) &&
          request.attendees.some(
            (att) =>
              att?.email && att.email.toLowerCase().trim() === userEmail
          );
        return vendorMatch || attendeeMatch;
      });
      if (userWasThere) {
        requests.forEach((req) => {
          if (req.vendor) seenVendors.add(String(req.vendor));
        });
      }
    });

    // Upcoming events
    const [upcomingBazaars, upcomingTrips, upcomingWorkshops] =
      await Promise.all([
        Bazaar.find({
          archived: { $ne: true },
          startDate: { $gt: now },
        }),
        Trip.find({
          archived: { $ne: true },
          startDate: { $gt: now },
        }),
        Workshop.find({
          archived: { $ne: true },
          startDate: { $gt: now },
          approvalStatus: { $ne: "rejected" },
        }),
      ]);

    const bazaarRecsRaw = filterEventsForUser(upcomingBazaars, req).filter(
      (bazaar) => {
        const requests = Array.isArray(bazaar.vendorRequests)
          ? bazaar.vendorRequests
          : [];
        return requests.some(
          (req) => req.vendor && seenVendors.has(String(req.vendor))
        );
      }
    );

    const tripRecsRaw = filterEventsForUser(upcomingTrips, req).filter(
      (trip) => {
        const loc = (trip.location || "").toLowerCase().trim();
        if (!loc || !tripLocations.has(loc)) return false;
        const alreadyRegistered = Array.isArray(trip.registrants)
          ? trip.registrants.some(
              (r) => String(r.user) === String(userId)
            )
          : false;
        return !alreadyRegistered;
      }
    );

    const workshopRecsRaw = filterEventsForUser(
      upcomingWorkshops,
      req
    ).filter((workshop) => {
      const alreadyRegistered = Array.isArray(workshop.registrants)
        ? workshop.registrants.some(
            (r) => String(r.user) === String(userId)
          )
        : false;
      if (alreadyRegistered) return false;
      const instructors = new Set(
        (workshop.professors || []).map((p) =>
          String(p || "").toLowerCase().trim()
        )
      );
      if (workshop.facultyResponsible) {
        instructors.add(
          String(workshop.facultyResponsible).toLowerCase().trim()
        );
      }
      return Array.from(instructors).some((ins) =>
        pastWorkshopInstructors.has(ins)
      );
    });

    // Look up vendor names for reasons
    const vendorDocs = await Vendor.find({
      _id: { $in: Array.from(seenVendors) },
    })
      .select("companyName")
      .lean();
    const vendorNameById = vendorDocs.reduce((acc, v) => {
      acc[String(v._id)] = v.companyName || "Vendor";
      return acc;
    }, {});

    const [bazaarRecs, tripRecs, workshopRecs] = await Promise.all([
      Promise.all(
        bazaarRecsRaw.map(async (bazaar) => {
          const matchedVendorNames = [];
          const requests = Array.isArray(bazaar.vendorRequests)
            ? bazaar.vendorRequests
            : [];
          requests.forEach((req) => {
            const vendorId = req.vendor ? String(req.vendor) : null;
            if (vendorId && seenVendors.has(vendorId)) {
              matchedVendorNames.push(vendorNameById[vendorId] || "Vendor");
            }
          });
          const reasonVendors = Array.from(new Set(matchedVendorNames));
          const obj = await attachFeedbackToEvent(
            bazaar.toObject(),
            "Bazaar"
          );
          return {
            ...obj,
            type: "Bazaar",
            isRecommended: true,
            recommendationReason:
              reasonVendors.length > 0
                ? `You previously visited a bazaar with ${reasonVendors
                    .slice(0, 3)
                    .join(", ")}.`
                : "You have seen vendors from this bazaar before.",
          };
        })
      ),
      Promise.all(
        tripRecsRaw.map(async (trip) => {
          const obj = await attachFeedbackToEvent(trip.toObject(), "Trip");
          return {
            ...obj,
            type: "Trip",
            isRecommended: true,
            recommendationReason: trip.location
              ? `You joined a trip to ${trip.location} before.`
              : "You joined a similar trip before.",
          };
        })
      ),
      Promise.all(
        workshopRecsRaw.map(async (workshop) => {
          const instructors = new Set(
            (workshop.professors || []).map((p) =>
              String(p || "").trim()
            )
          );
          if (workshop.facultyResponsible) {
            instructors.add(String(workshop.facultyResponsible).trim());
          }
          const matchingInstructors = Array.from(instructors).filter((ins) =>
            pastWorkshopInstructors.has(ins.toLowerCase())
          );
          const obj = await attachFeedbackToEvent(
            workshop.toObject(),
            "Workshop"
          );
          return {
            ...obj,
            type: "Workshop",
            isRecommended: true,
            recommendationReason:
              matchingInstructors.length > 0
                ? `You attended a workshop with ${matchingInstructors
                    .slice(0, 3)
                    .join(", ")} before.`
                : "You attended a workshop with this instructor before.",
          };
        })
      ),
    ]);

    const combined = [...bazaarRecs, ...tripRecs, ...workshopRecs];
    const deduped = [];
    const seen = new Set();
    combined.forEach((ev) => {
      const id = String(ev._id || ev.id || ev.eventId || "");
      if (!id || seen.has(id)) return;
      seen.add(id);
      deduped.push(ev);
    });

    // Sort by start date ascending for a consistent UX
    deduped.sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return aDate - bDate;
    });

    return res.json({ recommended: deduped });
  } catch (err) {
    console.error("Error fetching recommended events:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/events/my-attended
// Returns workshops, trips, and conferences the current user registered to and whose startDate has passed
export const getMyAttended = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const workshops = await Workshop.find({
      "registrants.user": userId,
      startDate: { $lte: now },
    }).sort({ startDate: -1 });

    const trips = await Trip.find({
      "registrants.user": userId,
      startDate: { $lte: now },
    }).sort({ startDate: -1 });

    const conferences = await Conference.find({
      startDate: { $lte: now },
    }).sort({ startDate: -1 });

    return res.json({ workshops, trips, conferences });
  } catch (err) {
    console.error("Error fetching attended events:", err);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/events/my-attended
// Returns workshops, trips, and conferences the current user registered to and whose startDate has passed

// PATCH: update conference by id (partial update)
export const editConference = async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the current conference to check its start date
    const currentConference = await Conference.findById(id);
    if (!currentConference) {
      return res.status(404).json({ message: "Conference not found" });
    }

    // Check if conference has already started (start date has passed)
    const currentDate = new Date();
    if (
      currentConference.startDate &&
      currentConference.startDate < currentDate
    ) {
      return res.status(400).json({
        message: "Cannot update conference: start date has already passed",
      });
    }

    // Only allow known fields to be updated
    const allowedFields = [
      "name",
      "shortDescription",
      "agenda",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "website",
      "budget",
      "fundingSource",
      "extraResources",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "allowedRoles")) {
      update.allowedRoles = resolveAllowedRolesInput(req.body.allowedRoles);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const nextStartDate = update.startDate || currentBazaar.startDate;
    const nextStartTime = update.startTime || currentBazaar.startTime;
    if (
      Object.prototype.hasOwnProperty.call(update, "registrationDeadline")
    ) {
      const normalizedDeadline = normalizeRegistrationDeadline(
        update.registrationDeadline,
        nextStartDate,
        nextStartTime
      );
      update.registrationDeadline = normalizedDeadline ?? null;
    }

    // If updating startDate, check if the new start date is in the past
    if (update.startDate && new Date(update.startDate) < currentDate) {
      return res.status(400).json({
        message: "Cannot set start date in the past",
      });
    }

    const updatedConference = await Conference.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedConference) {
      return res.status(404).json({ message: "Conference not found" });
    }

    res.status(200).json({
      message: "Conference updated successfully",
      conference: updatedConference,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// PATCH: update workshop by id (partial update)
export const editWorkshop = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the current workshop
    const currentWorkshop = await Workshop.findById(id);
    if (!currentWorkshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }

    const normalizedUserRole = normalizeRoleName(req.user?.role);
    const privilegedRoles = ["Event Office", "Admin"];

    // Prevent editing after start date has passed
    const currentDate = new Date();
    if (currentWorkshop.startDate && currentWorkshop.startDate < currentDate) {
      return res.status(400).json({
        message: "Cannot update workshop: start date has already passed",
      });
    }

    // ✅ Allowed fields for update
    const allowedFields = [
      "name",
      "shortDescription",
      "agenda",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "location",
      "facultyResponsible",
      "professors",
      "budget",
      "fundingSource",
      "extraResources",
      "capacity",
      "registrationDeadline",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "allowedRoles")) {
      if (!privilegedRoles.includes(normalizedUserRole)) {
        return res.status(403).json({
          message: "Only Event Office or Admin can update workshop access.",
        });
      }
      update.allowedRoles = resolveAllowedRolesInput(req.body.allowedRoles);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const nextStartDate = update.startDate || currentWorkshop.startDate;
    const nextStartTime = update.startTime || currentWorkshop.startTime;
    if (
      Object.prototype.hasOwnProperty.call(update, "registrationDeadline")
    ) {
      const normalizedDeadline = normalizeRegistrationDeadline(
        update.registrationDeadline,
        nextStartDate,
        nextStartTime
      );
      update.registrationDeadline = normalizedDeadline ?? null;
    }

    const userRole = req.user?.role || "unknown";
    const hasPaidRegistrants = Array.isArray(currentWorkshop.registrants)
      ? currentWorkshop.registrants.some(
          (registrant) => registrant.payment?.status === "paid"
        )
      : false;

    if (hasPaidRegistrants && !privilegedRoles.includes(userRole)) {
      const softEditableFields = [
        "shortDescription",
        "agenda",
        "extraResources",
      ];
      const attemptedDisallowedFields = Object.keys(update).filter(
        (field) => !softEditableFields.includes(field)
      );
      if (attemptedDisallowedFields.length > 0) {
        return res.status(400).json({
          message:
            "This workshop already has paid attendees. Contact event office for further edits.",
          blockedFields: attemptedDisallowedFields,
        });
      }
    }

    // Prevent setting start date in the past
    if (update.startDate && new Date(update.startDate) < currentDate) {
      return res.status(400).json({
        message: "Cannot set start date in the past",
      });
    }

    const shouldResetApproval = Object.keys(update).some(
      (field) => field !== "allowedRoles"
    );

    if (shouldResetApproval) {
      // ✅ reset approval when core details change
      update.approvalStatus = "pending";
      update.reviewedBy = null;
      update.reviewedAt = null;
      update.rejectionReason = null;
      update.editRequestComments = null;
    }

    const updatedWorkshop = await Workshop.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedWorkshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }

    res.status(200).json({
      message:
        "Workshop updated successfully. Approval status reset to pending.",
      workshop: updatedWorkshop,
    });
  } catch (err) {
    console.error("Error editing workshop:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// PATCH: update bazaar by id (partial update)
export const editBazaar = async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the current bazaar to check its start date
    const currentBazaar = await Bazaar.findById(id);
    if (!currentBazaar) {
      return res.status(404).json({ message: "Bazaar not found" });
    }

    // Check if bazaar has already started (start date has passed)
    const currentDate = new Date();
    if (currentBazaar.startDate && currentBazaar.startDate < currentDate) {
      return res.status(400).json({
        message: "Cannot update bazaar: start date has already passed",
      });
    }

    // Only allow known fields to be updated
    const allowedFields = [
      "name",
      "location",
      "shortDescription",
      "registrationDeadline",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "price2x2",
      "price4x4",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "allowedRoles")) {
      update.allowedRoles = resolveAllowedRolesInput(req.body.allowedRoles);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // If updating startDate, check if the new start date is in the past
    if (update.startDate && new Date(update.startDate) < currentDate) {
      return res.status(400).json({
        message: "Cannot set start date in the past",
      });
    }

    if (
      (update.price2x2 !== undefined && Number(update.price2x2) < 0) ||
      (update.price4x4 !== undefined && Number(update.price4x4) < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Booth prices must be zero or greater" });
    }

    const updatedBazaar = await Bazaar.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedBazaar) {
      return res.status(404).json({ message: "Bazaar not found" });
    }

    res
      .status(200)
      .json({ message: "Bazaar updated successfully", bazaar: updatedBazaar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const commonFilter = { archived: { $ne: true } };
    const bazaars = await Bazaar.find(commonFilter);
    let workshops = await Workshop.find(commonFilter);
    const trips = await Trip.find(commonFilter);
    const conferences = await Conference.find(commonFilter);
    const userRole = resolveUserRole(req);

    // If the user is a student, filter out rejected workshops
    if (userRole === "Student") {
      workshops = workshops.filter((w) => w.approvalStatus !== "rejected");
    }

    // Attach ratings and comments to all event types
    const bazaarsWithFeedback = await Promise.all(
      filterEventsForRole(bazaars, userRole).map((bazaar) =>
        attachFeedbackToEvent(bazaar.toObject(), "Bazaar")
      )
    );

    const workshopsWithFeedback = await Promise.all(
      filterEventsForRole(workshops, userRole).map((workshop) =>
        attachFeedbackToEvent(workshop.toObject(), "Workshop")
      )
    );

    const tripsWithFeedback = await Promise.all(
      filterEventsForRole(trips, userRole).map((trip) =>
        attachFeedbackToEvent(trip.toObject(), "Trip")
      )
    );

    const conferencesWithFeedback = await Promise.all(
      filterEventsForRole(conferences, userRole).map((conference) =>
        attachFeedbackToEvent(conference.toObject(), "Conference")
      )
    );

    res.json({
      bazaars: bazaarsWithFeedback,
      workshops: workshopsWithFeedback,
      trips: tripsWithFeedback,
      conferences: conferencesWithFeedback,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// PATCH: archive an event by id (soft-hide from listings)
export const archiveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user || {};

    if (!requester || requester.role !== "Event Office") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const now = new Date();
    const markArchivedIfPast = async (doc) => {
      if (!doc) return null;
      const end = doc.endDate || doc.startDate;
      if (!end || end > now) {
        return { error: true, reason: "Event has not passed yet" };
      }
      if (doc.archived === true) {
        return { error: true, reason: "Event already archived" };
      }
      doc.archived = true;
      await doc.save();
      return doc;
    };

    let doc = await Bazaar.findById(id);
    if (doc) {
      const resDoc = await markArchivedIfPast(doc);
      if (resDoc?.error)
        return res.status(400).json({ message: resDoc.reason });
      return res.json({ message: "Bazaar archived" });
    }
    doc = await Conference.findById(id);
    if (doc) {
      const resDoc = await markArchivedIfPast(doc);
      if (resDoc?.error)
        return res.status(400).json({ message: resDoc.reason });
      return res.json({ message: "Conference archived" });
    }
    doc = await Workshop.findById(id);
    if (doc) {
      const resDoc = await markArchivedIfPast(doc);
      if (resDoc?.error)
        return res.status(400).json({ message: resDoc.reason });
      return res.json({ message: "Workshop archived" });
    }
    doc = await Trip.findById(id);
    if (doc) {
      const resDoc = await markArchivedIfPast(doc);
      if (resDoc?.error)
        return res.status(400).json({ message: resDoc.reason });
      return res.json({ message: "Trip archived" });
    }

    return res.status(404).json({ message: "Event not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// GET: export registrants for an event (Trip | Workshop | Bazaar) as .xlsx
export const exportRegistrants = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || {};
    if (!user || user.role !== "Event Office") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // detect event type by id
    let event = await Trip.findById(id).populate(
      "registrants.user",
      "firstName lastName email UniId name"
    );
    let type = "Trip";
    if (!event) {
      event = await Workshop.findById(id).populate(
        "registrants.user",
        "firstName lastName email UniId name"
      );
      type = "Workshop";
    }
    if (!event) {
      // For bazaars we export accepted vendors and their attendees
      event = await Bazaar.findById(id).populate({
        path: "vendorRequests.vendor",
        select: "companyName email",
      });
      type = "Bazaar";
    }

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (type === "Conference") {
      return res
        .status(400)
        .json({ message: "Export not supported for conferences" });
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`${type} Registrants`);
    ws.columns = [
      { header: "Event Name", key: "eventName", width: 30 },
      { header: "Type", key: "type", width: 12 },
      { header: "Name", key: "name", width: 28 },
      { header: "Email", key: "email", width: 30 },
      { header: "UniId / Company", key: "idOrCompany", width: 22 },
      { header: "Role", key: "role", width: 14 },
      { header: "Registered At", key: "registeredAt", width: 24 },
    ];

    const pushRow = (row) => ws.addRow(row);

    if (type === "Trip" || type === "Workshop") {
      const list = Array.isArray(event.registrants) ? event.registrants : [];
      for (const reg of list) {
        const u = reg.user || {};
        const fullName =
          [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "";
        pushRow({
          eventName: event.name || "",
          type,
          name: fullName,
          email: u.email || "",
          idOrCompany: u.UniId || "",
          role: reg.userType || "",
          registeredAt: reg.registeredAt
            ? new Date(reg.registeredAt).toISOString()
            : "",
        });
      }
    } else if (type === "Bazaar") {
      const requests = Array.isArray(event.vendorRequests)
        ? event.vendorRequests
        : [];
      for (const req of requests) {
        // export accepted vendors and their attendees as "registered"
        if (req.status !== "accepted") continue;
        const vendor = req.vendor || {};
        const attendees = Array.isArray(req.attendees) ? req.attendees : [];
        if (attendees.length === 0) {
          // still add vendor row even if no attendees
          pushRow({
            eventName: event.name || "",
            type,
            name: vendor.companyName || "",
            email: vendor.email || "",
            idOrCompany: vendor.companyName || "",
            role: "Vendor",
            registeredAt: req.appliedAt
              ? new Date(req.appliedAt).toISOString()
              : "",
          });
        } else {
          for (const a of attendees) {
            pushRow({
              eventName: event.name || "",
              type,
              name: a.name || "",
              email: a.email || "",
              idOrCompany: vendor.companyName || "",
              role: "Vendor Attendee",
              registeredAt: req.appliedAt
                ? new Date(req.appliedAt).toISOString()
                : "",
            });
          }
        }
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const safeName = String(event.name || type || "event").replace(
      /[^a-z0-9_-]+/gi,
      "_"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_registrants.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

function toDateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime(); // numeric for easy compare
}
export const bookBooth = async (req, res) => {
  try {
    // ---- Parse & normalize input ----
    const {
      location: rawLocation,
      startDate: rawStartDate,
      duration: rawDuration,
      vendor,
      companyName,
      boothId,
    } = req.body;

    // attendees may be sent as JSON string or as an array
    let attendees = req.body.attendees || [];
    if (typeof attendees === "string") {
      try {
        attendees = JSON.parse(attendees);
      } catch {
        attendees = [];
      }
    }
    if (!Array.isArray(attendees)) attendees = [];

    // Attach uploaded id files to attendees (by index) if present
    if (req.files && Array.isArray(req.files.idFiles)) {
      const idFiles = req.files.idFiles;
      for (let i = 0; i < idFiles.length && i < attendees.length; i++) {
        const f = idFiles[i];
        if (!f) continue;
        attendees[i].idDocument = {
          data: f.buffer,
          contentType: f.mimetype,
        };
      }
    }

    // ---- Validate dates & duration ----
    const startDate = new Date(rawStartDate);
    if (Number.isNaN(startDate.getTime())) {
      return res.status(400).json({ message: "Invalid startDate." });
    }

    const weeks = (() => {
      if (typeof rawDuration === "number") return rawDuration;
      if (typeof rawDuration === "string") return parseInt(rawDuration, 10);
      return NaN;
    })();

    if (!Number.isFinite(weeks) || weeks <= 0) {
      return res
        .status(400)
        .json({ message: "Invalid duration. Provide number of weeks." });
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeks * 7);

    // ---- Resolve booth (by id or by location) ----
    const allowedLocations = [
      "north",
      "south",
      "east",
      "west",
      "north-east",
      "north-west",
      "south-east",
      "south-west",
    ];

    let selectedBooth = null;
    let targetLocation = rawLocation;

    if (boothId) {
      selectedBooth = await Booth.findById(boothId);
      if (!selectedBooth) {
        return res
          .status(404)
          .json({ message: "Selected booth not found. Please refresh." });
      }
      targetLocation = selectedBooth.location;
    } else {
      if (!allowedLocations.includes(rawLocation)) {
        return res.status(400).json({
          message: `Invalid location. Allowed locations are: ${allowedLocations.join(", ")}`,
        });
      }
      // Pick any booth in that location (you can adjust criteria here if needed)
      selectedBooth = await Booth.findOne({ location: rawLocation });
      if (!selectedBooth) {
        return res.status(404).json({
          message: `No booths available in ${rawLocation}. Please contact event office.`,
        });
      }
    }

    // ---- Pricing snapshot ----
    const pricePerWeek = Number(selectedBooth.pricePerWeek) || 0;
    const boothPrice = pricePerWeek * weeks;

    // ---- Overlap check (same booth, overlapping window, relevant statuses) ----
    const overlappingBooking = await BoothBooking.findOne({
      booth: selectedBooth._id,
      status: { $in: ["approved", "awaiting_payment"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: `Booth at '${targetLocation}' is already booked between ${new Date(
          overlappingBooking.startDate
        ).toDateString()} and ${new Date(overlappingBooking.endDate).toDateString()}.`,
      });
    }

    // ---- Create booking ----
    const booking = new BoothBooking({
      booth: selectedBooth._id,
      vendor,
      companyName,
      startDate,
      endDate,
      duration: `${weeks} week${weeks > 1 ? "s" : ""}`,
      attendees,
      pricePerWeekSnapshot: pricePerWeek,
      boothPrice,
      status: "pending",
      payment: {
        status: "pending",
        amountDue: boothPrice,
        amountPaid: 0,
        currency: "EGP",
      },
    });

    await booking.save();
    const fakeReq = {
      user: req.user,
      body: {
        data: {
          vendorId: vendor, // ObjectId of the vendor
          companyName, // vendor's company name
          bookingId: booking._id, // so EO can click/open this request
        },
      },
    };
    const fakeRes = makeFakeRes();
    await notifyPendingVendorRequests(fakeReq, fakeRes);
    if (fakeRes._status >= 400) {
      console.error("[notif error pending vendor]:", fakeRes._json);
    }
    res.status(201).json({
      message:
        "Booth booking application submitted successfully. Event office will review and approve if space is available.",
      booking,
    });
  } catch (error) {
    console.error("Error in bookBooth:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Helper function to process waiting list when a booking is approved or deleted
export const processWaitingList = async (boothId) => {
  try {
    // Find the next person in waiting list for this booth
    const nextInWaitingList = await BoothBooking.findOne({
      booth: boothId,
      isWaitingList: true,
      status: "pending",
    }).sort({ waitingListPosition: 1 });

    if (nextInWaitingList) {
      // Check if the booth is now available for this waiting list entry
      const startDate = nextInWaitingList.startDate;
      const endDate = nextInWaitingList.endDate;

      const conflictingBooking = await BoothBooking.findOne({
        booth: boothId,
        status: { $in: ["approved", "awaiting_payment"] },
        $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
      });

      if (!conflictingBooking) {
        // Booth is available, move from waiting list to regular booking
        nextInWaitingList.isWaitingList = false;
        nextInWaitingList.waitingListPosition = undefined;
        await nextInWaitingList.save();

        // Update positions of remaining waiting list entries
        await updateWaitingListPositions(boothId);
      }
    }
  } catch (error) {
    console.error("Error processing waiting list:", error);
  }
};

// Helper function to update waiting list positions
export const updateWaitingListPositions = async (boothId) => {
  try {
    const waitingListEntries = await BoothBooking.find({
      booth: boothId,
      isWaitingList: true,
      status: "pending",
    }).sort({ waitingListPosition: 1 });

    for (let i = 0; i < waitingListEntries.length; i++) {
      waitingListEntries[i].waitingListPosition = i + 1;
      await waitingListEntries[i].save();
    }
  } catch (error) {
    console.error("Error updating waiting list positions:", error);
  }
};

// Approve a booth booking
export const approveBoothBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { approvedBy } = req.body;

    const booking = await BoothBooking.findById(bookingId).populate("booth");
    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found" });
    }

    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Booking is not pending approval" });
    }

    // Check if booth is still available for the requested dates
    const conflictingBooking = await BoothBooking.findOne({
      booth: booking.booth,
      status: { $in: ["approved", "awaiting_payment"] },
      _id: { $ne: bookingId }, // Exclude current booking
      $or: [
        {
          startDate: { $lte: booking.endDate },
          endDate: { $gte: booking.startDate },
        },
      ],
    });

    if (conflictingBooking) {
      return res.status(400).json({
        message:
          "Cannot approve: Booth is no longer available for the requested dates. Another booking has been approved in the meantime.",
      });
    }

    const vendorDoc = await Vendor.findById(booking.vendor);
    if (!vendorDoc) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const weeksMatch =
      typeof booking.duration === "string"
        ? booking.duration.match(/\d+/)
        : null;
    const weeks = weeksMatch ? Number(weeksMatch[0]) || 1 : 1;

    if (!booking.pricePerWeekSnapshot || booking.pricePerWeekSnapshot <= 0) {
      const boothDetails = await Booth.findById(booking.booth).lean();
      booking.pricePerWeekSnapshot = Number(boothDetails?.pricePerWeek) || 0;
    }

    if (!booking.boothPrice || booking.boothPrice <= 0) {
      booking.boothPrice = booking.pricePerWeekSnapshot * weeks;
    }

    const paymentDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    booking.status = "awaiting_payment";
    booking.approvedBy = approvedBy;
    booking.approvedAt = new Date();
    booking.paymentDeadline = paymentDeadline;
    booking.paymentIntentId = null;
    booking.payment = {
      ...(booking.payment || {}),
      status: "awaiting_payment",
      amountDue: booking.boothPrice,
      amountPaid: booking.payment?.amountPaid || 0,
      method: null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      deadline: paymentDeadline,
      currency: booking.payment?.currency || "egp",
    };

    await booking.save();

    const boothName = booking.booth?.boothName || "your requested booth";
    const dateRange = `${formatDate(booking.startDate)} - ${formatDate(
      booking.endDate
    )}`;
    await sendEmail({
      to: vendorDoc.email,
      subject: "Booth booking approved",
      text: `Hello ${vendorDoc.companyName || "Vendor"},

Your booth booking for ${boothName} has been approved.

Booking details:
- Location: ${booking.booth?.location || "TBD"}
- Duration: ${booking.duration}
- Dates: ${dateRange}

Please make sure your team is ready for booth handover on the start date. Reply to this email if you need any additional assistance.

Regards,
GUC Events Team`,
    });

    res.status(200).json({
      message: "Booth booking approved. Awaiting vendor payment.",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject a booth booking
export const rejectBoothBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rejectionReason } = req.body;

    const booking = await BoothBooking.findById(bookingId).populate("booth");
    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found" });
    }

    if (booking.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Booking is not pending approval" });
    }

    // Update booking status
    booking.status = "rejected";
    booking.rejectionReason = rejectionReason;

    await booking.save();

    const vendorDoc = await Vendor.findById(booking.vendor);
    if (vendorDoc?.email) {
      const boothName = booking.booth?.boothName || "the requested booth";
      const reasonText = rejectionReason
        ? `Reason provided: ${rejectionReason}\n\n`
        : "";
      await sendEmail({
        to: vendorDoc.email,
        subject: "Booth booking update",
        text: `Hello ${vendorDoc.companyName || "Vendor"},

Thank you for applying for ${boothName}. After reviewing all submissions, we are unable to approve this booking.

${reasonText}Please feel free to submit another request with different dates or a different booth if you are still interested.

Regards,
GUC Events Team`,
      });
    }

    res.status(200).json({
      message: "Booth booking rejected",
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const cancelBoothBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const requesterId =
      req.user?._id?.toString?.() || req.user?.id || req.user?._id;
    const role = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const allowedRoles = ["Vendor", "Admin", "EventOffice"];
    if (!allowedRoles.includes(role)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to cancel booking." });
    }

    const booking = await BoothBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found" });
    }

    if (
      role === "Vendor" &&
      booking.vendor.toString() !== String(requesterId)
    ) {
      return res.status(403).json({
        message: "You can only cancel your own booth applications.",
      });
    }

    if (!["pending", "awaiting_payment"].includes(booking.status)) {
      return res.status(400).json({
        message:
          "Only pending or awaiting payment bookings can be cancelled by the vendor.",
      });
    }

    booking.status = "cancelled";
    booking.paymentDeadline = null;
    booking.paymentIntentId = null;
    booking.payment = {
      ...(booking.payment || {}),
      status: "cancelled",
      deadline: null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
    };
    booking.cancelledAt = new Date();

    await booking.save();
    await processWaitingList(booking.booth);

    res.status(200).json({ message: "Booth booking cancelled successfully." });
  } catch (error) {
    console.error("Error cancelling booth booking:", error);
    res.status(500).json({
      message: "Failed to cancel booth booking",
      error: error.message,
    });
  }
};

export const deleteBoothBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const requesterId =
      req.user?._id?.toString?.() || req.user?.id || req.user?._id;
    const role = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const allowedRoles = ["Vendor", "Admin", "EventOffice"];
    if (!allowedRoles.includes(role)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to remove this booking." });
    }

    const booking = await BoothBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found" });
    }

    if (
      role === "Vendor" &&
      booking.vendor.toString() !== String(requesterId)
    ) {
      return res.status(403).json({
        message: "You can only remove your own booth applications.",
      });
    }

    const status = String(booking.status || "").toLowerCase();
    if (!["cancelled", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Only cancelled or rejected bookings can be removed.",
      });
    }

    await BoothBooking.findByIdAndDelete(bookingId);
    res.status(200).json({ message: "Booth booking removed." });
  } catch (error) {
    console.error("Error deleting booth booking:", error);
    res.status(500).json({
      message: "Failed to delete booth booking",
      error: error.message,
    });
  }
};

// Get all pending booth bookings for event office review
export const getPendingBoothBookings = async (req, res) => {
  try {
    const pendingBookings = await BoothBooking.find({ status: "pending" })
      .populate("booth", "location boothName size")
      .populate("vendor", "companyName email")
      .sort({ createdAt: 1 });

    res.status(200).json({
      count: pendingBookings.length,
      bookings: pendingBookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get booth booking by ID
export const getBoothBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await BoothBooking.findById(bookingId)
      .populate("booth", "location boothName size")
      .populate("vendor", "companyName email")
      .populate("approvedBy", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found" });
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all booth bookings (for admin)
export const getAllBoothBookings = async (req, res) => {
  try {
    const bookings = await BoothBooking.find()
      .populate("booth", "location boothName size")
      .populate("vendor", "companyName email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get booth bookings by vendor
export const getBoothBookingsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const bookings = await BoothBooking.find({ vendor: vendorId })
      .populate("booth", "location boothName size")
      .populate("vendor", "companyName email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBooths = async (req, res) => {
  try {
    const booths = await Booth.find().sort({ location: 1, boothName: 1 });

    res.status(200).json({
      count: booths.length,
      booths,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
export const approveWorkshop = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user; // from auth middleware
    const { priceToAttend } = req.body;

    const workshop = await Workshop.findById(id);
    if (!workshop)
      return res.status(404).json({ message: "Workshop not found" });

    if (
      workshop.approvalStatus !== "pending" &&
      workshop.approvalStatus !== "needs_edits"
    ) {
      return res.status(400).json({ message: "Workshop already processed" });
    }

    const normalizedPrice =
      priceToAttend === undefined ||
      priceToAttend === null ||
      priceToAttend === ""
        ? null
        : Number(priceToAttend);

    if (
      normalizedPrice === null ||
      !Number.isFinite(normalizedPrice) ||
      normalizedPrice < 0
    ) {
      return res.status(400).json({
        message:
          "Participation fee is required when approving and must be a non-negative number.",
      });
    }

    workshop.approvalStatus = "approved";
    workshop.reviewedBy = user?._id;
    workshop.reviewedAt = new Date();
    workshop.rejectionReason = null;
    workshop.editRequestComments = null;
    workshop.priceToAttend = normalizedPrice;

    await workshop.save();
    if (workshop.createdBy) {
      const fakeReqDecision = {
        user: req.user,
        body: {
          professorId: workshop.createdBy,
          decision: "accepted",
          data: {
            eventModel: "Workshop",
            event: workshop._id,
          },
        },
      };
      const fakeResDecision = makeFakeRes();
      await notifyWorkshopDecision(fakeReqDecision, fakeResDecision);
      if (fakeResDecision._status >= 400) {
        console.error(
          "[notif error workshop decision]:",
          fakeResDecision._json
        );
      }
    }

    // 🔔 2) broadcast NEW_EVENT for approved workshop (NOW using allowedRoles)
    const startsAt =
      workshop.startDate && workshop.startTime
        ? mergeDateAndTime(workshop.startDate, workshop.startTime)
        : workshop.startDate
          ? new Date(workshop.startDate)
          : null;

    if (startsAt && startsAt > new Date()) {
      const fakeReqBroadcast = {
        user: req.user,
        body: {
          title: `New Workshop: ${workshop.name}`,
          message: `Workshop approved and open for registration.`,
          allowedRoles: workshop.allowedRoles, // NEW
          data: {
            eventModel: "Workshop",
            event: workshop._id,
            startsAt,
            startTime: workshop.startTime || null, // NEW
            reminderLabel: null,
          },
        },
      };
      const fakeResBroadcast = makeFakeRes();
      await createNewEventBroadcast(fakeReqBroadcast, fakeResBroadcast); // CHANGED
      if (fakeResBroadcast._status >= 400) {
        console.error(
          "[notif error workshop approve broadcast]:",
          fakeResBroadcast._json
        );
      }
    }

    res.status(200).json({
      message: "Workshop approved successfully",
      workshop,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject a workshop
export const rejectWorkshop = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const user = req.user;

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const workshop = await Workshop.findById(id);
    if (!workshop)
      return res.status(404).json({ message: "Workshop not found" });

    workshop.approvalStatus = "rejected";
    workshop.reviewedBy = user?._id;
    workshop.reviewedAt = new Date();
    workshop.rejectionReason = rejectionReason;

    await workshop.save();
    if (workshop.createdBy) {
      const fakeReqDecision = {
        user: req.user,
        body: {
          professorId: workshop.createdBy,
          decision: "rejected",
          data: {
            eventModel: "Workshop",
            event: workshop._id,
          },
          message: `Your workshop "${workshop.name}" was rejected. Reason: ${rejectionReason}`,
        },
      };
      const fakeResDecision = makeFakeRes();
      await notifyWorkshopDecision(fakeReqDecision, fakeResDecision);
      if (fakeResDecision._status >= 400) {
        console.error("[notif error workshop reject]:", fakeResDecision._json);
      }
    }

    res.status(200).json({
      message: "Workshop rejected",
      workshop,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request edits on a workshop
export const requestWorkshopEdits = async (req, res) => {
  try {
    const { id } = req.params;
    const { editRequestComments } = req.body;
    const user = req.user;

    if (!editRequestComments) {
      return res
        .status(400)
        .json({ message: "Edit request comments are required" });
    }

    const workshop = await Workshop.findById(id);
    if (!workshop)
      return res.status(404).json({ message: "Workshop not found" });

    workshop.approvalStatus = "needs_edits";
    workshop.reviewedBy = user?._id;
    workshop.reviewedAt = new Date();
    workshop.editRequestComments = editRequestComments;

    await workshop.save();

    res.status(200).json({
      message: "Edit request sent to professor",
      workshop,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingWorkshops = async (req, res) => {
  try {
    const workshops = await Workshop.find({ approvalStatus: "pending" })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ workshops });
  } catch (error) {
    console.error("Error fetching pending workshops:", error);
    res.status(500).json({ message: "Failed to fetch pending workshops" });
  }
};

export const getWorkshopMessages = async (req, res) => {
  try {
    const professorId = req.user.id; // from authMiddleware

    const workshops = await Workshop.find({
      createdBy: professorId,
      approvalStatus: { $in: ["needs_edits", "rejected"] },
    }).select("name approvalStatus editRequestComments rejectionReason");

    const messages = workshops.map((w) => ({
      _id: w._id,
      name: w.name,
      status: w.approvalStatus,
      message:
        w.approvalStatus === "needs_edits"
          ? w.editRequestComments
          : w.rejectionReason,
    }));

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAcceptedVendors = async (req, res) => {
  try {
    const { bazaarId } = req.params;

    // Find the bazaar and populate vendor references
    const bazaar = await Bazaar.findById(bazaarId)
      .populate({
        path: "vendorRequests.vendor",
        select: "companyName email status",
      })
      .lean();

    if (!bazaar) {
      return res.status(404).json({ message: "Bazaar not found" });
    }

    // Filter accepted vendor requests
    const acceptedVendors = bazaar.vendorRequests
      .filter(
        (req) =>
          ["accepted", "awaiting_payment"].includes(req.status) && req.vendor
      )
      .map((req) => {
        const boothPrice =
          req.boothPrice ??
          (req.boothSize === "4x4" ? bazaar.price4x4 : bazaar.price2x2);
        return {
          companyName: req.vendor.companyName,
          vendorId: req.vendor._id,
          email: req.vendor.email,
          status: req.status,
          boothSize: req.boothSize,
          boothPrice,
        };
      });

    res.json({ bazaarName: bazaar.name, acceptedVendors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

export const dispatchWorkshopCertificates = async (workshopId = null) => {
  const now = new Date();
  const query = workshopId
    ? { _id: workshopId }
    : {
        endDate: { $lte: now },
        "registrants.certificateSent": { $ne: true },
      };

  const workshops = await Workshop.find(query).select(
    "name endDate location registrants"
  );

  for (const workshop of workshops) {
    for (const registrant of workshop.registrants || []) {
      if (registrant.certificateSent) continue;

      const profile = await fetchRegistrantProfile(
        registrant.user,
        registrant.userType
      );
      if (!profile?.email) continue;

      const certificateId = buildCertificateId(workshop._id, registrant.user);
      const completionDate = formatDate(workshop.endDate);

      try {
        await sendEmail({
          to: profile.email,
          subject: `Certificate of Attendance – ${workshop.name}`,
          text: buildCertificateText({
            attendeeName: profile.name,
            roleLabel: profile.role,
            workshopName: workshop.name,
            completionDate,
            location: workshop.location,
            certificateId,
          }),
          html: buildCertificateHtml({
            attendeeName: profile.name,
            roleLabel: profile.role,
            workshopName: workshop.name,
            completionDate,
            location: workshop.location,
            certificateId,
          }),
        });

        await Workshop.updateOne(
          { _id: workshop._id, "registrants.user": registrant.user },
          {
            $set: {
              "registrants.$.certificateSent": true,
              "registrants.$.certificateSentAt": new Date(),
            },
          }
        );

        console.log(
          `Certificate sent to ${profile.email} for workshop ${workshop.name}`
        );
      } catch (err) {
        console.error(
          `Failed to send certificate to ${profile?.email}:`,
          err.message
        );
      }
    }
  }
};

export const sendWorkshopCertificates = () => dispatchWorkshopCertificates();

// ADD event to user's favorites
export const addEventToFavorites = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id; // assuming auth middleware attaches user
    const role = req.user.role; // "Student" or "Faculty"

    const Model = role === "Student" ? Student : Faculty;

    const user = await Model.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Add to favorites (prevent duplicates)
    await Model.updateOne(
      { _id: userId },
      { $addToSet: { favorites: eventId } }
    );

    res.status(200).json({ message: "Event added to favorites" });
  } catch (err) {
    console.error("Error adding to favorites:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// REMOVE event from user's favorites
export const removeEventFromFavorites = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const Model = role === "Student" ? Student : Faculty;

    const user = await Model.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove from favorites
    await Model.updateOne({ _id: userId }, { $pull: { favorites: eventId } });

    res.status(200).json({ message: "Event removed from favorites" });
  } catch (err) {
    console.error("Error removing from favorites:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET user's favorites with full event details
export const getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const Model = role === "Student" ? Student : Faculty;
    const user = await Model.findById(userId).select("favorites");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const favoriteIds = user.favorites || [];

    if (favoriteIds.length === 0) {
      return res.json({ favorites: [] });
    }

    // Search across all event models to find favorite events
    const favorites = [];

    for (const eventId of favoriteIds) {
      // Try Workshop
      let event = await Workshop.findById(eventId).lean();
      if (event) {
        event = await attachFeedbackToEvent(event, "Workshop");
        event.type = "Workshop";
        favorites.push(event);
        continue;
      }

      // Try Trip
      event = await Trip.findById(eventId).lean();
      if (event) {
        event = await attachFeedbackToEvent(event, "Trip");
        event.type = "Trip";
        favorites.push(event);
        continue;
      }

      // Try Conference
      event = await Conference.findById(eventId).lean();
      if (event) {
        event = await attachFeedbackToEvent(event, "Conference");
        event.type = "Conference";
        favorites.push(event);
        continue;
      }

      // Try Bazaar
      event = await Bazaar.findById(eventId).lean();
      if (event) {
        event = await attachFeedbackToEvent(event, "Bazaar");
        event.type = "Bazaar";
        favorites.push(event);
        continue;
      }
    }

    res.json({ favorites });
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// =========================
// FEEDBACK (Ratings & Comments)
// =========================

// Map eventType -> Mongoose model
const getEventModelByType = (eventType) => {
  switch (eventType) {
    case "Workshop":
      return Workshop;
    case "Trip":
      return Trip;
    case "Conference":
      return Conference;
    case "Bazaar":
      return Bazaar;
    default:
      return null;
  }
};

/**
 * Helper function to attach ratings and comments to a workshop/event object
 */
const attachFeedbackToEvent = async (event, eventType = "Workshop") => {
  try {
    if (!event || !event._id) return event;

    const eventId = event._id;

    // Fetch ratings with populated student info
    const ratings = await Rating.find({
      eventId,
      eventType,
    })
      .populate("student", "name email UniId")
      .select("value student createdAt")
      .lean();

    // Fetch comments with populated student info
    const comments = await Comment.find({
      eventId,
      eventType,
    })
      .populate("student", "name email UniId")
      .select("_id text student createdAt rating")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate average rating
    const count = ratings.length;
    const average =
      count > 0
        ? ratings.reduce((s, r) => s + (Number(r.value) || 0), 0) / count
        : 0;

    // Attach to event object
    event.ratings = {
      average,
      count,
      items: ratings,
    };

    event.comments = {
      count: comments.length,
      items: comments,
    };

    return event;
  } catch (err) {
    console.error(`[attachFeedbackToEvent] Error for ${eventType}:`, err);
    // Return event without feedback if there's an error
    event.ratings = { average: 0, count: 0, items: [] };
    event.comments = { count: 0, items: [] };
    return event;
  }
};

// Ensure event exists and has started
const ensureEventStarted = async (eventType, eventId) => {
  const Model = getEventModelByType(eventType);
  if (!Model) return { ok: false, status: 400, message: "Invalid event type" };

  const event = await Model.findById(eventId).select("_id startDate name");
  if (!event) return { ok: false, status: 404, message: "Event not found" };

  // Require event to have started
  if (event.startDate && event.startDate > new Date()) {
    return {
      ok: false,
      status: 400,
      message: "You can rate/comment after the event starts",
    };
  }

  return { ok: true, event };
};

/**
 * POST /api/events/feedback
 * Body: { eventId, eventType, value, comment? }
 * Upserts the student's rating (1..5) and optionally creates a comment.
 */
export const submitFeedback = async (req, res) => {
  try {
    let { eventId, eventType, value, comment } = req.body;
    const student = req.user.id;

    eventType = normalizeEventType(eventType);

    if (!(value >= 1 && value <= 5)) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Convert eventId to ObjectId to ensure consistent storage format
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid eventId format" });
    }
    const eventIdObj = new mongoose.Types.ObjectId(eventId);

    const check = await ensureEventStarted(eventType, eventIdObj);
    if (!check.ok)
      return res.status(check.status).json({ message: check.message });

    console.log(
      `[submitFeedback] Saving rating for eventId: ${eventIdObj.toString()}, eventType: "${eventType}", student: ${student}`
    );

    // Upsert rating (unique: eventId + student) - use ObjectId
    const rating = await Rating.findOneAndUpdate(
      { eventId: eventIdObj, eventType, student },
      { value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let savedComment = null;
    const text = (comment || "").trim();
    if (text) {
      savedComment = await Comment.create({
        eventId: eventIdObj,
        eventType,
        student,
        rating: rating._id,
        text,
      });
      console.log(
        `[submitFeedback] Saved comment for eventId: ${eventIdObj.toString()}`
      );
    }

    return res.status(201).json({
      message: "Feedback saved",
      rating,
      comment: savedComment,
    });
  } catch (err) {
    console.error("[submitFeedback] Error:", err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: "You already rated this event" });
    }
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/events/feedback/ratings/:eventId?eventType=Workshop
 * Returns ratings list + average
 */
export const getEventRatings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventType = normalizeEventType(req.query.eventType);

    if (!eventType) {
      return res
        .status(400)
        .json({ message: "eventType query parameter is required" });
    }

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    // Convert eventId to ObjectId - ensure it matches how it was saved
    let queryEventId;
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      queryEventId = new mongoose.Types.ObjectId(eventId);
    } else {
      console.warn(`Invalid ObjectId format for eventId: ${eventId}`);
      return res.status(400).json({ message: "Invalid eventId format" });
    }

    console.log(
      `[getEventRatings] Querying with eventId: ${queryEventId.toString()}, eventType: "${eventType}"`
    );

    // Query with ObjectId and populate student information
    const ratings = await Rating.find({
      eventId: queryEventId,
      eventType,
    })
      .populate("student", "name email UniId")
      .select("value student createdAt");

    console.log(
      `[getEventRatings] Found ${ratings.length} ratings for eventId: ${queryEventId.toString()}`
    );

    // If no ratings found, try a direct query to see what's in the database
    if (ratings.length === 0) {
      const allRatings = await Rating.find({ eventType })
        .select("eventId eventType value")
        .limit(5);
      console.log(
        `[getEventRatings] Sample ratings in DB for eventType "${eventType}":`,
        allRatings.map((r) => ({
          eventId: r.eventId?.toString(),
          eventType: r.eventType,
          value: r.value,
        }))
      );
    }

    const count = ratings.length;
    const average = count
      ? ratings.reduce((s, r) => s + (Number(r.value) || 0), 0) / count
      : 0;

    return res.json({ count, average, ratings });
  } catch (err) {
    console.error("Error fetching ratings:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/events/feedback/comments/:eventId?eventType=Workshop
 * Returns comments list (newest first)
 */
export const getEventComments = async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventType = normalizeEventType(req.query.eventType);

    if (!eventType) {
      return res
        .status(400)
        .json({ message: "eventType query parameter is required" });
    }

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }

    // Convert eventId to ObjectId - ensure it matches how it was saved
    let queryEventId;
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      queryEventId = new mongoose.Types.ObjectId(eventId);
    } else {
      console.warn(`Invalid ObjectId format for eventId: ${eventId}`);
      return res.status(400).json({ message: "Invalid eventId format" });
    }

    console.log(
      `[getEventComments] Querying with eventId: ${queryEventId.toString()}, eventType: "${eventType}"`
    );

    // Query with ObjectId and populate student information
    const comments = await Comment.find({
      eventId: queryEventId,
      eventType,
    })
      .populate("student", "name email UniId")
      .select("_id text student createdAt rating")
      .sort({ createdAt: -1 });

    console.log(
      `[getEventComments] Found ${comments.length} comments for eventId: ${queryEventId.toString()}`
    );

    // If no comments found, try a direct query to see what's in the database
    if (comments.length === 0) {
      const allComments = await Comment.find({ eventType })
        .select("eventId eventType text")
        .limit(5);
      console.log(
        `[getEventComments] Sample comments in DB for eventType "${eventType}":`,
        allComments.map((c) => ({
          eventId: c.eventId?.toString(),
          eventType: c.eventType,
          text: c.text?.substring(0, 50),
        }))
      );
    }

    return res.json({ count: comments.length, comments });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/events/feedback/comments/:commentId
 * Allows admins to delete any comment + associated rating
 */
export const deleteEventComment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only administrators can delete comments" });
    }

    const { commentId } = req.params;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    await Comment.findByIdAndDelete(commentId);

    let warningEmailSent = false;

    // Always notify the author that the comment was flagged and deleted
    // Include event context (type + id) for clarity
    if (comment.student) {
      // Resolve event name if we can
      let eventName = "";
      try {
        const Model = getEventModelByType(comment.eventType);
        if (Model && mongoose.Types.ObjectId.isValid(comment.eventId)) {
          const ev = await Model.findById(comment.eventId)
            .select("name shortDescription")
            .lean();
          eventName = ev?.name || ev?.shortDescription || "";
        }
      } catch (e) {
        // ignore lookup failures; fallback to id only
      }
      const eventLabel = eventName
        ? `${comment.eventType || "Event"}: ${eventName}`
        : `${comment.eventType || "Event"} (${comment.eventId || "unknown"})`;

      const studentDoc = await Student.findById(comment.student).select(
        "email firstName lastName"
      );
      if (studentDoc?.email) {
        const name =
          [studentDoc.firstName, studentDoc.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() || "there";
        const snippet = (comment.text || "").slice(0, 180);
        await sendEmail({
          to: studentDoc.email,
          subject: "Your comment was removed",
          text: `Hello ${name},

One of your comments was flagged as inappropriate and has been deleted.

Event: ${eventLabel}

Comment:
${snippet}

Please keep future comments respectful. If you believe this was a mistake, contact the Event Office.

Thank you,
GUC Events Team`,
        });
        warningEmailSent = true;
      }
    }

    let ratingRemoved = false;
    if (comment.rating) {
      const removed = await Rating.findByIdAndDelete(comment.rating);
      ratingRemoved = !!removed;
    } else {
      const removed = await Rating.findOneAndDelete({
        eventId: comment.eventId,
        student: comment.student,
        eventType: comment.eventType,
      });
      ratingRemoved = !!removed;
    }

    return res.status(200).json({
      message: "Comment deleted successfully",
      deletedCommentId: commentId,
      ratingRemoved,
      warningEmailSent,
    });
  } catch (err) {
    console.error("[deleteEventComment] Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/events/feedback/me/:eventId?eventType=Workshop
 * Returns my own rating + latest comment (optional helper)
 */
export const getMyFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventType = normalizeEventType(req.query.eventType);
    const student = req.user.id;

    const rating = await Rating.findOne({ eventId, eventType, student });
    const comment = await Comment.findOne({ eventId, eventType, student }).sort(
      { createdAt: -1 }
    );

    return res.json({ rating, comment });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Helper used by polls
const ALLOWED_LOCATIONS = [
  "north",
  "south",
  "east",
  "west",
  "north-east",
  "north-west",
  "south-east",
  "south-west",
];

function addWeeks(dateStr, duration) {
  const weeks = parseInt(String(duration).split(" ")[0] || "0", 10);
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

// =========================
// BOOTH POLLS (Event Office creates; community votes)
// =========================
export const createBoothConflictPoll = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Event Office") {
      return res
        .status(403)
        .json({ message: "Only Event Office can create polls" });
    }
    const { bookingIds = [] } = req.body;
    if (!Array.isArray(bookingIds) || bookingIds.length < 2) {
      return res
        .status(400)
        .json({ message: "Provide at least two bookingIds" });
    }

    // Load bookings with booth + vendor
    const bookings = await BoothBooking.find({ _id: { $in: bookingIds } })
      .populate("booth", "location boothName size")
      .lean();

    if (bookings.length < 2) {
      return res.status(404).json({ message: "Some bookings not found" });
    }

    // Validate same location (ONLY requirement for location)
    const loc = bookings[0]?.booth?.location;
    const sameLocation = bookings.every((b) => b?.booth?.location === loc);
    if (!sameLocation) {
      return res.status(400).json({
        message: "All selected bookings must be in the same location",
      });
    }
    if (!ALLOWED_LOCATIONS.includes(loc)) {
      return res
        .status(400)
        .json({ message: "Invalid booth location for poll" });
    }

    // Helper to parse endDate if missing using duration (in weeks)
    const parseWeeks = (durationStr) => {
      if (typeof durationStr === "number") return durationStr;
      const m = String(durationStr || "").match(/\d+/);
      return m ? parseInt(m[0], 10) : 0;
    };
    const getRange = (b) => {
      const start = new Date(b.startDate);
      let end = b.endDate ? new Date(b.endDate) : null;
      if (!end) {
        const w = parseWeeks(b.duration);
        const e = new Date(start);
        e.setDate(e.getDate() + (w > 0 ? w * 7 : 0));
        end = e;
      }
      return { start, end };
    };

    // Build ranges and detect any overlap between any two bookings
    const ranges = bookings.map(getRange);
    const overlaps = () => {
      for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
          const a = ranges[i];
          const b = ranges[j];
          if (a.start <= b.end && b.start <= a.end) return true;
        }
      }
      return false;
    };

    if (!overlaps()) {
      return res.status(400).json({
        message:
          "No overlapping date ranges between selected bookings. A poll is only needed if any two bookings overlap in time.",
      });
    }

    // Compute overall window for the poll (min start -> max end)
    const minStart = new Date(
      Math.min(...ranges.map((r) => r.start.getTime()))
    );
    const maxEnd = new Date(Math.max(...ranges.map((r) => r.end.getTime())));
    const days = Math.max(
      1,
      Math.ceil((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24))
    );
    const approxWeeks = Math.max(1, Math.ceil(days / 7));
    const durationLabel = `${approxWeeks} week${approxWeeks > 1 ? "s" : ""}`;

    const candidates = bookings.map((b) => {
      const vendorId =
        (b.vendor && b.vendor.toString && b.vendor.toString()) ||
        (typeof b.vendor === "string" ? b.vendor : null);
      if (!vendorId) {
        throw new Error(
          `Missing vendor information for booking ${b._id}. Please ensure each booking still has an associated vendor.`
        );
      }
      return {
        vendor: vendorId,
        booking: b._id,
        companyName: b.companyName || "Vendor",
      };
    });

    const poll = await BoothPoll.create({
      location: loc,
      startDate: minStart,
      endDate: maxEnd,
      duration: durationLabel, // reflect overall window
      candidates,
      createdBy: req.user.id,
    });

    return res.status(201).json({ message: "Poll created", poll });
  } catch (err) {
    console.error("createBoothConflictPoll error:", err);
    const isVendorMissing =
      typeof err.message === "string" &&
      err.message.startsWith("Missing vendor information");
    const statusCode = isVendorMissing ? 400 : 500;
    const message =
      err.message ||
      "Failed to create poll. Please verify selected bookings.";
    return res.status(statusCode).json({ message });
  }
};

export const getBoothPolls = async (_req, res) => {
  try {
    const polls = await BoothPoll.find().sort({ createdAt: -1 }).lean();
    const withTallies = polls.map((p) => {
      const tallies = Object.fromEntries(
        (p.candidates || []).map((c) => [String(c._id), 0])
      );
      (p.votes || []).forEach((v) => {
        const key = String(v.voteFor);
        if (tallies[key] !== undefined) tallies[key]++;
      });
      return { ...p, tallies };
    });
    return res.status(200).json(withTallies);
  } catch (err) {
    console.error("getBoothPolls error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const getBoothPollById = async (req, res) => {
  try {
    const { pollId } = req.params;
    const p = await BoothPoll.findById(pollId).lean();
    if (!p) return res.status(404).json({ message: "Poll not found" });

    const tallies = Object.fromEntries(
      (p.candidates || []).map((c) => [String(c._id), 0])
    );
    (p.votes || []).forEach((v) => {
      const key = String(v.voteFor);
      if (tallies[key] !== undefined) tallies[key]++;
    });
    return res.status(200).json({ ...p, tallies });
  } catch (err) {
    console.error("getBoothPollById error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const voteBoothPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { candidateId } = req.body;

    const poll = await BoothPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    if (poll.status !== "open") {
      return res.status(400).json({ message: "Poll is closed" });
    }

    // Only Students / Faculty / TA / Staff can vote
    const role = req.user?.role || "";
    const allowed = [
      "Student",
      "Faculty",
      "TA",
      "Staff",
      "Professor",
      "Teaching Assistant",
    ];
    if (!allowed.includes(role)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to vote in this poll" });
    }

    const candidateExists = (poll.candidates || []).some(
      (c) => String(c._id) === String(candidateId)
    );
    if (!candidateExists) {
      return res.status(400).json({ message: "Invalid candidate" });
    }

    // Resolve voter email (prefer req.user.email; fallback to Student/Faculty lookup)
    let email = req.user?.email || null;
    if (!email) {
      try {
        if (role === "Student") {
          const s = await Student.findById(req.user.id).select("email").lean();
          email = s?.email || null;
        } else {
          const f = await Faculty.findById(req.user.id).select("email").lean();
          email = f?.email || null;
        }
      } catch {
        // ignore lookup failures; email stays null
      }
    }

    // Upsert vote (one per user)
    const idx = (poll.votes || []).findIndex(
      (v) => String(v.user) === String(req.user.id)
    );
    if (idx >= 0) {
      poll.votes[idx].voteFor = candidateId;
      poll.votes[idx].role = role;
      poll.votes[idx].email = email || poll.votes[idx].email || null;
      poll.votes[idx].createdAt = new Date();
    } else {
      poll.votes.push({
        user: req.user.id,
        role,
        voteFor: candidateId,
        email: email || null,
        createdAt: new Date(),
      });
    }

    await poll.save();
    return res.status(200).json({ message: "Vote recorded" });
  } catch (err) {
    console.error("voteBoothPoll error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const closeBoothPoll = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Event Office") {
      return res
        .status(403)
        .json({ message: "Only Event Office can close polls" });
    }
    const { pollId } = req.params;
    const poll = await BoothPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    poll.status = "closed";
    await poll.save();
    return res.status(200).json({ message: "Poll closed", poll });
  } catch (err) {
    console.error("closeBoothPoll error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const openBoothPoll = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Event Office") {
      return res
        .status(403)
        .json({ message: "Only Event Office can open polls" });
    }
    const { pollId } = req.params;
    const poll = await BoothPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    poll.status = "open";
    await poll.save();
    return res.status(200).json({ message: "Poll opened", poll });
  } catch (err) {
    console.error("openBoothPoll error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Re-add: remove a user's vote from a poll
export const removeBoothPollVote = async (req, res) => {
  try {
    const { pollId } = req.params;
    const role = req.user?.role || "";
    const allowed = [
      "Student",
      "Faculty",
      "TA",
      "Staff",
      "Professor",
      "Teaching Assistant",
    ];
    if (!allowed.includes(role)) {
      return res
        .status(403)
        .json({ message: "You are not allowed to remove votes" });
    }

    const poll = await BoothPoll.findById(pollId);
    if (!poll) return res.status(404).json({ message: "Poll not found" });

    const before = (poll.votes || []).length;
    poll.votes = (poll.votes || []).filter(
      (v) => String(v.user) !== String(req.user.id)
    );

    if ((poll.votes || []).length === before) {
      return res
        .status(404)
        .json({ message: "No existing vote by you in this poll" });
    }

    await poll.save();
    return res.status(200).json({ message: "Vote removed" });
  } catch (err) {
    console.error("removeBoothPollVote error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const deleteBoothPoll = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "Event Office") {
      return res
        .status(403)
        .json({ message: "Only Event Office can delete polls" });
    }
    const { pollId } = req.params;
    const deleted = await BoothPoll.findByIdAndDelete(pollId);
    if (!deleted) return res.status(404).json({ message: "Poll not found" });
    return res.status(200).json({ message: "Poll deleted" });
  } catch (err) {
    console.error("deleteBoothPoll error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// View attendees (Event Office only)
export const getBoothBookingAttendees = async (req, res) => {
  try {
    // allow Event Office and Admin to view attendees
    if (!req.user || !["Event Office", "Admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only Event Office or Admin can view attendees" });
    }
    const { bookingId } = req.params;
    const booking = await BoothBooking.findById(bookingId)
      .select("companyName vendor attendees")
      .populate("vendor", "companyName email")
      .lean();
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const attendees = (booking.attendees || []).map((a, i) => ({
      index: i,
      name: a.name || a.fullName || "Attendee",
      email: a.email || "",
      role: a.role || "",
      hasIdDocument: !!(a.idDocument && a.idDocument.data),
    }));
    return res.status(200).json({
      bookingId,
      vendorCompany:
        booking.vendor?.companyName || booking.companyName || "Vendor",
      attendees,
    });
  } catch (err) {
    console.error("getBoothBookingAttendees error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Get attendee ID (base64) (Event Office only)
export const getBoothBookingAttendeeId = async (req, res) => {
  try {
    // allow Event Office and Admin to view attendee IDs
    if (!req.user || !["Event Office", "Admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only Event Office or Admin can view attendee IDs" });
    }
    const { bookingId, index } = req.params;
    const booking = await BoothBooking.findById(bookingId)
      .select("attendees")
      .lean();
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const i = Number(index);
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i >= (booking.attendees || []).length
    ) {
      return res.status(400).json({ message: "Invalid attendee index" });
    }
    const attendee = booking.attendees[i];
    if (!attendee?.idDocument?.data) {
      return res
        .status(404)
        .json({ message: "ID document not found for attendee" });
    }
    return res.status(200).json({
      contentType:
        attendee.idDocument.contentType || "application/octet-stream",
      data: attendee.idDocument.data.toString("base64"),
    });
  } catch (err) {
    console.error("getBoothBookingAttendeeId error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// Download attendee ID (attachment) (Event Office only)
export const downloadBoothBookingAttendeeId = async (req, res) => {
  try {
    // allow Event Office and Admin to download attendee IDs
    if (!req.user || !["Event Office", "Admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only Event Office or Admin can download attendee IDs",
      });
    }
    const { bookingId, index } = req.params;
    const booking = await BoothBooking.findById(bookingId)
      .select("attendees")
      .lean();
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    const i = Number(index);
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i >= (booking.attendees || []).length
    ) {
      return res.status(400).json({ message: "Invalid attendee index" });
    }
    const attendee = booking.attendees[i];
    if (!attendee?.idDocument?.data) {
      return res
        .status(404)
        .json({ message: "ID document not found for attendee" });
    }
    const ct = attendee.idDocument.contentType || "application/octet-stream";
    const ext = ct.includes("pdf")
      ? ".pdf"
      : ct.includes("png")
        ? ".png"
        : ct.includes("jpeg")
          ? ".jpg"
          : "";
    res.setHeader("Content-Type", ct);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendee-${index}-id${ext}"`
    );
    return res.send(attendee.idDocument.data);
  } catch (err) {
    console.error("downloadBoothBookingAttendeeId error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const sendBazaarVendorQRCodes = async (req, res) => {
  try {
    if (!ensureEventOfficeAccess(req.user)) {
      return res
        .status(403)
        .json({ message: "Only Event Office or Admin can send QR codes." });
    }

    const { bazaarId } = req.params;
    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) {
      return res.status(404).json({ message: "Bazaar not found." });
    }

    const acceptedRequests = (bazaar.vendorRequests || []).filter((request) => {
      const status = String(request?.status || "").toLowerCase();
      return status === "accepted" || status === "approved";
    });

    if (!acceptedRequests.length) {
      return res
        .status(400)
        .json({ message: "No accepted vendors available to send QR codes." });
    }

    const paidVendorRequests = acceptedRequests.filter(
      (request) => !!request.paidAt
    );

    if (!paidVendorRequests.length) {
      return res.status(400).json({
        message:
          "QR codes can only be sent after at least one vendor completes payment.",
      });
    }

    const vendorIds = paidVendorRequests
      .map((request) => request?.vendor)
      .filter(Boolean);

    const vendorDocs = await Vendor.find({
      _id: { $in: vendorIds },
    }).select("companyName email");

    const vendorMap = new Map(
      vendorDocs.map((doc) => [doc._id.toString(), doc])
    );

    const vendorSummaries = paidVendorRequests.map((request) => {
      const vendorDoc = vendorMap.get(request.vendor?.toString());
      return {
        vendorId: request.vendor?.toString(),
        companyName:
          vendorDoc?.companyName || request.companyName || "Registered Vendor",
      };
    });

    const attendeeSummaries = paidVendorRequests.flatMap((request) =>
      (request.attendees || []).map((attendee) => ({
        vendorId: request.vendor?.toString(),
        name: attendee?.name || "Attendee",
        email: attendee?.email || "",
      }))
    );

    let emailsSent = 0;
    for (const request of paidVendorRequests) {
      const vendorDoc = vendorMap.get(request.vendor?.toString());
      if (!vendorDoc?.email) continue;

      const qrPayload = {
        type: "bazaar_vendor_pass",
        bazaarId: bazaar._id.toString(),
        bazaarName: bazaar.name,
        generatedAt: new Date().toISOString(),
        vendorId: request.vendor?.toString(),
        vendors: vendorSummaries,
        attendees: attendeeSummaries,
      };

      const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrPayload));
      const qrCid = `bazaar-${bazaar._id}-vendor-${request.vendor?.toString() || "qr"}`;
      const vendorName =
        vendorDoc.companyName || request.companyName || "Vendor";
      const vendorListHtml = `<ul>${vendorSummaries
        .map(
          (entry) =>
            `<li>${entry.companyName}${
              entry.vendorId === request.vendor?.toString() ? " (you)" : ""
            }</li>`
        )
        .join("")}</ul>`;
      const attendeeListHtml = attendeeSummaries.length
        ? `<ul>${attendeeSummaries
            .map(
              (attendee) =>
                `<li>${attendee.name}${
                  attendee.email ? ` (${attendee.email})` : ""
                }</li>`
            )
            .join("")}</ul>`
        : "<p>No attendees have been registered yet.</p>";

      await sendEmail({
        to: vendorDoc.email,
        subject: `Bazaar QR Code - ${bazaar.name}`,
        text: `Hello ${vendorName},

Your QR code for ${bazaar.name} is ready. Present it on-site during check-in. The QR includes the list of all registered vendors and attendees for this bazaar.

Thank you,
GUC Event Office`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;">
            <p>Hello ${vendorName},</p>
            <p>Your QR code for <strong>${bazaar.name}</strong> is ready. Present it upon arrival for a faster check-in experience. The QR payload includes the full roster of vendors and attendees expected for this bazaar.</p>
            <div style="text-align:center;margin:18px 0;">
              <img src="cid:${qrCid}" alt="Bazaar QR Code" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:12px;" />
            </div>
            <p><strong>Registered Vendors:</strong></p>
            ${vendorListHtml}
            <p><strong>Registered Attendees:</strong></p>
            ${attendeeListHtml}
            <p>We look forward to hosting you,<br/>GUC Event Office</p>
          </div>
        `,
        attachments: [
          {
            filename: "bazaar-qr.png",
            content: qrBuffer,
            cid: qrCid,
          },
        ],
      });

      // Send QR to each attendee under this vendor request
      const attendeeEmails = (request.attendees || [])
        .map((a) => ({
          name: a?.name || "Attendee",
          email: a?.email || "",
        }))
        .filter((a) => a.email);

      for (const attendee of attendeeEmails) {
        await sendEmail({
          to: attendee.email,
          subject: `Bazaar QR Code - ${bazaar.name}`,
          text: `Hello ${attendee.name},

Your QR code for ${bazaar.name} is ready. Present it on-site during check-in.

Thank you,
GUC Event Office`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;">
              <p>Hello ${attendee.name},</p>
              <p>Your QR code for <strong>${bazaar.name}</strong> is ready. Present it upon arrival for a faster check-in experience.</p>
              <div style="text-align:center;margin:18px 0;">
                <img src="cid:${qrCid}" alt="Bazaar QR Code" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:12px;" />
              </div>
              <p>We look forward to hosting you,<br/>GUC Event Office</p>
            </div>
          `,
          attachments: [
            {
              filename: "bazaar-qr.png",
              content: qrBuffer,
              cid: qrCid,
            },
          ],
        });
      }

      emailsSent += 1;
    }

    return res.json({
      message: "Bazaar QR codes dispatched successfully.",
      bazaarId: bazaar._id,
      vendorsProcessed: paidVendorRequests.length,
      emailsSent,
    });
  } catch (error) {
    console.error("sendBazaarVendorQRCodes error:", error);
    return res.status(500).json({
      message: "Failed to send bazaar QR codes",
      error: error.message,
    });
  }
};

export const sendBoothVendorQRCode = async (req, res) => {
  try {
    if (!ensureEventOfficeAccess(req.user)) {
      return res
        .status(403)
        .json({ message: "Only Event Office or Admin can send QR codes." });
    }

    const { bookingId } = req.params;
    const booking = await BoothBooking.findById(bookingId).populate("booth");
    if (!booking) {
      return res.status(404).json({ message: "Booth booking not found." });
    }

    const vendor = await Vendor.findById(booking.vendor).select(
      "companyName email"
    );
    if (!vendor?.email) {
      return res
        .status(400)
        .json({ message: "Vendor record is missing an email address." });
    }

    const attendees = (booking.attendees || []).map((attendee) => ({
      name: attendee?.name || "Attendee",
      email: attendee?.email || "",
    }));

    const qrPayload = {
      type: "booth_vendor_pass",
      boothBookingId: booking._id.toString(),
      boothId:
        booking.booth?._id?.toString() ||
        (booking.booth && booking.booth.toString
          ? booking.booth.toString()
          : null),
      boothName: booking.booth?.name || booking.companyName || "Booth",
      boothLocation: booking.booth?.location || "",
      vendorId: vendor._id.toString(),
      vendorName: vendor.companyName || booking.companyName || "Vendor",
      attendees,
      generatedAt: new Date().toISOString(),
    };

    const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrPayload));
    const qrCid = `booth-${booking._id}-vendor-${vendor._id}`;
    const attendeeListHtml = attendees.length
      ? `<ul>${attendees
          .map(
            (attendee) =>
              `<li>${attendee.name}${
                attendee.email ? ` (${attendee.email})` : ""
              }</li>`
          )
          .join("")}</ul>`
      : "<p>No attendees have been registered yet.</p>";

    await sendEmail({
      to: vendor.email,
      subject: `Booth QR Code - ${booking.companyName || "Your Booth"}`,
      text: `Hello ${vendor.companyName || "Vendor"},

Your QR code for booth booking ${booking._id} is ready. Present it during check-in for you and your listed attendees.

Thank you,
GUC Event Office`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;">
          <p>Hello ${vendor.companyName || "Vendor"},</p>
          <p>Your QR code for booth booking <strong>${
            booking.companyName || booking.booth?.name || booking._id
          }</strong> is ready. Present it upon arrival to cover you and your registered attendees.</p>
          <div style="text-align:center;margin:18px 0;">
            <img src="cid:${qrCid}" alt="Booth QR Code" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:12px;" />
          </div>
          <p><strong>Registered Attendees:</strong></p>
          ${attendeeListHtml}
          <p>Location: ${booking.booth?.location || "TBD"} | Duration: ${
            booking.duration || "N/A"
          }</p>
          <p>See you soon,<br/>GUC Event Office</p>
        </div>
      `,
      attachments: [
        {
          filename: "booth-qr.png",
          content: qrBuffer,
          cid: qrCid,
        },
      ],
    });

    // Send QR to attendees with emails
    for (const attendee of attendees.filter((a) => a.email)) {
      await sendEmail({
        to: attendee.email,
        subject: `Booth QR Code - ${booking.companyName || "Your Booth"}`,
        text: `Hello ${attendee.name},

Your QR code for booth booking ${booking._id} is ready. Present it during check-in.

Thank you,
GUC Event Office`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;">
            <p>Hello ${attendee.name},</p>
            <p>Your QR code for booth booking <strong>${
              booking.companyName || booking.booth?.name || booking._id
            }</strong> is ready. Present it upon arrival.</p>
            <div style="text-align:center;margin:18px 0;">
              <img src="cid:${qrCid}" alt="Booth QR Code" style="width:220px;height:220px;border:1px solid #e5e7eb;border-radius:12px;" />
            </div>
            <p>See you soon,<br/>GUC Event Office</p>
          </div>
        `,
        attachments: [
          {
            filename: "booth-qr.png",
            content: qrBuffer,
            cid: qrCid,
          },
        ],
      });
    }

    return res.json({
      message: "Booth QR code sent successfully.",
      bookingId: booking._id,
    });
  } catch (error) {
    console.error("sendBoothVendorQRCode error:", error);
    return res.status(500).json({
      message: "Failed to send booth QR code",
      error: error.message,
    });
  }
};
