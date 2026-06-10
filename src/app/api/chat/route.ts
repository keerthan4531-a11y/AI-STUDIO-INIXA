import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Create a custom OpenAI provider instance connecting to the free Pollinations API
// Pollinations provides an OpenAI-compatible endpoint without requiring an API key.
const customProvider = createOpenAI({
  baseURL: 'https://text.pollinations.ai/openai',
  apiKey: 'inixa-free-key', // Pollinations ignores this but requires the field
});

export const maxDuration = 60; // Vercel edge/serverless max duration

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();

    // Determine which model to route to
    // Default to 'openai' which pollinations resolves to their default model
    const requestedModel = model || 'openai';

    // Call the Vercel AI SDK streamText method
    const result = await streamText({
      model: customProvider(requestedModel),
      messages,
      temperature: 0.7,
    });

    // Return the streaming response directly to the client
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Vercel AI Route Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
