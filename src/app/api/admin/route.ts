import { NextResponse } from 'next/server';
import { adminStats } from '@/api/admin-stats';

// Verify Admin Password
function isAuthenticated(req: Request) {
  const authHeader = req.headers.get('authorization');
  const ADMIN_PASSWORD = process.env.INIXA_ADMIN_PASSWORD || 'inixa_admin_2026';
  
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const stats = adminStats.getStats();
  return NextResponse.json({ ok: true, stats });
}

export async function POST(req: Request) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'ban_ip') {
      if (body.ip) adminStats.banIp(body.ip);
    } else if (action === 'unban_ip') {
      if (body.ip) adminStats.unbanIp(body.ip);
    } else if (action === 'set_rate_limit') {
      if (typeof body.limit === 'number') adminStats.setRateLimit(body.limit);
    } else {
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, stats: adminStats.getStats() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Bad Request' }, { status: 400 });
  }
}
