import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with the service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Storage bucket name for media files
export const MEDIA_BUCKET = 'newsfeed-media';

/**
 * Upload a file to Supabase Storage
 * @param file - The file buffer to upload
 * @param fileName - The name to give the file
 * @param contentType - The MIME type of the file
 * @returns The public URL of the uploaded file
 */
export async function uploadMediaToStorage(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(fileName, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', {
        message: error.message,
        status: (error as any).status,
        statusCode: (error as any).statusCode,
        details:
          'Check that the bucket exists, RLS is disabled or properly configured, and SUPABASE_SERVICE_ROLE_KEY is set correctly',
      });
      return null;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to storage:', {
      message: error instanceof Error ? error.message : String(error),
      details:
        'Ensure Supabase URL and keys are set in .env and the bucket exists',
    });
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - The path of the file to delete
 */
export async function deleteMediaFromStorage(
  filePath: string
): Promise<boolean> {
  try {
    // Extract the file path from the full URL
    const urlParts = filePath.split(`${MEDIA_BUCKET}/`);
    if (urlParts.length < 2) return false;

    const path = urlParts[1];
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting from storage:', error);
    return false;
  }
}
