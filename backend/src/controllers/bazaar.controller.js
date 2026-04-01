import Bazaar from "../models/bazaar.model.js";
import Vendor from "../models/vendor.model.js";
import multer from "multer";
import { sendEmail } from "../lib/mailer.js";
import {
  createBroadcastNotification,
 // createNotificationTemplate,
  createNewEventBroadcast, 
} from "./notifications.controller.js";

function mergeDateAndTime(dateObj, timeStr) {
  // Clone the date to avoid mutating the original
  const result = new Date(dateObj);

  // Split "HH:mm" into hours and minutes
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Set hours and minutes on the date
  result.setHours(hours, minutes, 0, 0);

  return result;
}

// helper to reuse a fake res for notifications
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
import { resolveAllowedRolesInput } from "../constants/roles.js";
import { normalizeRegistrationDeadline } from "../utils/registrationDeadline.js";

/* ============================================================
   📦 ADMIN / EVENT OFFICE ACTIONS
============================================================ */
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
/**
 * Create a new bazaar
 */
/**
 * Create a new bazaar
 */
export const createBazaar = async (req, res) => {
  try {
    const {
      name,
      location,
      shortDescription,
      registrationDeadline,
      startDate,
      endDate,
      startTime,
      endTime,
      capacity,
      price2x2,
      price4x4,
      allowedRoles,
    } = req.body;

    const existingBazaar = await Bazaar.findOne({ name, startDate });
    if (existingBazaar) {
      return res.status(400).json({ message: "Bazaar already exists" });
    }

    const available = await isLocationAvailable(
      Bazaar,
      location,
      startDate,
      endDate
    );
    if (!available)
      return res.status(400).json({ message: "Location already booked" });

    const missing =
      !name ||
      !location ||
      !registrationDeadline ||
      !startDate ||
      !endDate ||
      !capacity ||
      price2x2 === undefined ||
      price4x4 === undefined;

    if (missing) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields." });
    }

    if (Number(price2x2) < 0 || Number(price4x4) < 0) {
      return res
        .status(400)
        .json({ message: "Booth prices must be zero or greater." });
    }

    const normalizedRegistrationDeadline = normalizeRegistrationDeadline(
      registrationDeadline,
      startDate,
      startTime
    );

    const newBazaar = new Bazaar({
      name,
      location,
      shortDescription,
      registrationDeadline: normalizedRegistrationDeadline ?? null,
      startDate,
      endDate,
      startTime,
      endTime,
      capacity,
      price2x2,
      price4x4,
      // ✅ Only addition for roles:
      allowedRoles: resolveAllowedRolesInput(allowedRoles),
    });

    const savedBazaar = await newBazaar.save();

    // ✅ Only addition for NEW_EVENT notification:
    const startsAt = startDate
      ? startTime
        ? mergeDateAndTime(startDate, startTime)
        : new Date(startDate)
      : null;

    const fakeReq = {
      user: req.user,
      body: {
        title: `Bazaar: ${savedBazaar.name}`,
        message: `Open to everyone. Explore booths and offers.`,
        allowedRoles: savedBazaar.allowedRoles, // 👈 KEY PART
        data: {
          eventModel: "Bazaar",
          event: savedBazaar._id,
          startsAt,
          startTime: startTime || null,
          reminderLabel: null,
        },
      },
    };
    const fakeRes = makeFakeRes();
    await createNewEventBroadcast(fakeReq, fakeRes);
    if (fakeRes._status >= 400) {
      console.error("[notif error bazaar]:", fakeRes._json);
    }

    res
      .status(201)
      .json({ message: "Bazaar created successfully!", bazaar: savedBazaar });
  } catch (error) {
    console.error("Error creating bazaar:", error);
    res.status(500).json({
      message: "Server error while creating bazaar.",
      error: error.message,
    });
  }
};

/**
 * Get all bazaars (Admin view)
 */
export const getAllBazaars = async (req, res) => {
  try {
    const bazaars = await Bazaar.find().populate(
      "vendorRequests.vendor",
      "companyName email status"
    );
    res.status(200).json(bazaars);
  } catch (error) {
    console.error("Error fetching bazaars:", error);
    res
      .status(500)
      .json({ message: "Error retrieving bazaars.", error: error.message });
  }
};

/**
 * Get vendor requests for a specific bazaar (Event Office)
 */
export const getVendorRequestsForBazaar = async (req, res) => {
  try {
    const { bazaarId } = req.params;
    const bazaar = await Bazaar.findById(bazaarId).populate(
      "vendorRequests.vendor",
      "companyName email status"
    );

    if (!bazaar) return res.status(404).json({ message: "Bazaar not found." });

    res.status(200).json({ vendorRequests: bazaar.vendorRequests });
  } catch (error) {
    console.error("Error getting vendor requests:", error);
    res.status(500).json({
      message: "Error retrieving vendor requests.",
      error: error.message,
    });
  }
};

/**
 * Accept or reject a vendor request (Event Office)
//  */
// export const updateVendorRequestStatus = async (req, res) => {
//   try {
//     const { bazaarId, vendorId } = req.params;
//     const { status } = req.body; // accepted / rejected

//     if (!["accepted", "rejected"].includes(status)) {
//       return res
//         .status(400)
//         .json({ message: "Invalid status. Must be 'accepted' or 'rejected'." });
//     }

//     const bazaar = await Bazaar.findById(bazaarId);
//     if (!bazaar) return res.status(404).json({ message: "Bazaar not found." });

//     const request = bazaar.vendorRequests.find(
//       (req) => req.vendor.toString() === vendorId.toString()
//     );

//     if (!request)
//       return res.status(404).json({ message: "Vendor request not found." });

//     request.status = status;
//     await bazaar.save();

//     res.status(200).json({
//       message: `Vendor request has been ${status}.`,
//       updatedRequest: request,
//     });
//   } catch (error) {
//     console.error("Error updating vendor request:", error);
//     res.status(500).json({
//       message: "Error updating vendor request status.",
//       error: error.message,
//     });
//   }
// };

export const acceptVendorRequest = async (req, res) => {
  try {
    const { bazaarId, vendorId } = req.params;

    // Find the bazaar
    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) return res.status(404).json({ message: "Bazaar not found" });

    const vendorDoc = await Vendor.findById(vendorId);
    if (!vendorDoc)
      return res.status(404).json({ message: "Vendor not found" });

    // Find the specific request
    const request = bazaar.vendorRequests.find(
      (r) => r.vendor.toString() === vendorId
    );
    if (!request)
      return res.status(404).json({ message: "Vendor request not found" });

    const boothPrice =
      request.boothSize === "4x4" ? bazaar.price4x4 : bazaar.price2x2;
    const paymentDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    request.status = "awaiting_payment";
    request.boothPrice = boothPrice;
    request.paymentDeadline = paymentDeadline;
    request.paymentIntentId = null;
    request.paidAt = null;
    await bazaar.save();

    const dateRange = `${new Date(bazaar.startDate).toLocaleDateString()} - ${new Date(
      bazaar.endDate
    ).toLocaleDateString()}`;
    await sendEmail({
      to: vendorDoc.email,
      subject: `Bazaar application accepted – ${bazaar.name}`,
      text: `Hello ${vendorDoc.companyName || "Vendor"},

Great news! Your application to join the ${bazaar.name} bazaar has been accepted.

Event details:
- Dates: ${dateRange}
- Location: ${bazaar.location}
- Booth size requested: ${request.boothSize}

Our team will follow up with any additional logistics. Feel free to reply to this email if you have questions.

Regards,
GUC Events Team`,
    });

    res.status(200).json({
      message: "Vendor request approved. Awaiting vendor payment.",
      vendorId,
      bazaarId,
      boothPrice,
      paymentDeadline,
    });
  } catch (error) {
    console.error("Error accepting vendor request:", error);
    res.status(500).json({
      message: "Error accepting vendor request",
      error: error.message,
    });
  }
};

/**
 * Event Office — Reject a vendor's participation request
 */
export const rejectVendorRequest = async (req, res) => {
  try {
    const { bazaarId, vendorId } = req.params;
    const { reason } = req.body || {};

    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) return res.status(404).json({ message: "Bazaar not found" });

    const vendorDoc = await Vendor.findById(vendorId);
    if (!vendorDoc)
      return res.status(404).json({ message: "Vendor not found" });

    const request = bazaar.vendorRequests.find(
      (r) => r.vendor.toString() === vendorId
    );
    if (!request)
      return res.status(404).json({ message: "Vendor request not found" });

    request.status = "rejected";
    await bazaar.save();

    const rejectionText = reason ? `Reason provided: ${reason}\n\n` : "";
    await sendEmail({
      to: vendorDoc.email,
      subject: `Bazaar application update – ${bazaar.name}`,
      text: `Hello ${vendorDoc.companyName || "Vendor"},

We appreciate your interest in participating in the ${bazaar.name} bazaar. After reviewing all submissions, we are unable to accommodate your team this time.

${rejectionText}You are welcome to apply again for future bazaars, and we value your continued engagement with the GUC community.

Regards,
GUC Events Team`,
    });

    res.status(200).json({
      message: "Vendor request rejected successfully",
      vendorId,
      bazaarId,
    });
  } catch (error) {
    console.error("Error rejecting vendor request:", error);
    res.status(500).json({
      message: "Error rejecting vendor request",
      error: error.message,
    });
  }
};

/* ============================================================
   🏬 VENDOR ACTIONS
============================================================ */

/**
 * Vendor applies to join a bazaar
 */
export const applyToBazaar = async (req, res) => {
  try {
    const { vendorId, bazaarId } = req.params;

    let attendees = req.body.attendees || [];
    const boothSize = req.body.boothSize;

    // Parse attendees if sent as JSON string
    if (typeof attendees === "string") {
      try {
        attendees = JSON.parse(attendees);
      } catch (e) {
        // fallback: treat as empty
        attendees = [];
      }
    }

    // Ensure attendees is an array
    if (!Array.isArray(attendees)) attendees = [];

    // Validate vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    // Validate bazaar exists
    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) return res.status(404).json({ message: "Bazaar not found" });

    // Check registration deadline
    if (new Date() > bazaar.registrationDeadline) {
      return res
        .status(400)
        .json({ message: "Registration deadline has passed" });
    }

    // Max 5 attendees
    if (attendees.length > 5) {
      return res
        .status(400)
        .json({ message: "Maximum of 5 attendees allowed" });
    }

    if (req.files && Array.isArray(req.files.idFiles)) {
      const idFiles = req.files.idFiles;
      // Attach file buffer/contentType to corresponding attendee entry (by index)
      for (let i = 0; i < idFiles.length && i < attendees.length; i++) {
        const file = idFiles[i];
        if (!file) continue;
        attendees[i].idDocument = {
          data: file.buffer,
          contentType: file.mimetype,
        };
      }
    }

    // Check for duplicate application
    const existing = bazaar.vendorRequests.find(
      (req) => req.vendor.toString() === vendorId
    );
    if (existing) {
      return res
        .status(400)
        .json({ message: "Vendor has already applied to this bazaar" });
    }

    // Add request
    bazaar.vendorRequests.push({
      vendor: vendorId,
      attendees,
      boothSize,
      status: "pending",
    });

    await bazaar.save();
    res.status(201).json({
      message: "Vendor successfully applied to the bazaar.",
      bazaar,
    });
  } catch (error) {
    console.error("Error applying to bazaar:", error);
    res.status(500).json({ message: "Error applying to bazaar", error });
  }
};

export const cancelVendorBazaarApplication = async (req, res) => {
  try {
    const { vendorId, bazaarId } = req.params;
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
        .json({ message: "You are not allowed to cancel this request." });
    }

    if (role === "Vendor" && String(vendorId) !== String(requesterId)) {
      return res.status(403).json({
        message: "You can only cancel your own bazaar applications.",
      });
    }

    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) {
      return res.status(404).json({ message: "Bazaar not found" });
    }

    const request = bazaar.vendorRequests.find(
      (req) => req.vendor.toString() === vendorId
    );
    if (!request) {
      return res.status(404).json({ message: "Vendor request not found" });
    }

    if (!["pending", "awaiting_payment"].includes(request.status)) {
      return res.status(400).json({
        message:
          "Only pending or awaiting payment applications can be cancelled.",
      });
    }

    request.status = "cancelled";
    request.paymentDeadline = null;
    request.paymentIntentId = null;
    request.paidAt = null;
    request.cancelledAt = new Date();

    await bazaar.save();

    res.status(200).json({
      message: "Bazaar application cancelled successfully.",
      vendorId,
      bazaarId,
    });
  } catch (error) {
    console.error("Error cancelling bazaar application:", error);
    res.status(500).json({
      message: "Error cancelling bazaar application",
      error: error.message,
    });
  }
};

export const removeVendorBazaarApplication = async (req, res) => {
  try {
    const { vendorId, bazaarId } = req.params;
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
        .json({ message: "You are not allowed to remove this request." });
    }

    if (role === "Vendor" && String(vendorId) !== String(requesterId)) {
      return res.status(403).json({
        message: "You can only remove your own bazaar applications.",
      });
    }

    const bazaar = await Bazaar.findById(bazaarId);
    if (!bazaar) {
      return res.status(404).json({ message: "Bazaar not found" });
    }

    const idx = bazaar.vendorRequests.findIndex(
      (req) => req.vendor.toString() === vendorId
    );
    if (idx === -1) {
      return res.status(404).json({ message: "Vendor request not found" });
    }

    const status = String(
      bazaar.vendorRequests[idx].status || ""
    ).toLowerCase();
    if (!["cancelled", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Only cancelled or rejected applications can be removed.",
      });
    }

    bazaar.vendorRequests.splice(idx, 1);
    await bazaar.save();

    res.status(200).json({
      message: "Application removed.",
      vendorId,
      bazaarId,
    });
  } catch (error) {
    console.error("Error removing bazaar application:", error);
    res.status(500).json({
      message: "Error removing bazaar application",
      error: error.message,
    });
  }
};
/**
 * Vendor views all accepted bazaars (upcoming)
 */
export const getAcceptedBazaarsForVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const currentDate = new Date();

    const statuses = ["awaiting_payment", "accepted"];

    const bazaars = await Bazaar.find({
      "vendorRequests.vendor": vendorId,
      "vendorRequests.status": { $in: statuses },
      endDate: { $gte: currentDate },
    }).lean();

    const response = [];

    bazaars.forEach((bazaar) => {
      (bazaar.vendorRequests || []).forEach((request) => {
        if (
          request.vendor?.toString() === vendorId &&
          statuses.includes(request.status)
        ) {
          const boothPrice =
            request.boothPrice ??
            (request.boothSize === "4x4" ? bazaar.price4x4 : bazaar.price2x2);

          response.push({
            status: request.status,
            boothSize: request.boothSize,
            boothPrice,
            appliedAt: request.appliedAt,
            paymentDeadline: request.paymentDeadline,
            paidAt: request.paidAt,
            vendorId: request.vendor,
            bazaar: {
              _id: bazaar._id,
              name: bazaar.name,
              location: bazaar.location,
              shortDescription: bazaar.shortDescription,
              registrationDeadline: bazaar.registrationDeadline,
              startDate: bazaar.startDate,
              endDate: bazaar.endDate,
              startTime: bazaar.startTime,
              endTime: bazaar.endTime,
              price2x2: bazaar.price2x2,
              price4x4: bazaar.price4x4,
            },
            vendorRequest: {
              status: request.status,
              boothSize: request.boothSize,
              boothPrice,
              attendees: request.attendees,
              appliedAt: request.appliedAt,
            },
          });
        }
      });
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching accepted bazaars:", error);
    res.status(500).json({
      message: "Error fetching accepted bazaars.",
      error: error.message,
    });
  }
};

/**
 * Vendor views all pending or rejected applications
 */
export const getPendingOrRejectedForVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const currentDate = new Date();

    const bazaars = await Bazaar.find({
      "vendorRequests.vendor": vendorId,
      "vendorRequests.status": { $in: ["pending", "rejected", "cancelled"] },
      endDate: { $gte: currentDate },
    }).lean();

    const response = [];
    bazaars.forEach((bazaar) => {
      (bazaar.vendorRequests || []).forEach((request) => {
        if (
          request.vendor?.toString() === vendorId &&
          ["pending", "rejected", "cancelled"].includes(request.status)
        ) {
          const boothPrice =
            request.boothPrice ??
            (request.boothSize === "4x4" ? bazaar.price4x4 : bazaar.price2x2);

          response.push({
            status: request.status,
            boothSize: request.boothSize,
            boothPrice,
            appliedAt: request.appliedAt,
            paymentDeadline: request.paymentDeadline,
            paidAt: request.paidAt,
            vendorId: request.vendor,
            bazaar: {
              _id: bazaar._id,
              name: bazaar.name,
              location: bazaar.location,
              shortDescription: bazaar.shortDescription,
              registrationDeadline: bazaar.registrationDeadline,
              startDate: bazaar.startDate,
              endDate: bazaar.endDate,
              startTime: bazaar.startTime,
              endTime: bazaar.endTime,
              price2x2: bazaar.price2x2,
              price4x4: bazaar.price4x4,
            },
            vendorRequest: {
              status: request.status,
              boothSize: request.boothSize,
              boothPrice,
              attendees: request.attendees,
              appliedAt: request.appliedAt,
            },
          });
        }
      });
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching pending/rejected bazaars:", error);
    res.status(500).json({
      message: "Error fetching pending/rejected bazaars.",
      error: error.message,
    });
  }
};
// Get all vendor requests across all bazaars (for Event Office)import Bazaar from "../models/Bazaar.js";

/**
 * Get all vendor requests across all bazaars (for Event Office)
 */
export const getAllVendorRequests = async (req, res) => {
  try {
    // Find all bazaars and populate vendor info
    const bazaars = await Bazaar.find()
      .populate("vendorRequests.vendor", "companyName email status")
      .lean();

    // Flatten all vendor requests safely
    const allRequests = bazaars.flatMap((bazaar) => {
      const requests = Array.isArray(bazaar.vendorRequests)
        ? bazaar.vendorRequests
        : [];

      return requests
        .filter((r) => r.status === "pending")
        .map((request) => ({
          bazaarId: bazaar._id,
          bazaarName: bazaar.name,
          location: bazaar.location,
          startDate: bazaar.startDate,
          endDate: bazaar.endDate,
          vendorId: request.vendor?._id,
          vendorName: request.vendor?.companyName,
          vendorEmail: request.vendor?.email,
          vendorStatus: request.vendor?.status,
          boothSize: request.boothSize,
          boothPrice:
            request.boothPrice ??
            (request.boothSize === "4x4" ? bazaar.price4x4 : bazaar.price2x2),
          attendees: request.attendees,
          status: request.status,
          appliedAt: request.appliedAt,
        }));
    });

    res.status(200).json({
      count: allRequests.length,
      requests: allRequests,
    });
  } catch (error) {
    console.error("Error fetching vendor requests:", error);
    res.status(500).json({
      message: "Error fetching vendor requests",
      error: error.message,
    });
  }
};

// ✅ NEW: Event Office only – view attendees for a vendor's bazaar application
export const getBazaarVendorRequestAttendees = async (req, res) => {
  try {
    if (!req.user || !["Event Office", "Admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only Event Office can view attendees" });
    }
    const { bazaarId, vendorId } = req.params;
    const bazaar = await Bazaar.findById(bazaarId)
      .select("vendorRequests")
      .lean();
    if (!bazaar) return res.status(404).json({ message: "Bazaar not found" });

    const request = (bazaar.vendorRequests || []).find(
      (r) => String(r.vendor) === String(vendorId)
    );
    if (!request)
      return res.status(404).json({ message: "Vendor request not found" });

    const attendees = (request.attendees || []).map((a, i) => ({
      index: i,
      name: a.name || a.fullName || "Attendee",
      email: a.email || "",
      hasIdDocument: !!(a.idDocument && a.idDocument.data),
    }));

    return res.status(200).json({
      bazaarId,
      vendorId,
      attendees,
    });
  } catch (err) {
    console.error("getBazaarVendorRequestAttendees error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ✅ NEW: Return attendee ID (base64)
export const getBazaarVendorAttendeeId = async (req, res) => {
  try {
    if (!req.user || !["Event Office", "Admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only Event Office can view attendee IDs" });
    }
    const { bazaarId, vendorId, index } = req.params;
    const bazaar = await Bazaar.findById(bazaarId)
      .select("vendorRequests")
      .lean();
    if (!bazaar) return res.status(404).json({ message: "Bazaar not found" });

    const request = (bazaar.vendorRequests || []).find(
      (r) => String(r.vendor) === String(vendorId)
    );
    if (!request)
      return res.status(404).json({ message: "Vendor request not found" });

    const i = Number(index);
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i >= (request.attendees || []).length
    ) {
      return res.status(400).json({ message: "Invalid attendee index" });
    }
    const att = request.attendees[i];
    if (!att?.idDocument?.data)
      return res.status(404).json({ message: "ID document not found" });

    return res.status(200).json({
      contentType: att.idDocument.contentType || "application/octet-stream",
      data: att.idDocument.data.toString("base64"),
    });
  } catch (err) {
    console.error("getBazaarVendorAttendeeId error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ✅ NEW: Download attendee ID (binary)
export const downloadBazaarVendorAttendeeId = async (req, res) => {
  try {
    if (!req.user || !["Event Office", "Admin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only Event Office can download attendee IDs" });
    }
    const { bazaarId, vendorId, index } = req.params;
    const bazaar = await Bazaar.findById(bazaarId)
      .select("vendorRequests")
      .lean();
    if (!bazaar) return res.status(404).json({ message: "Bazaar not found" });

    const request = (bazaar.vendorRequests || []).find(
      (r) => String(r.vendor) === String(vendorId)
    );
    if (!request)
      return res.status(404).json({ message: "Vendor request not found" });

    const i = Number(index);
    if (
      !Number.isInteger(i) ||
      i < 0 ||
      i >= (request.attendees || []).length
    ) {
      return res.status(400).json({ message: "Invalid attendee index" });
    }
    const att = request.attendees[i];
    if (!att?.idDocument?.data)
      return res.status(404).json({ message: "ID document not found" });

    const ct = att.idDocument.contentType || "application/octet-stream";
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
      `attachment; filename="bazaar-attendee-${index}-id${ext}"`
    );
    return res.send(att.idDocument.data);
  } catch (err) {
    console.error("downloadBazaarVendorAttendeeId error:", err);
    return res.status(500).json({ message: err.message });
  }
};
