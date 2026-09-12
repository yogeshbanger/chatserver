import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const senderId = req.user._id;

  if (userId === senderId.toString()) {
    return sendError(res, 400, "You cannot add yourself");
  }

  const receiver = await User.findById(userId);
  if (!receiver) return sendError(res, 404, "User not found");

  if (req.user.friends.includes(userId)) {
    return sendError(res, 400, "Already friends");
  }

  const existing = await FriendRequest.findOne({
    $or: [
      { sender: senderId, receiver: userId, status: "pending" },
      { sender: userId, receiver: senderId, status: "pending" },
    ],
  });

  if (existing) {
    return sendError(res, 400, "Friend request already exists");
  }

  const request = await FriendRequest.create({
    sender: senderId,
    receiver: userId,
  });

  await Notification.create({
    recipient: userId,
    sender: senderId,
    type: "friend_request",
    message: `${req.user.fullName} sent you a friend request`,
    link: `/friends/requests`,
  });

  const populated = await request.populate("sender", "username fullName profilePicture");
  return sendSuccess(res, 201, "Friend request sent", populated);
});

export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const request = await FriendRequest.findById(requestId);
  if (!request) return sendError(res, 404, "Request not found");

  if (request.receiver.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "Not authorized");
  }

  if (request.status !== "pending") {
    return sendError(res, 400, "Request already handled");
  }

  request.status = "accepted";
  await request.save();

  await User.findByIdAndUpdate(request.sender, {
    $addToSet: { friends: request.receiver },
  });
  await User.findByIdAndUpdate(request.receiver, {
    $addToSet: { friends: request.sender },
  });

  await Notification.create({
    recipient: request.sender,
    sender: request.receiver,
    type: "friend_accept",
    message: `${req.user.fullName} accepted your friend request`,
    link: `/profile/${req.user._id}`,
  });

  return sendSuccess(res, 200, "Friend request accepted");
});

export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const request = await FriendRequest.findById(requestId);
  if (!request) return sendError(res, 404, "Request not found");

  if (request.receiver.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "Not authorized");
  }

  request.status = "rejected";
  await request.save();

  return sendSuccess(res, 200, "Friend request rejected");
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  const requests = await FriendRequest.find({
    receiver: req.user._id,
    status: "pending",
  })
    .populate("sender", "username fullName profilePicture bio")
    .sort("-createdAt");

  return sendSuccess(res, 200, "Pending requests fetched", requests);
});

export const getSentRequests = asyncHandler(async (req, res) => {
  const requests = await FriendRequest.find({
    sender: req.user._id,
    status: "pending",
  })
    .populate("receiver", "username fullName profilePicture bio")
    .sort("-createdAt");

  return sendSuccess(res, 200, "Sent requests fetched", requests);
});

export const getFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "friends",
    "username fullName profilePicture bio isOnline lastSeen"
  );
  return sendSuccess(res, 200, "Friends fetched", user.friends);
});

export const removeFriend = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { friends: userId },
  });
  await User.findByIdAndUpdate(userId, {
    $pull: { friends: req.user._id },
  });

  // Delete any friend request between them
  await FriendRequest.deleteMany({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id },
    ],
  });

  return sendSuccess(res, 200, "Friend removed");
});