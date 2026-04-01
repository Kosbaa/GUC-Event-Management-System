import express from "express";
import multer from "multer";
import {
  createConference,
  createWorkshop,
  createTrip,
  updateTrip,
  getBazaars,
  getAllEvents,
  deleteEvent,
  editConference,
  editBazaar,
  getTrips,
  getMyAttended,
  getWorkshops,
  getConferences,
  getRecommendedEvents,
  editWorkshop,
  createBooth,
  getBooths,
  bookBooth,
  approveBoothBooking,
  rejectBoothBooking,
  cancelBoothBooking,
  deleteBoothBooking,
  getPendingBoothBookings,
  getBoothBookingById,
  getAllBoothBookings,
  getBoothBookingsByVendor,
  getAcceptedVendors,
  createBoothConflictPoll,
  getBoothPolls,
  getBoothPollById,
  voteBoothPoll,
  closeBoothPoll,
  openBoothPoll,
  removeBoothPollVote,
  deleteBoothPoll,
  getBoothBookingAttendees,
  getBoothBookingAttendeeId,
  downloadBoothBookingAttendeeId,
  archiveEvent,
  exportRegistrants,
  sendBazaarVendorQRCodes,
  sendBoothVendorQRCode,
  getTripParticipants,
  getWorkshopParticipantsForStudent,
} from "../controllers/event.controller.js";

import { createBazaar } from "../controllers/bazaar.controller.js";

import {
  registerToTrip,
  registerToWorkshop,
  cancelTripRegistration,
  cancelWorkshopRegistration,
  getWorkshopParticipants,
} from "../controllers/register.controller.js";

import {
  removeEventFromFavorites,
  addEventToFavorites,
  getMyFavorites,
  dispatchWorkshopCertificates,
} from "../controllers/event.controller.js";

const router = express.Router();

// multer for memory file uploads (attendee IDs)
const upload = multer({ storage: multer.memoryStorage() });

/// GET METHODS ///
router.get("/bazaars", authMiddleware, getBazaars);
router.get("/trips", authMiddleware, getTrips);
router.get(
  "/trips/:tripId/participants",
  authMiddleware,
  getTripParticipants
);
router.get(
  "/workshops/:workshopId/participants",
  authMiddleware,
  getWorkshopParticipantsForStudent
);
router.get("/my-attended", authMiddleware, getMyAttended);
router.get("/favorites/my", authMiddleware, getMyFavorites);
router.get("/workshops", authMiddleware, getWorkshops);
router.get("/conferences", authMiddleware, getConferences);
router.get("/all", authMiddleware, getAllEvents);
router.get("/recommended", authMiddleware, getRecommendedEvents);
router.get("/booths", getBooths);
router.get("/booth-bookings/pending", getPendingBoothBookings);
router.get("/booth-bookings/vendor/:vendorId", getBoothBookingsByVendor);
router.get("/booth-bookings/:bookingId", getBoothBookingById);
router.get("/booth-bookings", getAllBoothBookings);
router.get("/:bazaarId/accepted-vendors", getAcceptedVendors);
router.get("/workshops/pending", getPendingWorkshops);
router.get(
  "/professor/workshops/messages",
  authMiddleware,
  getWorkshopMessages
);
router.get("/booth-polls", authMiddleware, getBoothPolls);
router.get("/booth-polls/:pollId", authMiddleware, getBoothPollById);

// Attendee viewing & ID access (Event Office)
router.get(
  "/booth-booking/:bookingId/attendees",
  authMiddleware,
  getBoothBookingAttendees
);
router.get(
  "/booth-booking/:bookingId/attendees/:index/id",
  authMiddleware,
  getBoothBookingAttendeeId
);
router.get(
  "/booth-booking/:bookingId/attendees/:index/id/download",
  authMiddleware,
  downloadBoothBookingAttendeeId
);

/// POST METHODS ///
router.post("/bazaar", createBazaar);
router.post("/trip", createTrip);
router.post("/workshop", createWorkshop);
router.post("/conference", createConference);
router.post("/booth", createBooth);

router.post(
  "/booth-book",
  upload.fields([{ name: "idFiles", maxCount: 5 }]),
  bookBooth
);
router.post("/:eventId/favorite", authMiddleware, addEventToFavorites);
router.post("/booth-polls", authMiddleware, createBoothConflictPoll);
router.post("/booth-polls/:pollId/vote", authMiddleware, voteBoothPoll);
router.post(
  "/bazaars/:bazaarId/send-vendor-qr",
  authMiddleware,
  sendBazaarVendorQRCodes
);
router.post(
  "/booth-booking/:bookingId/send-qr",
  authMiddleware,
  sendBoothVendorQRCode
);

/// PATCH METHODS ///
router.patch("/bazaar/:id", editBazaar);
router.patch("/trip/:id", updateTrip);
router.patch("/workshop/:id", editWorkshop);
router.patch("/conference/:id", editConference);
router.patch("/booth-booking/:bookingId/approve", approveBoothBooking);
router.patch("/booth-booking/:bookingId/reject", rejectBoothBooking);
router.patch("/workshop/register/:id", registerToWorkshop);
router.patch("/trip/register/:id", registerToTrip);
router.post(
  "/booth-booking/:bookingId/cancel",
  authMiddleware,
  cancelBoothBooking
);
router.delete("/booth-booking/:bookingId", authMiddleware, deleteBoothBooking);

/// DELETE METHODS ///
router.delete("/:eventId/favorite", authMiddleware, removeEventFromFavorites);

router.patch("/workshop/register/:id", authMiddleware, registerToWorkshop);
router.patch("/trip/register/:id", authMiddleware, registerToTrip);
router.post("/workshop/:id/cancel", authMiddleware, cancelWorkshopRegistration);
router.post("/trip/:id/cancel", authMiddleware, cancelTripRegistration);

router.get("/workshops/pending", getPendingWorkshops);
router.patch("/workshops/:id/approve", approveWorkshop);
router.patch("/workshops/:id/reject", rejectWorkshop);
router.patch("/workshops/:id/request-edits", requestWorkshopEdits);
router.patch("/booth-polls/:pollId/close", authMiddleware, closeBoothPoll);
router.patch("/booth-polls/:pollId/open", authMiddleware, openBoothPoll);

/// DELETE METHODS ///
router.delete("/booth-polls/:pollId/vote", authMiddleware, removeBoothPollVote);
router.delete(
  "/feedback/comments/:commentId",
  authMiddleware,
  deleteEventComment
);

router.post("/:eventId/favorite", authMiddleware, addEventToFavorites);

router.post(
  "/workshops/:id/send-certificates",
  authMiddleware,
  async (req, res, next) => {
    try {
      await dispatchWorkshopCertificates(req.params.id);
      res.status(200).json({ message: "Certificate dispatch triggered" });
    } catch (err) {
      next(err);
    }
  }
);

import {
  getPendingWorkshops,
  approveWorkshop,
  rejectWorkshop,
  requestWorkshopEdits,
  getWorkshopMessages,
} from "../controllers/event.controller.js";

import { authMiddleware } from "../middlewares/auth.js";

/// GET METHODS ///
router.get("/bazaars", getBazaars);
router.get("/trips", getTrips);
router.get("/workshops", authMiddleware, getWorkshops);
router.get("/conferences", getConferences);
router.get("/all", getAllEvents);
router.get("/booths", getBooths);
router.get("/booth-bookings/pending", getPendingBoothBookings);
router.get("/booth-bookings/vendor/:vendorId", getBoothBookingsByVendor);
router.get("/booth-bookings/:bookingId", getBoothBookingById);
router.get("/booth-bookings", getAllBoothBookings);
router.get("/:bazaarId/accepted-vendors", getAcceptedVendors);
router.get(
  "/workshops/:workshopId/participants",
  authMiddleware,
  getWorkshopParticipantsForStudent
);

import {
  submitFeedback,
  getEventRatings,
  getEventComments,
  getMyFeedback,
  deleteEventComment,
} from "../controllers/event.controller.js";

// POST create/update feedback (rating + optional comment)
router.post("/feedback", authMiddleware, submitFeedback);
router.get("/feedback/me/:eventId", authMiddleware, getMyFeedback);
router.get("/feedback/ratings/:eventId", authMiddleware, getEventRatings);
router.get("/feedback/comments/:eventId", authMiddleware, getEventComments);

router.delete("/booth-polls/:pollId", authMiddleware, deleteBoothPoll);
router.patch("/:id/archive", authMiddleware, archiveEvent);
router.get("/:id/export-registrants", authMiddleware, exportRegistrants);
/// POST METHODS ///
router.post("/bazaar", createBazaar);
router.post("/trip", createTrip);
router.post("/workshop", createWorkshop);
router.post("/conference", createConference);
router.post("/booth", createBooth);
// router.post("/booth-seed", seedBoothLocations);
router.post("/booth-book", bookBooth);
/// PATCH METHODS ///
router.patch("/bazaar/:id", editBazaar);
router.patch("/trip/:id", updateTrip);
router.patch("/workshop/:id", editWorkshop);
router.patch("/conference/:id", editConference);
router.patch("/booth-booking/:bookingId/approve", approveBoothBooking);
router.patch("/booth-booking/:bookingId/reject", rejectBoothBooking);

/// DELETE METHODS ///
router.delete("/:id", deleteEvent);

router.patch("/workshop/register/:id", registerToWorkshop);
router.patch("/trip/register/:id", registerToTrip);

router.get("/workshops/pending", getPendingWorkshops);
router.patch("/workshops/:id/approve", approveWorkshop);
router.patch("/workshops/:id/reject", rejectWorkshop);
router.patch("/workshops/:id/request-edits", requestWorkshopEdits);

router.get(
  "/professor/workshops/messages",
  authMiddleware,
  getWorkshopMessages
);

export default router;
