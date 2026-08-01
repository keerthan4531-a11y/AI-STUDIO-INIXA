export interface LeaderboardEntry {
  username: string;
  totalScore: number;
  completedQuestions: number;
  avgAccuracy: number;
  timeSpentMinutes: number;
  lastUpdated: number;
}

// In-memory real-time store for tournament leaderboard entries
const leaderboardMap = new Map<string, LeaderboardEntry>();

export const battleLeaderboardStore = {
  getEntries(): LeaderboardEntry[] {
    const list = Array.from(leaderboardMap.values());
    list.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore; // Higher total score first
      }
      if (b.completedQuestions !== a.completedQuestions) {
        return b.completedQuestions - a.completedQuestions; // More questions first
      }
      return a.lastUpdated - b.lastUpdated; // Earlier completion first
    });
    return list;
  },

  updateEntry(entry: Partial<LeaderboardEntry> & { username: string }): LeaderboardEntry {
    const existing = leaderboardMap.get(entry.username) || {
      username: entry.username,
      totalScore: 0,
      completedQuestions: 0,
      avgAccuracy: 0,
      timeSpentMinutes: 0,
      lastUpdated: Date.now()
    };

    const updated: LeaderboardEntry = {
      username: entry.username,
      totalScore: typeof entry.totalScore === 'number' ? entry.totalScore : existing.totalScore,
      completedQuestions: typeof entry.completedQuestions === 'number' ? entry.completedQuestions : existing.completedQuestions,
      avgAccuracy: typeof entry.avgAccuracy === 'number' ? entry.avgAccuracy : existing.avgAccuracy,
      timeSpentMinutes: typeof entry.timeSpentMinutes === 'number' ? entry.timeSpentMinutes : existing.timeSpentMinutes,
      lastUpdated: Date.now()
    };

    leaderboardMap.set(entry.username, updated);
    return updated;
  },

  clear() {
    leaderboardMap.clear();
  }
};
