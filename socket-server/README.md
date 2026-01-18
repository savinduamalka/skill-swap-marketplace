# Socket.IO Messaging Microservice

Real-time messaging server for Skill Swap application using Socket.IO and Node.js.

## Features

- **JWT Authentication**: Secure socket connections using short-lived tokens
- **Real-time Messaging**: Instant message delivery with Socket.IO
- **Connection Validation**: Ensures users can only message their active connections
- **Message Persistence**: All messages saved to PostgreSQL via Prisma
- **Error Handling**: Comprehensive error handling and event acknowledgments

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (shared with Next.js app)
- Prisma Client generated

## Setup

1. **Install Dependencies**

   ```bash
   cd socket-server
   pnpm install
   ```

2. **Generate Prisma Client**

   ```bash
   npx prisma generate
   ```

3. **Configure Environment Variables**
   Create a `.env` file with:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   SOCKET_SECRET=your-secret-key-matching-nextjs
   PORT=4000
   NEXTJS_URL=http://localhost:3000
   ```

## Running the Server

**Development (with hot-reload)**

```bash
pnpm run dev
```

**Production**

```bash
pnpm start
```

The server will start on `http://localhost:4000`

## Socket.IO Events

### Client → Server

**`join_chat`**

- Join a specific conversation room
- Payload: `connectionId: string`

**`send_message`**

- Send a message to another user
- Payload: `{ connectionId: string, content: string, tempId: string }`
- Response: `message_sent` event with saved message data

### Server → Client

**`receive_message`**

- Receive a new message in real-time
- Payload: `{ id, connectionId, content, senderId, receiverId, isRead, createdAt }`

**`message_sent`**

- Confirmation that your message was saved
- Payload: `{ tempId, savedMessage }`

**`error`**

- Error notification
- Payload: `{ message: string }`

## Authentication Flow

1. Next.js app calls `/api/auth/socket` to get a JWT token
2. Client connects to Socket.IO with token in `auth.token`
3. Server validates token using shared `SOCKET_SECRET`
4. Connection established with `userId` attached to socket

## Architecture

```
┌─────────────┐      HTTP       ┌──────────────┐
│   Next.js   │ ───────────────→ │  REST APIs   │
│   Client    │                  │ (Messages)   │
└─────────────┘                  └──────────────┘
       │                                │
       │ WebSocket                      │ PostgreSQL
       ↓                                ↓
┌─────────────┐                  ┌──────────────┐
│  Socket.IO  │ ───────────────→ │   Prisma     │
│   Server    │     Queries      │   Client     │
└─────────────┘                  └──────────────┘
```

## Security

- ✅ JWT token validation on connection
- ✅ Connection ownership verification
- ✅ Short-lived tokens (1 minute expiry)
- ✅ CORS configured for Next.js origin only
- ✅ Input validation on all message events

## Deployment

For production deployment:

1. **Environment Variables**: Set all required env vars
2. **Database**: Ensure DATABASE_URL points to production database
3. **CORS**: Update NEXTJS_URL to production domain
4. **Process Manager**: Use PM2 or similar for process management
5. **Scaling**: Consider using Socket.IO Redis adapter for horizontal scaling

## Troubleshooting

**Connection Failed**

- Verify SOCKET_SECRET matches between Next.js and socket server
- Check CORS origin matches Next.js URL
- Ensure JWT token is not expired

**Messages Not Sending**

- Verify user is part of the connection
- Check database connection
- Review server logs for validation errors

**Disconnection Issues**

- Check network connectivity
- Verify server is running
- Review reconnection settings in client

## Integration with Next.js

See `/hooks/useChatSocket.ts` in Next.js app for client-side integration.

## Database Schema

Uses the shared Prisma schema:

- `Connection` - Active connections between users
- `Message` - Persistent message storage
- `User` - User authentication and profiles
