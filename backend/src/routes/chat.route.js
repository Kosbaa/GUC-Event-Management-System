import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import {
  getConversation,
  sendMessage,
  getConversations,
} from "../controllers/chat.controller.js";

const router = express.Router();

// Get all conversations for current user
router.get("/conversations", authMiddleware, getConversations);

// Get conversation between current user and another user
router.get("/:userId", authMiddleware, getConversation);

// Send a message to another user
router.post("/:userId", authMiddleware, sendMessage);

export default router;

