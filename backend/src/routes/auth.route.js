import express from "express";
import {
  signup,
  login,
  verify,
  approveUser,
  vendorSignup,
  createAdmin,
  createEventOffice,
  deleteAdmin,
  deleteEventOffice,
  getUsersStatus,
  me,
  getAdminsEvent,
  getPendingUsers,
  getUserRegistrations,
  getVendorLogo,
  getVendorTaxCard,
  reviewVendorDocument,
  approveVendorAccount,
} from "../controllers/auth.controller.js";
import { blockUser, unblockUser } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

/// GET METHODS ///
router.get("/verify/:token", verify);
router.get("/users/status", getUsersStatus);
router.get("/me", authMiddleware, me);
router.get("/admins", getAdminsEvent);
router.get("/pending-users", getPendingUsers);
router.get("/my-registrations", authMiddleware, getUserRegistrations);
router.get("/vendor/:id/logo", getVendorLogo);
router.get("/vendor/:id/taxcard", getVendorTaxCard);

/// POST METHODS ///
router.post("/signup", signup);
router.post("/vendor-signup", vendorSignup);
router.post("/login", login);
router.post("/create-admin", createAdmin);
router.post("/create-event-office", createEventOffice);
router.post("/approve/:id", approveUser);
router.post("/vendor/:id/review", authMiddleware, reviewVendorDocument);
router.post("/vendor/:id/approve-account", authMiddleware, approveVendorAccount);

/// DELETE METHODS ///
router.delete("/delete-admin/:id", deleteAdmin);
router.delete("/delete-event-office/:id", deleteEventOffice);

/// PATCH METHODS ///
router.patch("/users/:userId/block", authMiddleware, blockUser);
router.patch("/users/:userId/unblock", authMiddleware, unblockUser);

export default router;
