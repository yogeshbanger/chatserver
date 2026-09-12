import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const accessOrCreateConversation = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const currentUserId = req.user._id;

  if (!userId) return sendError(res, 400, "userId required");

  const otherUser = await User.findById(userId);
  if (!otherUser) return sendError(res, 404, "User not found");

  const userFriendsStr = (req.user.friends || []).map((f) => f.toString());
  if (!userFriendsStr.includes(userId.toString())) {
    return sendError(res, 403, "You must send and accept a friend request before starting a chat or call");
  }

  let conversation = await Conversation.findOne({
    isGroup: false,
    participants: { $all: [currentUserId, userId], $size: 2 },
  })
    .populate("participants", "username fullName profilePicture isOnline lastSeen")
    .populate("lastMessage");

  if (!conversation) {
    conversation = await Conversation.create({
      isGroup: false,
      participants: [currentUserId, userId],
    });
    conversation = await conversation.populate(
      "participants",
      "username fullName profilePicture isOnline lastSeen"
    );
  }

  return sendSuccess(res, 200, "Conversation ready", conversation);
});

export const getUserConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  })
    .populate("participants", "username fullName profilePicture isOnline lastSeen")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username fullName" },
    })
    .sort("-updatedAt");

  return sendSuccess(res, 200, "Conversations fetched", conversations);
});

export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return sendError(res, 404, "Conversation not found");

  if (!conversation.participants.some((p) => p.toString() === req.user._id.toString())) {
    return sendError(res, 403, "Not a participant");
  }

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: req.user._id },
  })
    .populate("sender", "username fullName profilePicture")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return sendSuccess(res, 200, "Messages fetched", messages.reverse());
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, content, type = "text", fileUrl, fileName, fileSize } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return sendError(res, 404, "Conversation not found");

  if (!conversation.participants.some((p) => p.toString() === req.user._id.toString())) {
    return sendError(res, 403, "Not a participant");
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: req.user._id,
    content,
    type,
    fileUrl,
    fileName,
    fileSize,
    deliveredTo: conversation.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    ),
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  const populated = await message.populate("sender", "username fullName profilePicture");

  // Emit socket event
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");
  if (io) {
    // Broadcast to conversation room
    io.to(conversationId.toString()).emit("newMessage", populated);

    // Also broadcast to online participant sockets directly for sidebar updates
    if (onlineUsers) {
      conversation.participants.forEach((participantId) => {
        const pid = participantId.toString();
        if (pid !== req.user._id.toString()) {
          const socketId = onlineUsers.get(pid);
          if (socketId) io.to(socketId).emit("newMessage", populated);
        }
      });
    }
  }

  return sendSuccess(res, 201, "Message sent", populated);
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  await Message.updateMany(
    {
      conversation: conversationId,
      readBy: { $ne: req.user._id },
    },
    { $addToSet: { readBy: req.user._id } }
  );
  return sendSuccess(res, 200, "Marked as read");
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const message = await Message.findById(messageId);
  if (!message) return sendError(res, 404, "Message not found");

  if (message.sender.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "You can only delete your own messages");
  }

  await Message.findByIdAndDelete(messageId);
  return sendSuccess(res, 200, "Message deleted");
});

export const getCallHistory = asyncHandler(async (req, res) => {
  const userConversations = await Conversation.find({
    participants: req.user._id,
  }).select("_id participants");

  const conversationIds = userConversations.map((c) => c._id);

  const callMessages = await Message.find({
    conversation: { $in: conversationIds },
    type: "system",
  })
    .populate("sender", "username fullName profilePicture")
    .populate({
      path: "conversation",
      populate: {
        path: "participants",
        select: "username fullName profilePicture isOnline lastSeen",
      },
    })
    .sort("-createdAt")
    .limit(50);

  return sendSuccess(res, 200, "Call history fetched", callMessages);
});