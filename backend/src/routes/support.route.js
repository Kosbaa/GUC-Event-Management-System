import express from "express";
import { chatWithSupport, optionalAuth } from "../controllers/support.controller.js";

const router = express.Router();

router.post("/chat", optionalAuth, chatWithSupport);

export default router;
