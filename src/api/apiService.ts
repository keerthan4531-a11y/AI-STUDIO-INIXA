import fpPromise from '@fingerprintjs/fingerprintjs';

// Inixa API Service Utility
// Handles API key generation and validation via the new backend Upstash Redis system.

export interface InixaApiKey {
  keyHash?: string;
  keyPrefix?: string;
  key?: string; // used for legacy / backward compatibility
  name: string;
  createdAt: number;
  status: 'active' | 'revoked';
  totalRequests?: number;
  lastUsedAt?: number;
}

// Global cache for fingerprint
let cachedFingerprint: string | null = null;

export const getFingerprint = async (): Promise<string> => {
  if (cachedFingerprint) return cachedFingerprint;
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();
    cachedFingerprint = result.visitorId;
    return cachedFingerprint;
  } catch (error) {
    console.error('Failed to get fingerprint', error);
    // Fallback: simple session-based or localstorage id
    let fallbackId = localStorage.getItem('inixa_fallback_fp');
    if (!fallbackId) {
      fallbackId = 'fp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('inixa_fallback_fp', fallbackId);
    }
    cachedFingerprint = fallbackId;
    return fallbackId;
  }
};

export const generateApiKey = async (name: string): Promise<{ rawKey: string, record: InixaApiKey }> => {
  const fingerprint = await getFingerprint();
  const res = await fetch('/api/keys/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fingerprint }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to generate API key');
  }

  const result = await res.json();
  // Map back to the expected type for UI
  return {
    rawKey: result.data.rawKey,
    record: {
      ...result.data.record,
      key: result.data.rawKey // Temporary map to key for backward compatibility
    }
  };
};

export const getApiKeys = async (): Promise<InixaApiKey[]> => {
  const fingerprint = await getFingerprint();
  const res = await fetch(`/api/keys/list?fingerprint=${fingerprint}`);
  
  if (!res.ok) {
    console.error('Failed to fetch API keys');
    return [];
  }

  const result = await res.json();
  // Map keyHash to 'key' for legacy UI components if they still rely on it
  return result.data.map((record: any) => ({
    ...record,
    key: record.keyHash, // UI uses key for react 'key' prop
  }));
};

export const revokeApiKey = async (keyHash: string): Promise<void> => {
  const fingerprint = await getFingerprint();
  await fetch('/api/keys/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyHash, fingerprint, action: 'revoke' }),
  });
};

export const deleteApiKey = async (keyHash: string): Promise<void> => {
  const fingerprint = await getFingerprint();
  await fetch('/api/keys/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyHash, fingerprint, action: 'delete' }),
  });
};
