/**
 * Unified Upload Service for MessFlow.
 * Routes uploads to either Google Drive (user's own) or Cloudinary (platform).
 * 
 * Priority:
 * 1. If user signed in with Google + storage_provider='google_drive' → use Drive
 * 2. Otherwise → use Cloudinary (existing behavior)
 */

import { supabase } from '@/integrations/supabase/client';
import { uploadToCloudinary } from './cloudinary';
import { uploadToGoogleDrive, getGoogleAccessToken } from './google-drive';

export interface UploadResult {
  url: string;
  size: number;
  provider: 'cloudinary' | 'google_drive';
}

/**
 * Upload a file using the user's configured storage provider.
 */
export async function uploadFile(
  file: File,
  userId: string,
  options?: { folder?: string }
): Promise<UploadResult> {
  // Check user's storage preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('storage_provider, google_connected')
    .eq('user_id', userId)
    .single();

  const p = profile as any;
  const wantsDrive = p?.storage_provider === 'google_drive' && p?.google_connected;

  if (wantsDrive) {
    try {
      // Verify we actually have a Google token
      const token = await getGoogleAccessToken();
      if (token) {
        const result = await uploadToGoogleDrive(file, userId);
        return { url: result.url, size: result.size, provider: 'google_drive' };
      }
    } catch (err) {
      console.warn('Google Drive upload failed, falling back to Cloudinary:', err);
    }
  }

  // Default: Cloudinary
  const result = await uploadToCloudinary(file, { folder: options?.folder || 'mess-manager' });
  return { url: result.secure_url, size: result.bytes, provider: 'cloudinary' };
}

/**
 * Upload a receipt image.
 */
export async function uploadReceipt(file: File, userId: string): Promise<UploadResult> {
  return uploadFile(file, userId, { folder: 'mess-manager/receipts' });
}

/**
 * Upload a company logo.
 */
export async function uploadLogo(file: File, userId: string): Promise<UploadResult> {
  return uploadFile(file, userId, { folder: 'mess-manager/logos' });
}
