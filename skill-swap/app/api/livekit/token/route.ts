import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/livekit/token
 * Generates a LiveKit access token for a user to join a video room
 *
 * Request body:
 * - roomName: string - Name of the LiveKit room
 * - userName: string - Display name of the participant
 * - userId: string - Unique identifier for the participant
 *
 * Response:
 * - token: string - JWT token for LiveKit access
 * - url: string - LiveKit server URL
 */
export async function POST(request: NextRequest) {
  try {
    const { roomName, userName, userId } = await request.json();

    // Validate required fields
    if (!roomName || !userName || !userId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: roomName, userName, userId',
        },
        { status: 400 }
      );
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !liveKitUrl) {
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        {
          error: 'LiveKit server not configured',
        },
        { status: 500 }
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
    });

    // Grant permissions to join the room
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: liveKitUrl,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate token',
      },
      { status: 500 }
    );
  }
}
