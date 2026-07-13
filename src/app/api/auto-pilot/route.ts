import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Use API keys from environment variable (comma separated) or a mock key to avoid github blocks
const API_KEYS = process.env.GEMINI_API_KEYS 
  ? process.env.GEMINI_API_KEYS.split(',') 
  : ["MOCK_KEY"];

let currentKeyIndex = 0;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      let success = false;
      let attempts = 0;

      while (!success && attempts < API_KEYS.length) {
        try {
          const client = new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
          
          sendEvent('status', { message: `Initializing Auto-Pilot Agent (Key ${currentKeyIndex + 1}/${API_KEYS.length})...` });

          // Start interaction in background to allow polling for steps
          const interaction = await client.interactions.create({
            model: 'gemini-3.5-flash',
            input: prompt,
            tools: [{ type: "computer_use", environment: "browser" }],
            background: true
          });

          sendEvent('status', { message: `Agent spawned in isolated virtual browser. Session ID: ${interaction.id}` });
          
          let lastStepCount = 0;

          // Poll for real-time updates
          while (true) {
            const result = await client.interactions.get(interaction.id);
            
            if (result.steps && result.steps.length > lastStepCount) {
              const newSteps = result.steps.slice(lastStepCount);
              for (const step of newSteps) {
                const s = step as any;
                // Determine action type from step content
                let actionDesc = "Processing...";
                let actionData = null;
                if (s.content?.[0]?.text) {
                   actionDesc = s.content[0].text;
                } else if (s.type === 'function_call') {
                   const callName = s.name;
                   actionDesc = `Running tool: ${callName}`;
                   if (s.arguments) {
                       actionData = s.arguments;
                       if (callName === 'navigate') {
                           actionDesc = `Navigate to: ${s.arguments.url}`;
                       } else if (callName === 'click') {
                           actionDesc = `Click element on page...`;
                       } else if (callName === 'type') {
                           actionDesc = `Type: "${s.arguments.text || s.arguments.value || '...'}"`;
                       } else if (s.arguments.intent) {
                           actionDesc = s.arguments.intent;
                       }
                   }
                } else if (s.tool_calls?.[0]) {
                   const call = s.tool_calls[0];
                   actionDesc = `Running tool: ${call.name}`;
                   if (call.name === 'computer_use' && call.args) {
                       actionData = call.args;
                       actionDesc = `Action: ${call.args.action}`;
                   } else if (call.args) {
                       actionData = call.args;
                   }
                } else if (s.status) {
                   actionDesc = `Status updated: ${s.status}`;
                }
                sendEvent('step', { text: actionDesc, data: actionData, timestamp: new Date().toISOString() });
              }
              lastStepCount = result.steps.length;
            }

            if (result.status === 'completed') {
              let finalOutput = "Task completed successfully.";
              const lastStep = result.steps?.at(-1) as any;
              if (lastStep?.content?.[0]?.text) {
                finalOutput = lastStep.content[0].text;
              }
              sendEvent('completed', { result: finalOutput });
              break;
            } else if (result.status === 'failed') {
               const r = result as any;
               sendEvent('error', { message: `Auto-pilot failed: ${r.error || 'Unknown error'}` });
               break;
            }
            
            // Wait 2 seconds before polling again
            await new Promise(r => setTimeout(r, 2000));
          }

          success = true;
        } catch (error: any) {
          const errorMessage = error.message || String(error);
          if (errorMessage.includes('429') || errorMessage.includes('Quota') || errorMessage.includes('limit')) {
             sendEvent('status', { message: `Quota limit reached on Key ${currentKeyIndex + 1}. Switching to fallback key...` });
             currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
             attempts++;
          } else {
             sendEvent('error', { message: `System Error: ${errorMessage}` });
             break;
          }
        }
      }

      if (!success && attempts >= API_KEYS.length) {
        sendEvent('error', { message: "All API keys have exhausted their quota. Please wait before trying again." });
      }

      controller.close();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
