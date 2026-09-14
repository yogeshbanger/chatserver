import express from "express";
import {
  accessOrCreateConversation,
  getUserConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getCallHistory,
  toggleReaction,
  logCallHistory,
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { sendMessageValidator } from "../validators/message.validator.js";
import { validate } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post("/conversation", protect, accessOrCreateConversation);
router.get("/conversations", protect, getUserConversations);
router.get("/call-history", protect, getCallHistory);
router.post("/call-log", protect, logCallHistory);
router.get("/:conversationId/messages", protect, getMessages);
router.get("/messages/:conversationId", protect, getMessages);
router.post("/message", protect, sendMessageValidator, validate, sendMessage);
router.post("/messages", protect, sendMessageValidator, validate, sendMessage);
router.post("/message/:messageId/react", protect, toggleReaction);
router.put("/:conversationId/read", protect, markAsRead);
router.delete("/message/:messageId", protect, deleteMessage);

export default router;