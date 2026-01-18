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

// Track online users: Map<userId, socketId>
const onlineUsers = new Map<string, string>();

// Ensure this matches your Next.js port
const io = new Server(server, {
  cors: {
    origin: process.env.NEXTJS_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
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
  console.log(`User connected: ${userId}`);

  // Track this user as online
  onlineUsers.set(userId, socket.id);

  // 1. Join a room specific to this user (for receiving messages)
  socket.join(userId);

  // Broadcast user online status to all connected clients
  io.emit('user_online', { userId });

  // 2. Join specific connection rooms (optional, but good for "user is typing" events)
  socket.on('join_chat', (connectionId) => {
    socket.join(connectionId);
  });

  // 3. Handle Sending Messages
  socket.on('send_message', async (payload) => {
    // Payload: { connectionId, content, tempId (for optimistic UI) }
    const { connectionId, content, tempId } = payload;

    try {
      // VALIDATION: Ensure Connection Exists and is Active
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId },
        include: {
          user1: true,
          user2: true,
        },
      });

      // Check if connection exists, is active, and user is part of it
      if (!connection || connection.status !== 'ACTIVE') {
        socket.emit('error', { message: 'Connection is not active.' });
        return;
      }

      const isUserPartOfConnection =
        connection.user1Id === userId || connection.user2Id === userId;
      if (!isUserPartOfConnection) {
        socket.emit('error', {
          message: 'You are not part of this connection.',
        });
        return;
      }

      // Determine Receiver
      const receiverId =
        connection.user1Id === userId ? connection.user2Id : connection.user1Id;

      // A. Save to Database (Using your Schema)
      const newMessage = await prisma.message.create({
        data: {
          content: content,
          senderId: userId,
          receiverId: receiverId,
          connectionId: connectionId,
          isRead: false,
        },
      });

      // B. Emit to Receiver (Real-time)
      io.to(receiverId).emit('receive_message', newMessage);

      // C. Acknowledge Sender (Confirm persistence)
      socket.emit('message_sent', { tempId, savedMessage: newMessage });
    } catch (error) {
      console.error('Error sending message:', error);
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

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);

    // Remove user from online tracking
    onlineUsers.delete(userId);

    // Broadcast user offline status to all connected clients
    io.emit('user_offline', { userId });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Microservice running on port ${PORT}`);
});
