
// Inixa API Service Utility
// Handles API key generation and mock validation for development

export interface InixaApiKey {
  key: string;
  name: string;
  createdAt: number;
  status: 'active' | 'revoked';
}

export const generateApiKey = (name: string): InixaApiKey => {
  const prefix = 'inx_';
  const secret = 'inixa_elite_2026';
  const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const key = `${prefix}${randomPart}_${secret}`;
  
  const newKey: InixaApiKey = {
    key,
    name,
    createdAt: Date.now(),
    status: 'active'
  };
  
  const existing = getApiKeys();
  localStorage.setItem('inixa_api_keys', JSON.stringify([newKey, ...existing]));
  
  return newKey;
};

export const getApiKeys = (): InixaApiKey[] => {
  try {
    return JSON.parse(localStorage.getItem('inixa_api_keys') || '[]');
  } catch {
    return [];
  }
};

export const revokeApiKey = (key: string) => {
  const existing = getApiKeys();
  const updated = existing.map(k => k.key === key ? { ...k, status: 'revoked' as const } : k);
  localStorage.setItem('inixa_api_keys', JSON.stringify(updated));
};

export const deleteApiKey = (key: string) => {
  const existing = getApiKeys();
  const updated = existing.filter(k => k.key !== key);
  localStorage.setItem('inixa_api_keys', JSON.stringify(updated));
};
