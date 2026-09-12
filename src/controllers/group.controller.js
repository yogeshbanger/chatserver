import Group from "../models/Group.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, members = [] } = req.body;

  if (!name) return sendError(res, 400, "Group name required");

  const allMembers = [...new Set([...members, req.user._id.toString()])];

  let avatar = "";
  let avatarId = "";
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "chatapp/groups", "image");
    avatar = result.secure_url;
    avatarId = result.public_id;
  }

  const group = await Group.create({
    name,
    description,
    members: allMembers,
    admin: req.user._id,
    avatar,
    avatarId,
  });

  const conversation = await Conversation.create({
    isGroup: true,
    participants: allMembers,
    group: group._id,
  });

  group.conversation = conversation._id;
  await group.save();

  await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    type: "system",
    content: `${req.user.fullName} created the group "${name}"`,
  });

  const populated = await Group.findById(group._id)
    .populate("members", "username fullName profilePicture isOnline")
    .populate("admin", "username fullName profilePicture");

  return sendSuccess(res, 201, "Group created", populated);
});

export const getUserGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id })
    .populate("members", "username fullName profilePicture isOnline")
    .populate("admin", "username fullName profilePicture")
    .sort("-updatedAt");

  return sendSuccess(res, 200, "Groups fetched", groups);
});

export const getGroupById = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id)
    .populate("members", "username fullName profilePicture isOnline lastSeen")
    .populate("admin", "username fullName profilePicture");

  if (!group) return sendError(res, 404, "Group not found");

  if (!group.members.some((m) => m._id.toString() === req.user._id.toString())) {
    return sendError(res, 403, "Not a member");
  }

  return sendSuccess(res, 200, "Group fetched", group);
});

export const addGroupMembers = asyncHandler(async (req, res) => {
  const { members } = req.body;
  const group = await Group.findById(req.params.id);
  if (!group) return sendError(res, 404, "Group not found");

  if (group.admin.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "Only admin can add members");
  }

  group.members = [...new Set([...group.members.map(String), ...members])];
  await group.save();

  await Conversation.findByIdAndUpdate(group.conversation, {
    $addToSet: { participants: { $each: members } },
  });

  return sendSuccess(res, 200, "Members added", group);
});

export const removeGroupMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const group = await Group.findById(req.params.id);
  if (!group) return sendError(res, 404, "Group not found");

  if (group.admin.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "Only admin can remove members");
  }

  group.members = group.members.filter((m) => m.toString() !== userId);
  await group.save();

  await Conversation.findByIdAndUpdate(group.conversation, {
    $pull: { participants: userId },
  });

  return sendSuccess(res, 200, "Member removed", group);
});

export const updateGroup = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const group = await Group.findById(req.params.id);
  if (!group) return sendError(res, 404, "Group not found");

  if (group.admin.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "Only admin can update group");
  }

  if (name) group.name = name;
  if (description !== undefined) group.description = description;

  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, "chatapp/groups", "image");
    group.avatar = result.secure_url;
    group.avatarId = result.public_id;
  }

  await group.save();
  return sendSuccess(res, 200, "Group updated", group);
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) return sendError(res, 404, "Group not found");

  group.members = group.members.filter(
    (m) => m.toString() !== req.user._id.toString()
  );

  // If admin leaves, promote next member
  if (group.admin.toString() === req.user._id.toString() && group.members.length > 0) {
    group.admin = group.members[0];
  }

  await group.save();
  await Conversation.findByIdAndUpdate(group.conversation, {
    $pull: { participants: req.user._id },
  });

  return sendSuccess(res, 200, "Left group");
});