import DOMPurify from 'isomorphic-dompurify';
import fpPromise from '@fingerprintjs/fingerprintjs';

/**
 * Strips all HTML tags
 */
export function sanitizeInput(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Allows safe HTML
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'code', 'pre', 'span', 'ul', 'ol', 'li'],
  });
}

let cachedVisitorId: string | null = null;

/**
 * Gets a unique device ID using FingerprintJS
 */
export async function getDeviceId(): Promise<string> {
  if (typeof window === 'undefined') return 'server-side';
  if (cachedVisitorId) return cachedVisitorId;
  
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();
    cachedVisitorId = result.visitorId;
    return result.visitorId;
  } catch (e) {
    console.warn("FingerprintJS failed, falling back to random ID");
    // Fallback if blocked
    const fallbackId = 'fb-' + Math.random().toString(36).substring(2, 15);
    cachedVisitorId = fallbackId;
    return fallbackId;
  }
}

/**
 * Generates security headers for internal API calls to prevent direct execution
 */
export async function createSignedHeaders(body: any = {}): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  const payload = JSON.stringify(body) + timestamp;
  
  // Use Web Crypto API for simple tamper protection
  let signature = "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Create base64 signature
    signature = btoa(`${hashHex}:${timestamp}:inixa-app-v2`);
  } catch (e) {
    // Fallback if crypto is unavailable
    signature = btoa(`fallback:${timestamp}:inixa-app-v2`);
  }
  
  const deviceId = await getDeviceId();
  
  return {
    'X-Timestamp': timestamp,
    'X-App-Signature': signature,
    'X-App-Version': '2.0.0',
    'X-Device-Id': deviceId,
  };
}
