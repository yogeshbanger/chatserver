import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingRequests,
  getSentRequests,
  getFriends,
  removeFriend,
} from "../controllers/friend.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/request/:userId", protect, sendFriendRequest);
router.put("/accept/:requestId", protect, acceptFriendRequest);
router.post("/request/:requestId/accept", protect, acceptFriendRequest);
router.put("/reject/:requestId", protect, rejectFriendRequest);
router.post("/request/:requestId/reject", protect, rejectFriendRequest);
router.get("/requests", protect, getPendingRequests);
router.get("/requests/pending", protect, getPendingRequests);
router.get("/sent", protect, getSentRequests);
router.get("/", protect, getFriends);
router.delete("/:userId", protect, removeFriend);

export default router;