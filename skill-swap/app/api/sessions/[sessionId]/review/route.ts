import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const body = await request.json();
    const { rating, comments, teachingClarity, responsiveness, reliability, punctuality } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid rating between 1 and 5 is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Check if the session exists and the user is the learner
    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        skill: true,
      }
    });

    if (!sessionRecord) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (sessionRecord.learnerId !== userId) {
      return NextResponse.json({ error: 'Only the learner can leave a review' }, { status: 403 });
    }

    if (sessionRecord.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'You can only review completed sessions' }, { status: 400 });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: {
        sessionId_reviewedByUserId: {
          sessionId,
          reviewedByUserId: userId,
        }
      }
    });

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this session' }, { status: 400 });
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        sessionId,
        reviewedUserId: sessionRecord.providerId,
        reviewedByUserId: userId,
        skillId: sessionRecord.skillId || '',
        rating,
        teachingClarity: teachingClarity || null,
        responsiveness: responsiveness || null,
        reliability: reliability || null,
        punctuality: punctuality || null,
        comments: comments || null,
      },
    });

    // Send notification to the provider
    const reviewerName = session.user.name || 'A user';
    createNotification({
      userId: sessionRecord.providerId,
      type: 'REVIEW',
      title: 'New Review Received',
      message: `${reviewerName} left a ${rating}-star review for your session: ${sessionRecord.sessionName}`,
      relatedUserId: userId,
      relatedEntityId: review.id,
      relatedEntityType: 'review',
    }).catch(error => {
      console.error('Error creating review notification:', error);
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
