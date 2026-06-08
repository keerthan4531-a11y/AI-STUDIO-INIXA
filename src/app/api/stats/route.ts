import { NextResponse } from 'next/server';
import { adminStats } from '@/api/admin-stats';

// Public endpoint for profile metrics
export async function GET(req: Request) {
  const stats = adminStats.getStats();
  // Only return non-sensitive public data
  return NextResponse.json({ 
    ok: true, 
    tokenHistory: stats.tokenHistory,
    totalTokens: stats.totalTokens
  });
}
