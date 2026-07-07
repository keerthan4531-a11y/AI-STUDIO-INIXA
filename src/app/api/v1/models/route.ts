import { NextResponse } from 'next/server';
import { AI_MODELS } from '@/api/aiEngine';


// CORS Headers for public API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    const models = AI_MODELS.map(m => ({
      id: m.modelStr || m.id,
      object: 'model',
      created: 1686935002,
      owned_by: m.provider || m.engine || 'inixa',
      permission: [],
      root: m.modelStr || m.id,
      parent: null,
    }));

    return NextResponse.json(
      { object: 'list', data: models },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500, headers: corsHeaders }
    );
  }
}
