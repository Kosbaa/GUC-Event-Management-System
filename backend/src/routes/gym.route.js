import {
  createGymSession,
  editGymSession,
  deleteGymSession,
  getSchedules,
} from "../controllers/gym.controller.js";
import { registerToGymSession } from "../controllers/register.controller.js";
import express from "express";

const router = express.Router();

/// GET METHODS ///
router.get("/", getSchedules);

/// POST METHODS ///
router.post("/", createGymSession);

/// PATCH METHODS ///
router.patch("/:id", editGymSession);
router.patch("/register/:id", registerToGymSession);

/// DELETE METHODS ///
router.delete("/:id", deleteGymSession);

export default router;
