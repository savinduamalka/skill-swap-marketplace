/**
 * User Avatar Upload API Route
 *
 * Handles uploading user profile images to Supabase Storage
 * POST /api/user/avatar - Upload user's profile image
 *
 * @fileoverview API route for uploading user profile images
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/user/avatar
 * Upload a user's profile image
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `avatars/${session.user.id}-${timestamp}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('user-avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image. Please try again.' },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(data.path);

    const imageUrl = publicUrlData?.publicUrl;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image URL' },
        { status: 500 }
      );
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
      select: {
        id: true,
        image: true,
        fullName: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: updatedUser.image,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
