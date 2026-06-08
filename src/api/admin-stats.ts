interface TokenHistoryItem {
  timestamp: number;
  tokens: number;
}

interface AdminState {
  totalRequests: number;
  totalTokens: number;
  failedRequests: number;
  activeUsers: Map<string, number>; // IP -> last seen timestamp
  tokenHistory: TokenHistoryItem[];
  rateLimitConfig: number;
  bannedIps: Set<string>;
}

// @ts-ignore
if (!global.__adminState) {
  // @ts-ignore
  global.__adminState = {
    totalRequests: 0,
    totalTokens: 0,
    failedRequests: 0,
    activeUsers: new Map<string, number>(),
    tokenHistory: [],
    rateLimitConfig: 20, // 20 requests per minute by default
    bannedIps: new Set<string>()
  };
}

// @ts-ignore
const state: AdminState = global.__adminState;

export const adminStats = {
  logRequest: (ip: string) => {
    state.totalRequests++;
    state.activeUsers.set(ip, Date.now());
  },
  logFailure: () => {
    state.failedRequests++;
  },
  logTokens: (tokens: number) => {
    state.totalTokens += tokens;
    const now = Date.now();
    // Group history by minute
    const currentMinute = Math.floor(now / 60000) * 60000;
    
    if (state.tokenHistory.length > 0 && state.tokenHistory[state.tokenHistory.length - 1].timestamp === currentMinute) {
      state.tokenHistory[state.tokenHistory.length - 1].tokens += tokens;
    } else {
      state.tokenHistory.push({ timestamp: currentMinute, tokens });
      // Keep only last 60 minutes
      if (state.tokenHistory.length > 60) {
        state.tokenHistory.shift();
      }
    }
  },
  isIpBanned: (ip: string) => {
    return state.bannedIps.has(ip);
  },
  banIp: (ip: string) => {
    state.bannedIps.add(ip);
  },
  unbanIp: (ip: string) => {
    state.bannedIps.delete(ip);
  },
  getRateLimit: () => {
    return state.rateLimitConfig;
  },
  setRateLimit: (limit: number) => {
    state.rateLimitConfig = limit;
  },
  getStats: () => {
    const now = Date.now();
    // Clean up active users older than 5 minutes
    for (const [ip, lastSeen] of Array.from(state.activeUsers.entries())) {
      if (now - lastSeen > 5 * 60 * 1000) {
        state.activeUsers.delete(ip);
      }
    }
    
    return {
      totalRequests: state.totalRequests,
      totalTokens: state.totalTokens,
      failedRequests: state.failedRequests,
      activeUsersCount: state.activeUsers.size,
      tokenHistory: state.tokenHistory,
      bannedIps: Array.from(state.bannedIps),
      rateLimitConfig: state.rateLimitConfig
    };
  }
};
