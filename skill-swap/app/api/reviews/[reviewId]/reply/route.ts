import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId } = await params;
    const body = await request.json();
    const { reply } = body;

    if (!reply || reply.trim() === '') {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Fetch the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        skill: true,
      }
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Only the person who was reviewed can reply
    if (review.reviewedUserId !== userId) {
      return NextResponse.json({ error: 'Only the receiver of this review can reply to it' }, { status: 403 });
    }

    // Update the review with the reply
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        reply,
        repliedAt: new Date(),
      },
    });

    // Notify the original reviewer
    const replierName = session.user.name || 'A user';
    createNotification({
      userId: review.reviewedByUserId,
      type: 'REVIEW',
      title: 'New Reply to Your Review',
      message: `${replierName} replied to your review on their skill: ${review.skill.name}`,
      relatedUserId: userId,
      relatedEntityId: reviewId,
      relatedEntityType: 'review_reply',
    }).catch(error => {
      console.error('Error creating review reply notification:', error);
    });

    return NextResponse.json({ success: true, review: updatedReview });
  } catch (error) {
    console.error('Error updating review reply:', error);
    return NextResponse.json({ error: 'Failed to reply to review' }, { status: 500 });
  }
}
