// ═══════════════════════════════════════════════════════════════════
// /api/models — Returns AI_MODELS in OpenAI-compatible format
// Used by Vibe Studio (bolt) to dynamically fetch available models
// ═══════════════════════════════════════════════════════════════════

import { AI_MODELS } from '@/api/aiEngine';
import { NextResponse } from 'next/server';

function getModelFamily(modelStr: string): string {
  const str = modelStr.toLowerCase();
  if (str.includes('claude')) return 'Anthropic';
  if (str.includes('gpt') || str.includes('o1') || str.includes('o3')) return 'OpenAI';
  if (str.includes('gemini')) return 'Google';
  if (str.includes('llama')) return 'Meta';
  if (str.includes('qwen')) return 'Qwen';
  if (str.includes('deepseek')) return 'DeepSeek';
  if (str.includes('mistral') || str.includes('mixtral')) return 'Mistral';
  if (str.includes('unlimited')) return 'Unlimited';
  return 'Inixa Custom';
}

export async function GET() {
  const data = AI_MODELS.map((model) => ({
    id: model.modelStr,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'inixa',
    family: getModelFamily(model.modelStr),
  }));

  return NextResponse.json({ object: 'list', data });
}
