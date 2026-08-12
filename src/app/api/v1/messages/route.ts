import { handleAnthropicMessages, handleAnthropicOptions, handleAnthropicGet } from '@/lib/anthropicAdapter';

export const maxDuration = 60;

export async function OPTIONS() {
  return handleAnthropicOptions();
}

export async function GET() {
  return handleAnthropicGet();
}

export async function POST(request: Request) {
  return handleAnthropicMessages(request);
}
