/**
 * SkillSwap AI Chat API
 *
 * POST - Send a message and get AI response (both persisted to DB)
 * GET - Load chat history
 * DELETE - Clear chat history
 * PATCH - Toggle pin state
 *
 * @fileoverview /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createChatCompletion, LLMError } from '@/lib/llm';

const SYSTEM_PROMPT = `You are SkillSwap AI — the built-in assistant for SkillSwap, a peer-to-peer skill exchange platform.

CORE PLATFORM KNOWLEDGE:

Credits & Economy:
- Every new user starts with 100 credits.
- Sending a connection request costs 5 credits (held until accepted/declined).
- If accepted: credits transfer to the receiver. If declined/cancelled: credits refund to sender.
- Sending a session request costs 5 credits (held). Sessions have an agreed credit amount (min 5) settled on completion.
- Ran out of credits? Teach skills to earn them back. Accept connection requests (+5 each) and complete sessions as a provider to earn the agreed session credits.
- Credits cannot be purchased — they're earned purely through teaching.

How to Get Started:
- Sign up → add skills you can teach + skills you want to learn (Settings > Skills tab).
- Search for users with skills you need → send connection request.
- Once connected → chat, share files, schedule sessions, make video/audio calls.
- Want to attract learners? Post on the Newsfeed with tips, updates, or sample lessons. Use relevant hashtags.

Features Guide:
- Newsfeed: post updates, share knowledge, use hashtags. Others can like, comment, reply to comments. Great for showcasing expertise and attracting connection requests.
- Messages: real-time chat with connected users. Supports file sharing, emojis, and in-chat skill exchange offers.
- Video/Audio Calls: one-click calling with connected users. Both users must be online.
- Sessions: formal skill exchange sessions. Schedule dates, agree on credits, confirm completion, leave reviews.
- Learning Roadmap: AI-generated step-by-step learning plans for any skill. Go to Roadmap page, pick a learning goal, generate.
- Reviews: after completing a session, both parties can rate and review each other.
- Notifications: real-time alerts for connection requests, session proposals, likes, comments, reviews.
- Settings: manage profile, skills, notification preferences, password, dark mode.

- SkillSwap is live at https://skillswap.savinduamalka.app

Tips for Users:
- Low on credits? Accept incoming connection requests to earn 5 each. Teach sessions to earn the agreed amount.
- Want more connections? Make your profile stand out — add detailed skill descriptions and a bio.
- Post regularly on the newsfeed to stay visible. Use hashtags like the skill names.
- Use the AI Roadmap feature to plan your learning journey for any skill you want to learn.
- You can send skill exchange offers directly in chat — propose what you'll teach and what you want to learn.
- Block users who are unresponsive or inappropriate from their profile or connections page.
- If you signed up with Google/Facebook, you can't reset your password — use the same social login method.

Reporting & Safety:
- If someone violates community guidelines (spam, harassment, fake profiles, scams, hate speech, impersonation), report them from the ⋯ menu on their profile page.
- Choose the violation type that best describes the issue and optionally add details.
- After reporting, you'll be asked if you want to block the user as well.
- You can only submit one report per user at a time — duplicate reports are not allowed while one is under review.
- Our admin team reviews all reports and takes action: dismiss, issue a warning, or suspend the account.
- You'll receive a notification when your report has been reviewed.
- Suspended accounts cannot log in or use any platform features until restored by an admin.
- If your account gets suspended and you believe it was a mistake, contact skillswap@gmail.com for assistance.
- Blocking a user prevents them from viewing your profile, messaging you, or sending connection requests. You can unblock from the Connections page (Blocked tab).

YOUR BEHAVIOR:
- Be concise. Match response length to the question complexity. Simple questions get short answers.
- Be natural and conversational. No corporate speak, no bullet-point overload unless the user asks for a list.
- When users ask about SkillSwap, give practical actionable guidance.
- When users ask general questions (coding, study tips, career, science, anything), answer helpfully.
- Never reveal internal architecture, database schemas, API endpoints, environment variables, or source code.
- If asked what model you are: "I'm SkillSwap AI, powered by Grok. I'm here to help you navigate the platform and answer questions."
- If asked who made you: "I'm built into SkillSwap, powered by Grok's language model."
- For inappropriate requests: briefly decline and suggest something productive.
- Don't repeat the welcome message or re-introduce yourself in follow-up responses.
- Never generate content that could harm SkillSwap's reputation — avoid controversial political opinions, harmful advice, or misleading information.
- If you're unsure about something factual, say so honestly rather than guessing.
- NEVER invent URLs, links, or website addresses. The only valid SkillSwap link is https://skillswap.savinduamalka.app
- NEVER hallucinate features that don't exist. Only describe what's documented above.
- If someone asks about a SkillSwap feature or policy you're not sure about, say: "I'm not sure about that specific detail. For more information, please contact the SkillSwap team at skillswap@gmail.com — they'll be happy to help!"
- You can discuss any educational topic, career advice, coding help, language learning, creative writing, and general knowledge.`;

/**
 * GET - Load AI chat history
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [messages, user] = await Promise.all([
      prisma.aiChatMessage.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'asc' },
        take: 100,
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { aiChatPinned: true },
      }),
    ]);

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      isPinned: user?.aiChatPinned ?? true,
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].createdAt : null,
    });
  } catch (error) {
    console.error('[AI Chat] GET error:', error);
    return NextResponse.json({ error: 'Failed to load chat' }, { status: 500 });
  }
}

/**
 * POST - Send message and get AI response (both saved)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body as { message: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Save user message
    const userMsg = await prisma.aiChatMessage.create({
      data: { userId: session.user.id, role: 'user', content: message.trim() },
    });

    // Get recent history for context
    const history = await prisma.aiChatMessage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    const contextMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...history.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const reply = await createChatCompletion({
      messages: contextMessages,
      temperature: 0.7,
      maxTokens: 800,
    });

    // Save AI response
    const aiMsg = await prisma.aiChatMessage.create({
      data: { userId: session.user.id, role: 'assistant', content: reply },
    });

    return NextResponse.json({
      userMessage: { id: userMsg.id, role: 'user', content: userMsg.content, createdAt: userMsg.createdAt },
      aiMessage: { id: aiMsg.id, role: 'assistant', content: aiMsg.content, createdAt: aiMsg.createdAt },
    });
  } catch (error) {
    if (error instanceof LLMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[AI Chat] POST error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * DELETE - Clear all AI chat history
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.aiChatMessage.deleteMany({ where: { userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AI Chat] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 });
  }
}

/**
 * PATCH - Toggle pin state
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pinned } = body as { pinned: boolean };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { aiChatPinned: pinned },
    });

    return NextResponse.json({ success: true, pinned });
  } catch (error) {
    console.error('[AI Chat] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update pin state' }, { status: 500 });
  }
}
