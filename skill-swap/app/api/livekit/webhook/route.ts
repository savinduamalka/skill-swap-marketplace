import { WebhookReceiver } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

const receiver = new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
);

export async function POST(req: Request) {
    try {
        // IMPORTANT: read raw body
        const body = await req.text();

        const authHeader = req.headers.get('authorization');

        if (!authHeader) {
            return new NextResponse('Missing Authorization Header', { status: 401 });
        }

        // Verify signature
        const event = await receiver.receive(body, authHeader);

        console.log(
            '[LiveKit Webhook]',
            event.event,
            'Client:',
            event.participant?.identity,
            'Room:',
            event.room?.name
        );

        switch (event.event) {
            case 'participant_joined':
                console.log(
                    `✅ ${event.participant?.identity} joined ${event.room?.name}`
                );
                break;

            case 'participant_left':
                console.log(
                    `❌ ${event.participant?.identity} left ${event.room?.name}`
                );
                break;

            case 'room_finished':
                console.log(`🏁 Room finished: ${event.room?.name}`);
                break;

            default:
                console.log('ℹ️ Unhandled event:', event.event);
        }

        return new NextResponse('ok', { status: 200 });

    } catch (error: any) {
        console.error('LiveKit webhook error:', error?.message || error);

        return new NextResponse('Invalid webhook signature', {
            status: 401,
        });
    }
}