/**
 * Generate portal credentials for a member.
 * Username: first name + random 4 digits (e.g., ahmed4291)
 * Password: random 6-character alphanumeric (e.g., Xk9mP2)
 */
export function generatePortalCredentials(memberName: string): { username: string; password: string } {
  const cleanName = memberName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'user';
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  const username = `${cleanName}${suffix}`;

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return { username, password };
}

/**
 * Generate a random access token for kitchen/sales portals.
 */
export function generateAccessToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Get the app base URL — works on localhost and production.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
