import EventOffice from "../models/eventOffice.model.js";
import Bazaar from "../models/bazaar.model.js";
import Conference from "../models/conference.model.js";
import Workshop from "../models/workshop.model.js";
import Trip from "../models/trip.model.js";
import GymSession from "../models/gymSession.model.js";
import Vendor from "../models/vendor.model.js";
import Student from "../models/student.model.js";
import Faculty from "../models/faculty.model.js";
import Wallet from "../models/wallet.model.js";
import {
  eventAllowsRole,
  normalizeRoleName,
} from "../constants/roles.js";
import { normalizeRegistrationDeadline } from "../utils/registrationDeadline.js";
import { createPersonalNotification } from "./notifications.controller.js";

const REGISTRATION_CANCEL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const roleLabels = {
  ta: "TA",
  Ta: "TA",
  TA: "TA",
  prof: "Professor",
  Prof: "Professor",
  professor: "Professor",
  Professor: "Professor",
  staff: "Staff",
  Staff: "Staff",
  faculty: "Faculty",
};

const resolveRegistrationFee = (modelName, event) => {
  if (modelName === "Trip") {
    return Number(event.price) || 0;
  }
  if (modelName === "Workshop") {
    return Number(event.priceToAttend) || 0;
  }
  return 0;
};

const buildPaymentSnapshot = (amountDue) => {
  const fee = Number(amountDue) || 0;
  if (fee <= 0) {
    return {
      status: "paid",
      method: "free",
      amountDue: 0,
      amountPaid: 0,
      paidAt: new Date(),
    };
  }
  return {
    status: "pending",
    amountDue: fee,
    amountPaid: 0,
  };
};

const resolveRegistrantContext = async (userId) => {
  if (!userId) return null;
  let doc = await Student.findById(userId);
  if (doc) return { doc, role: "Student" };

  doc = await Faculty.findById(userId);
  if (doc) {
    const normalizedRole =
      roleLabels[doc.role?.toLowerCase?.()] ||
      roleLabels[doc.role] ||
      doc.role ||
      "Faculty";
    return { doc, role: normalizedRole };
  }

  return null;
};

const makeFakeRes = () => ({
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
});

const genericRegister = async (req, res, model, modelName) => {
  try {
    const { UniId } = req.body || {};
    const { id } = req.params;
    const authUser = await resolveRegistrantContext(req.user?.id);

    if (!authUser) {
      return res.status(401).json({
        success: false,
        message:
          "You must be logged in as a student, faculty, TA, professor, or staff member to register.",
      });
    }

    if (!UniId) {
      return res.status(400).json({
        success: false,
        message: "University ID is required",
      });
    }

    const { doc: user, role: userType } = authUser;
    if (!user.UniId) {
      return res.status(400).json({
        success: false,
        message:
          "Your account is missing a University ID. Please contact the Event Office to update your profile.",
      });
    }

    if (user.UniId !== UniId) {
      return res.status(400).json({
        success: false,
        message:
          "The University ID you entered does not match the one on your profile.",
      });
    }

    // First, get the current workshop to check its start date
    const event = await model.findById(id);
    if (!event) {
      return res.status(404).json({ message: `${modelName} not found` });
    }

    const normalizedRole = normalizeRoleName(userType);
    if (!eventAllowsRole(event, normalizedRole)) {
      return res.status(403).json({
        success: false,
        message: `${modelName} is restricted to specific roles.`,
      });
    }

    if (event.registrationDeadline) {
      const normalizedDeadline = normalizeRegistrationDeadline(
        event.registrationDeadline,
        event.startDate,
        event.startTime
      );
      if (normalizedDeadline && new Date() > normalizedDeadline) {
        return res.status(400).json({
          success: false,
          message: "Registration deadline has passed",
        });
      }
    }

      const alreadyRegistered = event.registrants?.some(
        (registrant) => registrant.user.toString() === user._id.toString()
      );

      if (alreadyRegistered) {
        return res.status(400).json({
          success: false,
          message: `You are already registered for this ${modelName.toLowerCase()}`,
        });
      }

      event.waitlist = Array.isArray(event.waitlist) ? event.waitlist : [];
      const waitlistIndex = event.waitlist.findIndex(
        (entry) => entry.user.toString() === user._id.toString()
      );

      const capacity = Number(event.capacity);
      const isFull =
        Number.isFinite(capacity) &&
        capacity > 0 &&
        (event.registrants?.length || 0) >= capacity;

      if (isFull) {
        if (waitlistIndex !== -1) {
          return res.status(200).json({
            success: true,
            waitlisted: true,
            message: `You are already on the waiting list for this ${modelName.toLowerCase()}.`,
          });
        }

        event.waitlist.push({
          user: user._id,
          userType,
          joinedAt: new Date(),
        });

        await event.save();

        return res.status(200).json({
          success: true,
          waitlisted: true,
          message: `${modelName} is full. You've been added to the waiting list.`,
        });
      }

      const amountDue = resolveRegistrationFee(modelName, event);

      if (waitlistIndex !== -1) {
        event.waitlist.splice(waitlistIndex, 1);
      }

      event.registrants.push({
        user: user._id,
        userType,
        payment: buildPaymentSnapshot(amountDue),
      });

    await event.save();

    return res.status(200).json({
      success: true,
      message: `Successfully registered for the ${modelName.toLowerCase()}`,
      data: {
        [`${modelName.toLowerCase()}Name`]: event.name,
        registrantType: userType,
        registeredAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error registering for ${modelName.toLowerCase()}:`, error);
    return res.status(500).json({
      success: false,
      message: `An error occurred while registering for the ${modelName.toLowerCase()}`,
      error: error.message,
    });
  }
};

export const registerToWorkshop = async (req, res) => {
  await genericRegister(req, res, Workshop, "Workshop");
};

export const registerToTrip = async (req, res) => {
  await genericRegister(req, res, Trip, "Trip");
};

export const registerToGymSession = async (req, res) => {
  try {
    const { email, UniId } = req.body;
    const { id } = req.params;

    if (!email || !UniId) {
      return res.status(400).json({
        success: false,
        message: "Email and UniId are required",
      });
    }

    const session = await GymSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: "Gym session not found" });
    }

    // Check if session date/time has passed
    const sessionDateTime = new Date(session.date);
    if (session.time) {
      const [hours, minutes] = session.time.split(":").map(Number);
      sessionDateTime.setHours(hours, minutes, 0, 0);
    }
    if (sessionDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot register for past gym sessions",
      });
    }

    // Check if max capacity is reached
    if (
      session.registrants &&
      session.maxParticipants &&
      session.registrants.length >= session.maxParticipants
    ) {
      return res.status(400).json({
        success: false,
        message: "Gym session is at full capacity",
      });
    }

    const student = await Student.findOne({ UniId });
    const faculty = await Faculty.findOne({ UniId });

    if (!student && !faculty) {
      return res.status(404).json({
        success: false,
        message:
          "No student or faculty found with the provided UniId and email",
      });
    }

    const user = student || faculty;
    const userType = student ? "Student" : "Faculty";

    // Check if already registered
    const alreadyRegistered = session.registrants?.some(
      (registrant) => registrant.user.toString() === user._id.toString()
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: "You are already registered for this gym session",
      });
    }

    session.registrants.push({
      user: user._id,
      userType,
    });

    await session.save();

    return res.status(200).json({
      success: true,
      message: "Successfully registered for the gym session",
      data: {
        sessionType: session.type,
        registrantType: userType,
        registeredAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error registering for gym session:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while registering for the gym session",
      error: error.message,
    });
  }
};

export const getWorkshopParticipants = async (req, res) => {
  try {
    const { workshopId } = req.params;

    const workshop = await Workshop.findById(workshopId).lean();

    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: "Workshop not found",
      });
    }

    // Authorization: allow only creator, Admin, or Event Office to view participants
    const requester = req.user;
    const allowedRoles = ["Admin", "Event Office"];
    const isCreator =
      workshop.createdBy &&
      requester?.id &&
      workshop.createdBy.toString() === String(requester.id);

    if (!requester || (!isCreator && !allowedRoles.includes(requester.role))) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view participants",
      });
    }

    const registrants = Array.isArray(workshop.registrants)
      ? workshop.registrants
      : [];

    const modelBuckets = registrants.reduce((acc, registrant) => {
      if (!registrant?.user) return acc;
      const userType = String(registrant.userType || "").toLowerCase();
      const bucketKey =
        userType === "student"
          ? "Student"
          : ["faculty", "staff", "professor", "ta"].includes(userType)
          ? "Faculty"
          : null;
      if (!bucketKey) return acc;
      if (!acc[bucketKey]) acc[bucketKey] = [];
      acc[bucketKey].push(registrant.user);
      return acc;
    }, {});

    const userLookup = {};

    await Promise.all(
      Object.entries(modelBuckets).map(async ([key, ids]) => {
        const Model = key === "Student" ? Student : Faculty;
        const docs = await Model.find({ _id: { $in: ids } })
          .select("firstName lastName email UniId name role")
          .lean();
        docs.forEach((doc) => {
          userLookup[String(doc._id)] = doc;
        });
      })
    );

    const participants = registrants.map((registrant) => {
      const u = userLookup[String(registrant.user)] || {};
      const fullName =
        [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name;
      return {
        name: fullName || "",
        email: u.email,
        UniId: u.UniId,
        userType: registrant.userType,
        registeredAt: registrant.registeredAt,
      };
    });

    const remainingSpots = Math.max(
      0,
      workshop.capacity - workshop.registrants.length
    );

    return res.status(200).json({
      success: true,
      message:
        "Workshop participants and remaining spots retrieved successfully",
      data: {
        workshopName: workshop.name,
        totalCapacity: workshop.capacity,
        registeredParticipants: workshop.registrants.length,
        remainingSpots,
        participants,
      },
    });
  } catch (error) {
    console.error("Error getting workshop participants:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving workshop participants",
      error: error.message,
    });
  }
};

const ensureWallet = async ({ userId, userRole }) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (wallet) return wallet;

  wallet = await Wallet.create({
    user: userId,
    userRole: userRole || "Student",
    history: [
      {
        type: "init",
        amount: 0,
        currency: "egp",
        description: "Wallet auto-created for event refunds",
      },
    ],
  });
  return wallet;
};

const creditWalletForRefund = async ({
  userId,
  userRole,
  amountMinor,
  description,
  metadata,
}) => {
  if (!amountMinor || amountMinor <= 0) return null;
  const wallet = await ensureWallet({ userId, userRole });
  wallet.balance += amountMinor;
  wallet.history.push({
    type: "credit",
    amount: amountMinor,
    currency: wallet.currency,
    description,
    metadata,
  });
  wallet.lastTransactionAt = new Date();
  await wallet.save();
  return wallet;
};

async function notifyWaitlistSpots(event, modelName) {
  const waitlist = Array.isArray(event.waitlist) ? event.waitlist : [];
  if (!waitlist.length) return;

  for (const entry of waitlist) {
    try {
      const fakeReq = {
        body: {
          recipientId: entry.user,
          recipientModel: entry.userType || "Student",
          title: `Spot available in ${event.name}`,
          message: `A spot just opened up for ${event.name}. Register now to claim it.`,
          type: "EVENT_WAITLIST_SPOT",
          data: {
            eventModel: modelName,
            event: event._id,
            waitlist: true,
          },
        },
        user: { role: "Admin", id: null },
      };
      const fakeRes = makeFakeRes();
      await createPersonalNotification(fakeReq, fakeRes);
      if (fakeRes._status >= 400) {
        console.error(
          `[waitlist notify] Failed to notify ${entry.user} about ${event.name}:`,
          fakeRes._json || fakeRes._status
        );
      }
    } catch (err) {
      console.error("Failed to notify waitlist entry:", err?.message || err);
    }
  }
}

async function promoteFromWaitlist(event, modelName) {
  const capacity = Number(event.capacity);
  if (!Number.isFinite(capacity) || capacity <= 0) return false;
  if (!Array.isArray(event.waitlist) || !event.waitlist.length) return false;

  let changed = false;

  while (
    (event.registrants?.length || 0) < capacity &&
    event.waitlist.length > 0
  ) {
    const next = event.waitlist.shift();
    if (!next || !next.user) continue;

    const amountDue = resolveRegistrationFee(modelName, event);
    const paymentRequired = Number(amountDue) > 0;

    event.registrants.push({
      user: next.user,
      userType: next.userType,
      payment: buildPaymentSnapshot(amountDue),
    });
    changed = true;

    try {
      const fakeReq = {
        body: {
          recipientId: next.user,
          recipientModel: next.userType || "Student",
          title: `You have been moved into ${event.name}`,
          message: paymentRequired
            ? `A spot opened up and you have been added to ${event.name}. Payment of EGP ${amountDue} is now due—please complete it to confirm.`
            : `A spot opened up and you have been added to ${event.name}.`,
          type: "EVENT_WAITLIST_PROMOTED",
          data: {
            eventModel: modelName,
            event: event._id,
            waitlistPromoted: true,
            paymentRequired,
            amountDue,
          },
        },
        user: { role: "Admin", id: null },
      };
      const fakeRes = makeFakeRes();
      await createPersonalNotification(fakeReq, fakeRes);
      if (fakeRes._status >= 400) {
        console.error(
          `[waitlist promote] Failed to notify ${next.user} about ${event.name}:`,
          fakeRes._json || fakeRes._status
        );
      }
    } catch (err) {
      console.error("Failed to notify promoted user:", err?.message || err);
    }
  }

  return changed;
}

const cancelRegistration = async (req, res, model, modelName) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const event = await model.findById(id);
    if (!event) {
      return res.status(404).json({ message: `${modelName} not found` });
    }

    const registrantIndex = event.registrants.findIndex(
      (registrant) => registrant.user.toString() === userId.toString()
    );

    if (registrantIndex === -1) {
      return res.status(404).json({
        message: `Registration not found for this ${modelName.toLowerCase()}`,
      });
    }

    const registrant = event.registrants[registrantIndex];
    const startDate = event.startDate ? new Date(event.startDate) : null;
    if (startDate && startDate - Date.now() < REGISTRATION_CANCEL_WINDOW_MS) {
      return res.status(400).json({
        message: `Cancellations are only allowed up to two weeks before the ${modelName.toLowerCase()}.`,
      });
    }

    const payment = registrant.payment || {};
    if (payment.status !== "paid") {
      return res.status(400).json({
        message: "This registration has not been paid yet.",
      });
    }

    const amountToRefund =
      Number(payment.amountPaid ?? payment.amountDue ?? 0) || 0;
    const amountMinor = Math.max(0, Math.round(amountToRefund * 100));

    if (amountMinor > 0) {
      await creditWalletForRefund({
        userId: registrant.user,
        userRole: registrant.userType,
        amountMinor,
        description: `${modelName} refund - ${event.name}`,
        metadata: {
          eventType: modelName.toLowerCase(),
          eventId: event._id,
        },
      });
    }

    event.registrants.splice(registrantIndex, 1);

    // Promote from waitlist if capacity allows, then notify remaining waitlist of availability
    const promotionHappened = await promoteFromWaitlist(event, modelName);

    const capacity = Number(event.capacity);
    const availableSlots =
      Number.isFinite(capacity) && capacity > 0
        ? capacity - (event.registrants?.length || 0)
        : 0;
    if (availableSlots > 0) {
      await notifyWaitlistSpots(event, modelName);
    }

    await event.save();

    return res.json({
      message: `${modelName} registration cancelled and refunded to wallet.`,
      refund: amountToRefund,
    });
  } catch (error) {
    console.error(`Error cancelling ${modelName} registration:`, error);
    return res.status(500).json({
      message: `Failed to cancel ${modelName.toLowerCase()} registration.`,
      error: error.message,
    });
  }
};

export const cancelWorkshopRegistration = (req, res) =>
  cancelRegistration(req, res, Workshop, "Workshop");

export const cancelTripRegistration = (req, res) =>
  cancelRegistration(req, res, Trip, "Trip");
