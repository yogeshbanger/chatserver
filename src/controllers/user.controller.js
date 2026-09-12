import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/uploadToCloudinary.js";

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, bio, username } = req.body;
  const user = req.user;

  if (fullName) user.fullName = fullName;
  if (bio !== undefined) user.bio = bio;
  if (username) {
    const exists = await User.findOne({ username, _id: { $ne: user._id } });
    if (exists) return sendError(res, 400, "Username already taken");
    user.username = username;
  }

  await user.save();
  return sendSuccess(res, 200, "Profile updated", user);
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, 400, "No file uploaded");

  const user = req.user;
  if (user.profilePictureId) {
    await deleteFromCloudinary(user.profilePictureId);
  }

  const result = await uploadToCloudinary(req.file.buffer, "chatapp/avatars", "image");
  user.profilePicture = result.secure_url;
  user.profilePictureId = result.public_id;
  await user.save();

  return sendSuccess(res, 200, "Avatar updated", user);
});

export const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return sendSuccess(res, 200, "Users fetched", []);
  }

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { username: { $regex: q, $options: "i" } },
      { fullName: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  })
    .select("username fullName email profilePicture bio isOnline lastSeen")
    .limit(20);

  const FriendRequest = (await import("../models/FriendRequest.js")).default;
  const userFriendsStr = (req.user.friends || []).map((f) => f.toString());

  const usersWithStatus = await Promise.all(
    users.map(async (u) => {
      const uId = u._id.toString();
      const isFriend = userFriendsStr.includes(uId);

      let requestStatus = "none";
      let requestId = null;

      if (isFriend) {
        requestStatus = "friends";
      } else {
        const reqDoc = await FriendRequest.findOne({
          $or: [
            { sender: req.user._id, receiver: u._id, status: "pending" },
            { sender: u._id, receiver: req.user._id, status: "pending" },
          ],
        });
        if (reqDoc) {
          requestStatus =
            reqDoc.sender.toString() === req.user._id.toString()
              ? "pending_sent"
              : "pending_received";
          requestId = reqDoc._id;
        }
      }

      return {
        ...u.toObject(),
        isFriend,
        requestStatus,
        requestId,
      };
    })
  );

  return sendSuccess(res, 200, "Users fetched", usersWithStatus);
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    "username fullName email profilePicture bio isOnline lastSeen createdAt"
  );
  if (!user) return sendError(res, 404, "User not found");
  return sendSuccess(res, 200, "User fetched", user);
});

export const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user._id.toString()) {
    return sendError(res, 400, "Cannot block yourself");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { blockedUsers: userId },
  });

  return sendSuccess(res, 200, "User blocked");
});

export const unblockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { blockedUsers: userId },
  });

  return sendSuccess(res, 200, "User unblocked");
});

export const getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "blockedUsers",
    "username fullName profilePicture email"
  );
  return sendSuccess(res, 200, "Blocked users fetched", user.blockedUsers || []);
});