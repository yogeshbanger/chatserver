import express from "express";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addGroupMembers,
  removeGroupMember,
  updateGroup,
  leaveGroup,
} from "../controllers/group.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { createGroupValidator } from "../validators/group.validator.js";
import { validate } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  upload.single("avatar"),
  createGroupValidator,
  validate,
  createGroup
);
router.get("/", protect, getUserGroups);
router.get("/:id", protect, getGroupById);
router.put("/:id", protect, upload.single("avatar"), updateGroup);
router.post("/:id/members", protect, addGroupMembers);
router.delete("/:id/members/:userId", protect, removeGroupMember);
router.delete("/:id/leave", protect, leaveGroup);

export default router;