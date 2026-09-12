import Notification from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate("sender", "username fullName profilePicture")
    .sort("-createdAt")
    .limit(50);

  return sendSuccess(res, 200, "Notifications fetched", notifications);
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findById(id);
  if (!notification) return sendError(res, 404, "Notification not found");
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "Not authorized");
  }
  notification.isRead = true;
  await notification.save();
  return sendSuccess(res, 200, "Marked as read", notification);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );
  return sendSuccess(res, 200, "All marked as read");
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Notification.findOneAndDelete({
    _id: id,
    recipient: req.user._id,
  });
  return sendSuccess(res, 200, "Notification deleted");
});