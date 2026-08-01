import { NextResponse } from 'next/server';
import { battleLeaderboardStore } from '@/lib/battleLeaderboardStore';

// GET /api/battle/leaderboard - Retrieve real-time leaderboard
export async function GET() {
  const entries = battleLeaderboardStore.getEntries();
  return NextResponse.json({
    ok: true,
    leaderboard: entries
  });
}

// POST /api/battle/leaderboard - Update real contestant score
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, totalScore, completedQuestions, avgAccuracy, timeSpentMinutes } = body;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ ok: false, error: 'Username is required' }, { status: 400 });
    }

    const updated = battleLeaderboardStore.updateEntry({
      username: username.trim(),
      totalScore: Number(totalScore) || 0,
      completedQuestions: Number(completedQuestions) || 0,
      avgAccuracy: Number(avgAccuracy) || 0,
      timeSpentMinutes: Number(timeSpentMinutes) || 0
    });

    const leaderboard = battleLeaderboardStore.getEntries();
    return NextResponse.json({
      ok: true,
      entry: updated,
      leaderboard
    });
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
