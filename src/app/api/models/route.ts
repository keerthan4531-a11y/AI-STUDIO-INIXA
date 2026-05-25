// ═══════════════════════════════════════════════════════════════════
// /api/models — Returns AI_MODELS in OpenAI-compatible format
// Used by Vibe Studio (bolt) to dynamically fetch available models
// ═══════════════════════════════════════════════════════════════════

import { AI_MODELS } from '@/api/aiEngine';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = AI_MODELS.map((model) => ({
    id: model.modelStr,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'inixa',
  }));

  return NextResponse.json({ object: 'list', data });
}
