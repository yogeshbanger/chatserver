import express from "express";
import {
  updateProfile,
  uploadAvatar,
  searchUsers,
  getUserById,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.put("/profile", protect, updateProfile);
router.put("/avatar", protect, upload.single("avatar"), uploadAvatar);
router.get("/search", protect, searchUsers);
router.get("/blocked", protect, getBlockedUsers);
router.post("/block/:userId", protect, blockUser);
router.post("/unblock/:userId", protect, unblockUser);
router.get("/:id", protect, getUserById);

export default router;