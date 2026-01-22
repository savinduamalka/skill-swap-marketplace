/**
 * Media Upload API for Chat Messages
 * Handles uploading images, videos, audio, and files to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for storage operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
];

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_FILE_TYPES,
];

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'file' {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
  return 'file';
}

function getMaxSize(mediaType: string): number {
  switch (mediaType) {
    case 'image':
      return MAX_IMAGE_SIZE;
    case 'video':
      return MAX_VIDEO_SIZE;
    case 'audio':
      return MAX_AUDIO_SIZE;
    default:
      return MAX_FILE_SIZE;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const connectionId = formData.get('connectionId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Validate file type
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Supported: images, videos, audio, PDF, documents` },
        { status: 400 }
      );
    }

    // Determine media type and validate size
    const mediaType = getMediaType(file.type);
    const maxSize = getMaxSize(mediaType);

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size for ${mediaType}: ${formatFileSize(maxSize)}` },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = `chat-media/${connectionId}/${session.user.id}/${fileName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(data.path);

    // Generate thumbnail URL for images (Supabase transformations)
    let thumbnailUrl: string | null = null;
    if (mediaType === 'image') {
      const { data: thumbData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(data.path, {
          transform: {
            width: 200,
            height: 200,
            resize: 'contain',
          },
        });
      thumbnailUrl = thumbData.publicUrl;
    }

    return NextResponse.json({
      success: true,
      media: {
        url: urlData.publicUrl,
        type: mediaType,
        name: file.name,
        size: file.size,
        thumbnail: thumbnailUrl,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
