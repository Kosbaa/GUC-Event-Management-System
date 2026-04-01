import express from "express";
import multer from "multer";
import {
  createBazaar,
  getAllBazaars,
  getVendorRequestsForBazaar,
  acceptVendorRequest,
  rejectVendorRequest,
  applyToBazaar,
  cancelVendorBazaarApplication,
  removeVendorBazaarApplication,
  getAcceptedBazaarsForVendor,
  getPendingOrRejectedForVendor,
  getAllVendorRequests,
  getBazaarVendorRequestAttendees,
  getBazaarVendorAttendeeId,
  downloadBazaarVendorAttendeeId,
} from "../controllers/bazaar.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// multer middleware for attendee ID uploads (memory)
const upload = multer({ storage: multer.memoryStorage() });

/* ===========================
   ADMIN / EVENT OFFICE ROUTES
=========================== */

// Admin/Event Office: Create bazaar
router.post("/create", createBazaar);

// Admin: View all bazaars
router.get("/all", getAllBazaars);

// Event Office: View vendor requests for a specific bazaar
router.get("/:bazaarId/vendor-requests", getVendorRequestsForBazaar);

router.get("/all-requests", getAllVendorRequests);

// // Event Office: Accept or reject a vendor request
// router.patch("/:bazaarId/vendor/:vendorId/status", updateVendorRequestStatus);

router.patch("/:bazaarId/vendor/:vendorId/accept", acceptVendorRequest);
router.patch("/:bazaarId/vendor/:vendorId/reject", rejectVendorRequest);

// Event Office: View/Download attendee IDs for a vendor's bazaar application
router.get(
  "/:bazaarId/vendor/:vendorId/attendees",
  authMiddleware,
  getBazaarVendorRequestAttendees
);
router.get(
  "/:bazaarId/vendor/:vendorId/attendees/:index/id",
  authMiddleware,
  getBazaarVendorAttendeeId
);
router.get(
  "/:bazaarId/vendor/:vendorId/attendees/:index/id/download",
  authMiddleware,
  downloadBazaarVendorAttendeeId
);

/* ===========================
   VENDOR ROUTES
=========================== */

// Vendor: Apply to join a bazaar
// Accept up to 5 attendee ID files under field name 'idFiles' (order should match attendees array)
router.post(
  "/vendors/:vendorId/bazaars/:bazaarId/apply",
  upload.fields([{ name: "idFiles", maxCount: 5 }]),
  applyToBazaar
);
router.post("/vendors/:vendorId/bazaars/:bazaarId/apply", applyToBazaar);
router.post(
  "/vendors/:vendorId/bazaars/:bazaarId/cancel",
  authMiddleware,
  cancelVendorBazaarApplication
);
router.delete(
  "/vendors/:vendorId/bazaars/:bazaarId",
  authMiddleware,
  removeVendorBazaarApplication
);
// Vendor: View accepted bazaars
router.get("/vendor/:vendorId/accepted", getAcceptedBazaarsForVendor);

// Vendor: View pending or rejected applications
router.get("/vendor/:vendorId/pending-rejected", getPendingOrRejectedForVendor);

export default router;
