/**
 * Google Drive upload library for MessFlow.
 * Uses the Google access token from Supabase Auth session (provider_token).
 * When users sign in with Google, they also grant Drive access.
 * Uploads go to THEIR Google Drive — zero cost on platform storage.
 */

import { supabase } from '@/integrations/supabase/client';

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

/**
 * Get a valid Google access token.
 * Priority: 1) Session provider_token  2) Stored token in DB  3) Refresh from stored refresh_token
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  // 1. Use session token if available (fresh login)
  if (session?.provider_token) return session.provider_token;

  // 2. No session token (expired) — try stored token from DB
  if (!session?.user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token')
    .eq('user_id', session.user.id)
    .single();
  
  const p = profile as any;
  if (!p?.google_access_token && !p?.google_refresh_token) return null;

  // 3. Try the stored access token first (it might still be valid)
  if (p.google_access_token) {
    // Quick validation — try a lightweight API call
    const test = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${p.google_access_token}` },
    });
    if (test.ok) return p.google_access_token;
  }

  // 4. Access token expired — refresh using stored refresh token
  if (p.google_refresh_token) {
    try {
      const refreshed = await refreshGoogleToken(p.google_refresh_token, session.user.id);
      return refreshed;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Refresh an expired Google access token using the stored refresh token.
 * Requires the SuperAdmin to have configured Google Client ID/Secret.
 */
async function refreshGoogleToken(refreshToken: string, userId: string): Promise<string | null> {
  // Get Google OAuth client credentials from platform config
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('platform_api_config')
    .not('platform_api_config', 'is', null)
    .limit(1)
    .maybeSingle();
  
  const cfg = (adminProfile?.platform_api_config as any) || {};
  if (!cfg.google_client_id || !cfg.google_client_secret) {
    // No client credentials — can't refresh. Token will remain expired.
    return null;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.google_client_id,
      client_secret: cfg.google_client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  
  // Store the new access token
  await supabase
    .from('profiles')
    .update({ google_access_token: data.access_token } as any)
    .eq('user_id', userId);

  return data.access_token;
}

/**
 * Check if the current user signed in with Google (has a provider token).
 */
export async function isGoogleDriveAvailable(): Promise<boolean> {
  const token = await getGoogleAccessToken();
  return !!token;
}

/**
 * Check if user has Google Drive connected (signed in via Google).
 */
export async function isGoogleDriveConnected(userId: string): Promise<boolean> {
  try {
    // Check if the user has a google provider token in session
    const token = await getGoogleAccessToken();
    if (token) return true;

    // Also check the DB flag as fallback
    const { data, error } = await supabase
      .from('profiles')
      .select('google_connected, storage_provider')
      .eq('user_id', userId)
      .single();
    if (error) return false;
    const p = data as any;
    return !!(p?.google_connected);
  } catch {
    return false;
  }
}

/**
 * Ensure the MessFlow folder exists in user's Drive and return its ID.
 */
async function ensureDriveFolder(accessToken: string, userId: string): Promise<string> {
  // Check cached folder ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_drive_folder_id')
    .eq('user_id', userId)
    .single();

  const folderId = (profile as any)?.google_drive_folder_id;
  if (folderId) {
    const checkRes = await fetch(`${DRIVE_FILES_URL}/${folderId}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (!data.trashed) return folderId;
    }
  }

  // Create the folder
  const createRes = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'MessFlow Uploads',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) throw new Error('Failed to create Drive folder');
  const folder = await createRes.json();

  // Cache it
  await supabase
    .from('profiles')
    .update({ google_drive_folder_id: folder.id } as any)
    .eq('user_id', userId);

  return folder.id;
}

/**
 * Upload a file to the user's Google Drive.
 */
export async function uploadToGoogleDrive(
  file: File,
  userId: string
): Promise<{ url: string; fileId: string; size: number }> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    throw new Error('Google Drive not available. Sign in with Google to enable Drive uploads.');
  }

  const parentFolderId = await ensureDriveFolder(accessToken, userId);

  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [parentFolderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const uploadRes = await fetch(
    `${DRIVE_UPLOAD_URL}&fields=id,webViewLink,webContentLink,size`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message || 'Google Drive upload failed');
  }

  const uploadedFile = await uploadRes.json();

  // Make viewable via link
  await fetch(`${DRIVE_FILES_URL}/${uploadedFile.id}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  }).catch(() => {}); // Non-critical if sharing fails

  return {
    url: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
    fileId: uploadedFile.id,
    size: parseInt(uploadedFile.size || '0'),
  };
}

/**
 * Fetch Google Drive storage quota (used + total) for the connected user.
 * Uses the Drive API About endpoint.
 */
export async function getGoogleDriveStorageInfo(): Promise<{
  used: number;
  total: number;
  usedInDrive: number;
  usedInTrash: number;
  email: string;
} | null> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return null;

  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const q = data.storageQuota || {};
    return {
      used: parseInt(q.usage || '0'),
      total: parseInt(q.limit || '16106127360'), // 15GB default
      usedInDrive: parseInt(q.usageInDrive || '0'),
      usedInTrash: parseInt(q.usageInDriveTrash || '0'),
      email: data.user?.emailAddress || '',
    };
  } catch {
    return null;
  }
}

/**
 * Enable Google Drive as storage provider for this user.
 */
export async function enableGoogleDrive(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      google_connected: true,
      storage_provider: 'google_drive',
    } as any)
    .eq('user_id', userId);
}

/**
 * Disconnect Google Drive — fall back to Cloudinary.
 */
export async function disconnectGoogleDrive(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      google_drive_folder_id: null,
      google_connected: false,
      storage_provider: 'cloudinary',
    } as any)
    .eq('user_id', userId);
}
