/**
 * DELETE /api/messages/delete
 * Delete specific messages from a conversation
 * Only allows users to delete messages they sent or messages in their conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { messageIds, connectionId, deleteForEveryone } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Message IDs are required' },
        { status: 400 }
      );
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Verify user is part of this connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    const isUserPartOfConnection =
      connection.user1Id === userId || connection.user2Id === userId;

    if (!isUserPartOfConnection) {
      return NextResponse.json(
        { error: 'You are not part of this conversation' },
        { status: 403 }
      );
    }

    // Get the messages to verify ownership
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        connectionId,
      },
    });

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found' },
        { status: 404 }
      );
    }

    // If deleteForEveryone, user can only delete their own messages
    // Otherwise, we just delete for the current user (soft delete - future feature)
    // For now, we'll implement actual deletion for messages the user sent
    
    let deletedCount = 0;

    if (deleteForEveryone) {
      // Delete only messages sent by this user
      const userMessages = messages.filter(m => m.senderId === userId);
      const userMessageIds = userMessages.map(m => m.id);

      if (userMessageIds.length > 0) {
        const result = await prisma.message.deleteMany({
          where: {
            id: { in: userMessageIds },
          },
        });
        deletedCount = result.count;
      }

      // Return which messages couldn't be deleted (sent by other user)
      const notDeleted = messageIds.filter(id => !userMessageIds.includes(id));
      
      return NextResponse.json({
        success: true,
        deletedCount,
        deletedIds: userMessageIds,
        notDeletedIds: notDeleted,
        message: notDeleted.length > 0 
          ? 'Some messages could not be deleted (you can only delete messages you sent)'
          : 'Messages deleted successfully',
      });
    } else {
      // Delete for me only - for now, just delete messages in this conversation that user is part of
      // In a production app, you'd want a soft-delete/hide mechanism
      const result = await prisma.message.deleteMany({
        where: {
          id: { in: messageIds },
          connectionId,
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      });
      deletedCount = result.count;

      return NextResponse.json({
        success: true,
        deletedCount,
        deletedIds: messageIds,
        message: 'Messages deleted successfully',
      });
    }
  } catch (error) {
    console.error('Error deleting messages:', error);
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}
