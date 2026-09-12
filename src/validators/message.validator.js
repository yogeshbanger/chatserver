import { body } from "express-validator";

export const sendMessageValidator = [
  body("conversationId").notEmpty().withMessage("Conversation ID is required"),
  body("content").optional().isLength({ max: 5000 }),
  body("type")
    .optional()
    .isIn(["text", "image", "file", "video", "audio"])
    .withMessage("Invalid message type"),
];