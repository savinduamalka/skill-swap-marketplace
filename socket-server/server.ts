import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);

// Create PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Initialize Prisma with adapter
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ==================== ONLINE TRACKING SYSTEM ====================
// Like WhatsApp Web, Facebook, Discord - Enterprise-grade presence tracking

// Track online users: Map<userId, { socketId: string, connectionIds: Set<string>, lastHeartbeat: number }>
const onlineUsers = new Map<
  string,
  {
    socketIds: Set<string>;
    lastHeartbeat: number;
    deviceInfo?: string;
    ipAddress?: string;
  }
>();

// Heartbeat interval (30 seconds) - users must ping at least this often
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
// Offline timeout (90 seconds) - if no heartbeat received, mark as offline
const OFFLINE_TIMEOUT = 90000; // 90 seconds
// Debounce online status changes (1 second) - prevent rapid toggles due to network hiccups
const STATUS_CHANGE_DEBOUNCE = 1000; // 1 second

// Track status change debouncing: Map<userId, lastStatusChangeTime>
const lastStatusChangeTime = new Map<string, number>();

// Cleanup interval - run every 10 seconds to check for stale connections
const cleanupInterval = setInterval(async () => {
  const now = Date.now();
  const usersToMarkOffline = [];

  for (const [userId, userInfo] of onlineUsers.entries()) {
    const timeSinceHeartbeat = now - userInfo.lastHeartbeat;

    // If no heartbeat in OFFLINE_TIMEOUT, mark as offline
    if (timeSinceHeartbeat > OFFLINE_TIMEOUT) {
      usersToMarkOffline.push(userId);
    }
  }

  // Mark users as offline in database and broadcast
  for (const userId of usersToMarkOffline) {
    await markUserOffline(userId);
  }
}, 10000);

// Function to safely mark user online with debouncing
async function markUserOnline(
  userId: string,
  deviceInfo?: string,
  ipAddress?: string
) {
  const now = Date.now();
  const lastChange = lastStatusChangeTime.get(userId) || 0;

  // Debounce: only update if enough time has passed since last change
  if (now - lastChange < STATUS_CHANGE_DEBOUNCE) {
    return; // Skip this update
  }

  try {
    // Update user in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: true,
        lastSeenAt: new Date(),
        lastHeartbeatAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        image: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    // Log status change for analytics
    await prisma.userOnlineStatus.create({
      data: {
        userId,
        isOnline: true,
        deviceInfo,
        ipAddress,
      },
    });

    lastStatusChangeTime.set(userId, now);

    // Broadcast to all clients (everyone needs to know user is online)
    io.emit('user_online_status', {
      userId,
      isOnline: true,
      lastSeenAt: user.lastSeenAt,
      timestamp: new Date(),
    });

    console.log(`✓ User marked ONLINE: ${userId}`);
  } catch (error) {
    console.error('Error marking user online:', error);
  }
}

// Function to safely mark user offline
async function markUserOffline(userId: string) {
  const now = Date.now();
  const lastChange = lastStatusChangeTime.get(userId) || 0;

  // Debounce: only update if enough time has passed
  if (now - lastChange < STATUS_CHANGE_DEBOUNCE) {
    return;
  }

  // Remove from in-memory tracking
  onlineUsers.delete(userId);

  try {
    // Update user in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline: false,
        lastSeenAt: new Date(),
        connectionCount: 0,
      },
      select: { id: true, name: true, isOnline: true, lastSeenAt: true },
    });

    // Log status change for analytics
    await prisma.userOnlineStatus.create({
      data: {
        userId,
        isOnline: false,
      },
    });

    lastStatusChangeTime.set(userId, now);

    // Broadcast to all clients
    io.emit('user_offline_status', {
      userId,
      isOnline: false,
      lastSeenAt: user.lastSeenAt,
      timestamp: new Date(),
    });

    console.log(`✗ User marked OFFLINE: ${userId}`);
  } catch (error) {
    console.error('Error marking user offline:', error);
  }
}

// Ensure this matches your Next.js port
const io = new Server(server, {
  cors: {
    origin: process.env.NEXTJS_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Add ping/pong configuration for WebSocket level heartbeat
  pingInterval: HEARTBEAT_INTERVAL,
  pingTimeout: OFFLINE_TIMEOUT,
});

// Middleware: Authenticate the Socket Connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token'));
  }

  try {
    // Verify using the SHARED secret
    const decoded = jwt.verify(
      token,
      process.env.SOCKET_SECRET as string
    ) as any;
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  const deviceInfo = socket.handshake.headers['user-agent'];
  const ipAddress = socket.handshake.address;

  console.log(`[CONNECTION] User connected: ${userId} (${socket.id})`);

  // ==================== CONNECTION MANAGEMENT ====================
  // Track this user with multiple socket connections support
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, {
      socketIds: new Set([socket.id]),
      lastHeartbeat: Date.now(),
      deviceInfo,
      ipAddress,
    });
    // User is coming online for the first time
    markUserOnline(userId, deviceInfo, ipAddress);
  } else {
    // User already has connections, just add this socket
    const userInfo = onlineUsers.get(userId)!;
    userInfo.socketIds.add(socket.id);
    userInfo.lastHeartbeat = Date.now();
  }

  // 1. Join a room specific to this user (for receiving messages and calls)
  socket.join(userId);

  // Broadcast user online status to all connected clients
  io.emit('user_online_status', {
    userId,
    isOnline: true,
    timestamp: new Date(),
  });

  // 2. Join specific connection rooms
  socket.on('join_chat', (connectionId) => {
    socket.join(connectionId);
  });

  // ==================== HEARTBEAT/PING MECHANISM ====================
  // Like WhatsApp: client sends heartbeat every 30 seconds
  socket.on('heartbeat', () => {
    const userInfo = onlineUsers.get(userId);
    if (userInfo) {
      userInfo.lastHeartbeat = Date.now();
      // Update database with latest heartbeat
      prisma.user
        .update({
          where: { id: userId },
          data: { lastHeartbeatAt: new Date() },
        })
        .catch((err) => console.error('Error updating heartbeat:', err));
    }
  });

  // WebSocket-level pong (automatic response to ping)
  socket.on('pong', () => {
    const userInfo = onlineUsers.get(userId);
    if (userInfo) {
      userInfo.lastHeartbeat = Date.now();
    }
  });

  // 3. Handle Sending Messages (with media support)
  socket.on('send_message', async (payload) => {
    // Payload: { connectionId, content, tempId, mediaUrl?, mediaType?, mediaName?, mediaSize?, mediaThumbnail? }
    const { connectionId, content, tempId, mediaUrl, mediaType, mediaName, mediaSize, mediaThumbnail } = payload;

    console.log('[SEND_MESSAGE] Received payload:', { 
      connectionId, 
      content: content?.substring(0, 50), 
      tempId, 
      userId,
      hasMedia: !!mediaUrl 
    });

    try {
      // VALIDATION: Ensure Connection Exists and is Active
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
        include: {
          user1: true,
          user2: true,
        },
      });

      console.log('[SEND_MESSAGE] Connection found:', connection ? { id: connection.id, status: connection.status, user1Id: connection.user1Id, user2Id: connection.user2Id } : 'null');

      // Check if connection exists, is active, and user is part of it
      if (!connection || connection.status !== 'ACTIVE') {
        console.log('[SEND_MESSAGE] Error: Connection not active or not found');
        socket.emit('error', { message: 'Connection is not active.' });
        return;
      }

      const isUserPartOfConnection =
        connection.user1Id === userId || connection.user2Id === userId;
      if (!isUserPartOfConnection) {
        console.log('[SEND_MESSAGE] Error: User not part of connection');
        socket.emit('error', {
          message: 'You are not part of this connection.',
        });
        return;
      }

      // Determine Receiver
      const receiverId =
        connection.user1Id === userId ? connection.user2Id : connection.user1Id;

      console.log('[SEND_MESSAGE] Creating message for receiver:', receiverId);

      // A. Save to Database (with media fields)
      const newMessage = await prisma.message.create({
        data: {
          content: content || '',
          senderId: userId,
          receiverId: receiverId,
          connectionId: connectionId,
          isRead: false,
          // Media fields
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          mediaName: mediaName || null,
          mediaSize: mediaSize || null,
          mediaThumbnail: mediaThumbnail || null,
        },
      });

      console.log('[SEND_MESSAGE] Message saved successfully:', newMessage.id, mediaUrl ? '(with media)' : '');

      // B. Emit to Receiver (Real-time)
      io.to(receiverId).emit('receive_message', newMessage);

      // C. Acknowledge Sender
      socket.emit('message_sent', { tempId, savedMessage: newMessage });
      console.log('[SEND_MESSAGE] Message sent event emitted');
    } catch (error) {
      console.error('[SEND_MESSAGE] Error sending message:', error);
      socket.emit('error', { message: 'Message failed to send.' });
    }
  });

  // 4. Handle Message Read Receipts
  socket.on('mark_message_read', async (payload) => {
    const { messageId, connectionId } = payload;

    try {
      // Update message as read
      const message = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
      });

      // Notify sender that message was read
      io.to(message.senderId).emit('message_read', {
        messageId,
        connectionId,
        readBy: userId,
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  // 5. Handle Message Deletion (notify other user in real-time)
  socket.on('delete_messages', async (payload) => {
    const { connectionId, messageIds, deletedBy } = payload;
    console.log('[DELETE_MESSAGES] Received:', { connectionId, messageIds: messageIds?.length, deletedBy });

    try {
      // Get connection to find the other user
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        console.log('[DELETE_MESSAGES] Connection not found');
        return;
      }

      // Determine the other user
      const otherUserId = connection.user1Id === userId ? connection.user2Id : connection.user1Id;

      // Notify the other user about deleted messages
      io.to(otherUserId).emit('messages_deleted', {
        connectionId,
        messageIds,
        deletedBy: userId,
      });

      console.log('[DELETE_MESSAGES] Notified user:', otherUserId);
    } catch (error) {
      console.error('[DELETE_MESSAGES] Error:', error);
    }
  });

  // 6. Handle Conversation Clear (notify other user in real-time)
  socket.on('clear_conversation', async (payload) => {
    const { connectionId } = payload;
    console.log('[CLEAR_CONVERSATION] Received:', { connectionId });

    try {
      // Get connection to find the other user
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        console.log('[CLEAR_CONVERSATION] Connection not found');
        return;
      }

      // Determine the other user
      const otherUserId = connection.user1Id === userId ? connection.user2Id : connection.user1Id;

      // Notify the other user about cleared conversation
      io.to(otherUserId).emit('conversation_cleared', {
        connectionId,
        clearedBy: userId,
      });

      console.log('[CLEAR_CONVERSATION] Notified user:', otherUserId);
    } catch (error) {
      console.error('[CLEAR_CONVERSATION] Error:', error);
    }
  });

  // ==================== LIVEKIT CALL SIGNALING ====================
  // Initiate call (notify recipient)
  socket.on('call:initiate', async (payload) => {
    const { recipientId, callType, roomName } = payload;
    console.log(
      `[CALL] ${userId} → ${recipientId} (${callType} call via LiveKit)`
    );

    // Verify receiver is online before routing call
    const receiverInfo = onlineUsers.get(recipientId);
    if (!receiverInfo) {
      socket.emit('call:failed', {
        reason: 'Recipient is offline',
        code: 'USER_OFFLINE',
      });
      return;
    }

    // Get caller info from database
    try {
      const caller = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true },
      });

      // Notify recipient of incoming call
      io.to(recipientId).emit('call:incoming', {
        callerId: userId,
        callerName: caller?.name || 'User',
        callerImage: caller?.image,
        callType,
        roomName,
        connectionId: roomName,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[CALL] Error getting caller info:', error);
      socket.emit('call:failed', {
        reason: 'Failed to initiate call',
      });
    }
  });

  // Answer call (notify caller)
  socket.on('call:answer', (payload) => {
    const { callerId, connectionId } = payload;
    console.log(`[CALL] ${userId} answered call from ${callerId}`);

    // Notify caller that call was accepted
    io.to(callerId).emit('call:accepted', {
      participantId: userId,
      connectionId,
      timestamp: new Date(),
    });
  });

  // Reject call (notify caller)
  socket.on('call:reject', (payload) => {
    const { callerId, connectionId } = payload;
    console.log(`[CALL] ${userId} rejected call from ${callerId}`);

    // Notify the caller (the person who initiated the call) that the callee rejected
    io.to(callerId).emit('call:rejected', {
      participantId: userId, // The person who rejected
      connectionId,
      timestamp: new Date(),
    });

    // Also notify the rejector (receiver) to clean up their state
    socket.emit('call:rejected', {
      participantId: callerId, // The original caller
      connectionId,
      timestamp: new Date(),
    });
  });

  // End call (notify other participant)
  socket.on('call:end', (payload) => {
    const { participantId, connectionId } = payload;
    console.log(`[CALL] ${userId} ended call with ${participantId}`);

    if (participantId) {
      // Notify the other participant that the call ended
      io.to(participantId).emit('call:ended', {
        participantId: userId, // The person who ended it
        connectionId,
        timestamp: new Date(),
      });
    }

    // Also notify the call-ender to clean up their state
    socket.emit('call:ended', {
      participantId,
      connectionId,
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', () => {
    const userInfo = onlineUsers.get(userId);

    if (userInfo) {
      // Remove this socket from the user's connections
      userInfo.socketIds.delete(socket.id);

      // Only mark as offline if user has no more connections
      if (userInfo.socketIds.size === 0) {
        console.log(
          `[DISCONNECT] User offline: ${userId} (no more connections)`
        );
        markUserOffline(userId);
      } else {
        console.log(
          `[DISCONNECT] Socket closed but user still online: ${userId} (${userInfo.socketIds.size} connections remain)`
        );
        // Update connection count in database
        prisma.user
          .update({
            where: { id: userId },
            data: { connectionCount: userInfo.socketIds.size },
          })
          .catch((err) =>
            console.error('Error updating connection count:', err)
          );
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Socket Server running on port ${PORT}`);
  console.log(`📡 Heartbeat interval: ${HEARTBEAT_INTERVAL}ms`);
  console.log(`⏱️  Offline timeout: ${OFFLINE_TIMEOUT}ms`);
  console.log(`🔄 Status debounce: ${STATUS_CHANGE_DEBOUNCE}ms`);
});

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('Server closed');
    prisma.$disconnect();
    process.exit(0);
  });
});
