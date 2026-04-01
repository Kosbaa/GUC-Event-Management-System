import express from "express";
import {
  createCourtEvent,
  getCourtEvents,
  reserveCourt,
} from "../controllers/court.controller.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

/// GET METHODS ///
router.get("/", getCourtEvents);
/// POST METHODS ///
router.post("/", createCourtEvent); // Event Office reservation
router.post("/reserve", authMiddleware, reserveCourt); // Student reservation
// /// PATCH METHODS ///

// /// DELETE METHODS ///

// export default router;

export default router;
