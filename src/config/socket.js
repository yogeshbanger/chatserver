import { Server } from "socket.io";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, true);
      },
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Map userId -> socketId
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User comes online
    socket.on("userOnline", async (userId) => {
      if (!userId) return;
      const strUserId = userId.toString();
      onlineUsers.set(strUserId, socket.id);
      socket.userId = strUserId;

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      // Broadcast online users
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log(`✅ User online: ${strUserId}`);
    });

    // Join conversation room
    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
    });

    socket.on("leaveConversation", (conversationId) => {
      socket.leave(conversationId);
    });

    // Typing indicators
    socket.on("typing", ({ conversationId, userId, username }) => {
      socket.to(conversationId).emit("typing", { conversationId, userId, username });
    });

    socket.on("stopTyping", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("stopTyping", { conversationId, userId });
    });

    // Message delivered
    socket.on("messageDelivered", async ({ messageId, userId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { deliveredTo: userId },
        });
      } catch (err) {
        console.error(err);
      }
    });

    // Message read
    socket.on("messageRead", async ({ conversationId, userId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
        socket.to(conversationId).emit("messagesRead", { conversationId, userId });
      } catch (err) {
        console.error(err);
      }
    });

    // WebRTC signaling
    socket.on("callUser", ({ to, from, offer, callType, callerInfo }) => {
      const toSocket = onlineUsers.get(to);
      if (toSocket) {
        io.to(toSocket).emit("incomingCall", { from, offer, callType, callerInfo });
      }
    });

    socket.on("answerCall", ({ to, answer }) => {
      const toSocket = onlineUsers.get(to);
      if (toSocket) {
        io.to(toSocket).emit("callAnswered", { answer });
      }
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
      const toSocket = onlineUsers.get(to);
      if (toSocket) {
        io.to(toSocket).emit("iceCandidate", { candidate });
      }
    });

    socket.on("endCall", ({ to }) => {
      const toSocket = onlineUsers.get(to);
      if (toSocket) io.to(toSocket).emit("callEnded");
    });

    socket.on("rejectCall", ({ to }) => {
      const toSocket = onlineUsers.get(to);
      if (toSocket) io.to(toSocket).emit("callRejected");
    });

    // Real-time friend requests
    socket.on("sendFriendRequest", ({ to, request }) => {
      const targetId = to?.toString();
      const toSocket = onlineUsers.get(targetId);
      if (toSocket) io.to(toSocket).emit("friendRequestReceived", request);
    });

    socket.on("acceptFriendRequest", ({ to, friendInfo }) => {
      const targetId = to?.toString();
      const toSocket = onlineUsers.get(targetId);
      if (toSocket) io.to(toSocket).emit("friendRequestAccepted", friendInfo);
    });

    // Group call events
    socket.on("joinGroupCall", ({ groupId, userId, peerId }) => {
      socket.join(`call_${groupId}`);
      socket.to(`call_${groupId}`).emit("userJoinedCall", { userId, peerId, socketId: socket.id });
    });

    socket.on("groupSignal", ({ toSocketId, signal, fromUserId }) => {
      io.to(toSocketId).emit("groupSignal", { signal, fromUserId, fromSocketId: socket.id });
    });

    socket.on("leaveGroupCall", ({ groupId, userId }) => {
      socket.leave(`call_${groupId}`);
      socket.to(`call_${groupId}`).emit("userLeftCall", { userId, socketId: socket.id });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      }
    });
  });

  return { io, onlineUsers };
};