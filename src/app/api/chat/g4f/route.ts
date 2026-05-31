import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════
// G4F Chat API Route — Vercel-Compatible (No Proxy Agents)
// ═══════════════════════════════════════════════════════════════════
// This route calls G4F endpoints DIRECTLY using fetch() with spoofed
// IP headers. No Node.js proxy agents needed (they break on Vercel).
//
// Rate limit bypass strategy:
// 1. Spoof X-Forwarded-For with random realistic residential IPs
// 2. Rotate User-Agent per request
// 3. Auto-retry across multiple provider endpoints
// 4. Use both g4f.space/custom/ and direct upstream endpoints
// ═══════════════════════════════════════════════════════════════════

// ── G4F Provider Registry ──────────────────────────────────────────
// Each provider is a reverse-proxied endpoint from G4F's infrastructure.
// They store their OWN API keys server-side — we don't need any.
interface G4FProvider {
  serverId?: string;
  endpoint: string;
  defaultModel: string;
  models: string[];
}

const G4F_PROVIDERS: Record<string, G4FProvider> = {
  "nvidia": {
    serverId: "srv_mkombumpae45db46dcb8",
    endpoint: "https://g4f.space/custom/srv_mkombumpae45db46dcb8/chat/completions",
    defaultModel: "moonshotai/kimi-k2.6",
    models: ["moonshotai/kimi-k2.6", "nvidia/nemotron-3-nano-30b-a3b", "nvidia/nemotron-3-super-120b-a12b", "openai/gpt-oss-120b"],
  },
  "ollama": {
    serverId: "srv_mnkjel2208cf770e5009",
    endpoint: "https://g4f.space/custom/srv_mnkjel2208cf770e5009/chat/completions",
    defaultModel: "nemotron-3-nano:30b",
    models: ["nemotron-3-nano:30b", "deepseek-v4-flash", "deepseek-v4-pro", "gpt-oss:120b", "gpt-oss:20b"],
  },
  "openrouter": {
    serverId: "srv_mm0u9cua212491d78695",
    endpoint: "https://g4f.space/custom/srv_mm0u9cua212491d78695/chat/completions",
    defaultModel: "openrouter/free",
    models: ["openrouter/free", "deepseek/deepseek-r1:free", "google/gemini-2.5-pro-free", "x-ai/grok-beta:free"],
  },
  "pollinations": {
    serverId: "srv_mkoloq41e34074b6133e",
    endpoint: "https://g4f.space/custom/srv_mkoloq41e34074b6133e/chat/completions",
    defaultModel: "openai-fast",
    models: ["openai-fast", "openai", "openai-large", "deepseek", "mistral", "llama", "claude-fast", "grok"],
  },
  "groq": {
    serverId: "srv_mkom688d57c76d8a3542",
    endpoint: "https://g4f.space/custom/srv_mkom688d57c76d8a3542/chat/completions",
    defaultModel: "moonshotai/kimi-k2-instruct-0905",
    models: ["moonshotai/kimi-k2-instruct-0905", "openai/gpt-oss-120b", "openai/gpt-oss-20b"],
  },
  "gemini": {
    serverId: "srv_mkol5tgcd33cc358ddbc",
    endpoint: "https://g4f.space/custom/srv_mkol5tgcd33cc358ddbc/chat/completions",
    defaultModel: "models/gemini-flash-latest",
    models: ["models/gemini-flash-latest", "models/gemini-pro-latest", "models/gemini-3.5-flash", "models/gemini-3-flash-preview", "models/gemini-2.5-flash"],
  },
  "perplexity": {
    serverId: "srv_mjlq1ncq8a3f7fe0aea0",
    endpoint: "https://g4f.space/custom/srv_mjlq1ncq8a3f7fe0aea0/chat/completions",
    defaultModel: "turbo",
    models: ["turbo", "sonar-pro"],
  },
  "airforce": {
    serverId: "srv_mkomfko63371049b6da6",
    endpoint: "https://g4f.space/custom/srv_mkomfko63371049b6da6/chat/completions",
    defaultModel: "deepseek-v3.2:free",
    models: ["deepseek-v3.2:free"],
  },
  "azure": {
    serverId: "srv_mks0cusg6010f87029ea",
    endpoint: "https://g4f.space/custom/srv_mks0cusg6010f87029ea/chat/completions",
    defaultModel: "model-router3",
    models: ["model-router3"],
  },
  // Direct upstream endpoints (no g4f proxy)
  "pollinations-direct": {
    endpoint: "https://text.pollinations.ai/openai",
    defaultModel: "openai-fast",
    models: ["openai-fast", "openai", "openai-large", "deepseek", "mistral", "llama"],
  },
  // G4F Worker endpoints
  "perplexity-worker": {
    serverId: "srv_mkopv2kp2e0038cdf550",
    endpoint: "https://g4f.space/custom/srv_mkopv2kp2e0038cdf550/chat/completions",
    defaultModel: "turbo",
    models: ["auto", "turbo", "gpt5", "gpt41", "o3", "claude45sonnet", "grok", "grok4", "gemini2flash", "r1"],
  },
  // New providers found in g4f source
  "deepseek-hf": {
    serverId: "srv_mp2huzrg06e426ad12f3",
    endpoint: "https://g4f.space/custom/srv_mp2huzrg06e426ad12f3/chat/completions",
    defaultModel: "deepseek-ai/DeepSeek-V4-Pro",
    models: ["deepseek-ai/DeepSeek-V4-Pro", "deepseek-ai/DeepSeek-V4-Flash"],
  },
  "unmoderated": {
    serverId: "srv_mp3lmkuad07322459f47",
    endpoint: "https://g4f.space/custom/srv_mp3lmkuad07322459f47/chat/completions",
    defaultModel: "unmoderated-gpt",
    models: ["unmoderated-gpt"],
  },
  "kimi": {
    serverId: "srv_mp5miql908c8738d71be",
    endpoint: "https://g4f.space/custom/srv_mp5miql908c8738d71be/chat/completions",
    defaultModel: "kimi-k2.6",
    models: ["kimi-k2.6"],
  },
  // G4F Main v1 endpoint (auto-routes to any provider)
  "g4f-v1": {
    endpoint: "https://g4f.space/v1/chat/completions",
    defaultModel: "auto",
    models: ["auto"],
  },
};

// ── Realistic IP Generation ────────────────────────────────────────
const IP_RANGES = [
  // Indian ISPs (Jio, Airtel, BSNL, ACT)
  [49, 36], [157, 46], [117, 194], [106, 210], [59, 88],
  [103, 78], [223, 226], [182, 64], [14, 139], [27, 56],
  // US ISPs (Comcast, AT&T, Verizon, Charter, Cox)
  [73, 1], [99, 1], [174, 204], [24, 30], [71, 60],
  [68, 100], [76, 14], [108, 28], [98, 10], [50, 2],
  // European (DT, BT, Orange, Telefonica)
  [85, 10], [82, 12], [90, 180], [83, 44], [77, 28],
  // Japanese/Korean/SE Asian
  [126, 100], [218, 219], [175, 200], [110, 36], [124, 6],
  // Brazilian, Australian
  [177, 18], [200, 140], [101, 0], [203, 2], [58, 84],
];

function generateRealisticIP(): string {
  const prefix = IP_RANGES[Math.floor(Math.random() * IP_RANGES.length)];
  return `${prefix[0]}.${prefix[1]}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`;
}

function generateRandomUserAgent(): string {
  const versions = ['120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138'];
  const platforms = [
    'Windows NT 10.0; Win64; x64',
    'Macintosh; Intel Mac OS X 10_15_7',
    'X11; Linux x86_64',
    'Macintosh; Intel Mac OS X 14_5',
    'Windows NT 11.0; Win64; x64',
  ];
  const v = versions[Math.floor(Math.random() * versions.length)];
  const p = platforms[Math.floor(Math.random() * platforms.length)];
  return `Mozilla/5.0 (${p}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`;
}

// ── Find provider by server ID ─────────────────────────────────────
function findProviderByServerId(serverId: string): [string, G4FProvider] | null {
  for (const [name, provider] of Object.entries(G4F_PROVIDERS)) {
    if (provider.serverId === serverId) {
      return [name, provider];
    }
  }
  return null;
}

// ── Find providers that support a given model ──────────────────────
function findProvidersForModel(modelStr: string): string[] {
  const providers: string[] = [];
  for (const [name, provider] of Object.entries(G4F_PROVIDERS)) {
    if (provider.models.includes(modelStr)) {
      providers.push(name);
    }
  }
  return providers;
}

// ── Make a single request to a G4F provider ────────────────────────
async function makeG4FRequest(
  provider: G4FProvider,
  requestBody: any,
  stream: boolean,
  timeoutMs = 30000
): Promise<Response> {
  const fakeIP = generateRealisticIP();
  const userAgent = generateRandomUserAgent();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': userAgent,
    'X-Forwarded-For': fakeIP,
    'X-Real-IP': fakeIP,
    'Accept': stream ? 'text/event-stream' : 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://g4f.dev',
    'Referer': 'https://g4f.dev/',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// POST Handler — Smart G4F Router with Auto-Retry & IP Rotation
// ═══════════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, stream } = body;
    let model: string = body.model || 'auto';

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    console.log(`[G4F Route] Incoming model: "${model}", stream: ${stream}`);

    // ── Parse model string: "g4f/serverId:modelName" ──
    let targetServerId: string | null = null;
    let targetModelName: string = model;

    // Strip g4f/ prefix
    if (model.startsWith('g4f/')) {
      targetModelName = model.replace('g4f/', '');
    }

    // Parse serverId:modelName format
    if (targetModelName.includes(':')) {
      const colonIdx = targetModelName.indexOf(':');
      const possibleServerId = targetModelName.substring(0, colonIdx);
      const possibleModel = targetModelName.substring(colonIdx + 1);
      
      // Check if this is a serverId (starts with srv_)
      if (possibleServerId.startsWith('srv_')) {
        targetServerId = possibleServerId;
        targetModelName = possibleModel;
      }
    }

    // ── Determine which providers to try ──
    let providersToTry: string[] = [];

    if (targetServerId) {
      // Find the provider that owns this server ID
      const found = findProviderByServerId(targetServerId);
      if (found) {
        providersToTry.push(found[0]);
        console.log(`[G4F Route] Matched server ${targetServerId} → provider "${found[0]}"`);
      } else {
        // Server ID not in our registry — construct endpoint directly
        console.log(`[G4F Route] Unknown server ${targetServerId}, trying direct endpoint`);
        const directProvider: G4FProvider = {
          serverId: targetServerId,
          endpoint: `https://g4f.space/custom/${targetServerId}/chat/completions`,
          defaultModel: targetModelName,
          models: [targetModelName],
        };
        G4F_PROVIDERS[`direct-${targetServerId}`] = directProvider;
        providersToTry.push(`direct-${targetServerId}`);
      }
    }

    // If no server ID match, find providers that have this model
    if (providersToTry.length === 0 && targetModelName !== 'auto') {
      providersToTry = findProvidersForModel(targetModelName);
    }

    // If still nothing, use all providers in priority order
    if (providersToTry.length === 0) {
      providersToTry = [
        'pollinations-direct',
        'pollinations',
        'nvidia',
        'openrouter',
        'gemini',
        'groq',
        'ollama',
        'perplexity-worker',
        'airforce',
        'perplexity',
        'azure',
        'g4f-v1',
      ];
    }

    console.log(`[G4F Route] Will try ${providersToTry.length} providers: ${providersToTry.slice(0, 5).join(', ')}...`);

    // ── Try each provider with unique IP per attempt ──
    const maxAttempts = Math.min(providersToTry.length, 6);
    const errors: Array<{ provider: string; status?: number; error: string }> = [];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const providerName = providersToTry[attempt];
      const provider = G4F_PROVIDERS[providerName];
      if (!provider) continue;

      const requestModel = targetModelName || provider.defaultModel;
      const requestBody = {
        ...body,
        model: requestModel,
        stream: stream === true,
      };
      // Remove our routing prefix so upstream doesn't get confused
      delete requestBody.provider;

      console.log(`[G4F Route] Attempt ${attempt + 1}/${maxAttempts}: provider="${providerName}", model="${requestModel}"`);

      try {
        const response = await makeG4FRequest(provider, requestBody, stream === true);

        if (response.ok) {
          console.log(`[G4F Route] ✅ Success on attempt ${attempt + 1} via "${providerName}"!`);

          if (stream === true && response.body) {
            // Stream response — pass through directly
            return new Response(response.body, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-G4F-Provider': providerName,
                'X-G4F-Model': requestModel,
                'X-G4F-Attempt': String(attempt + 1),
              },
            });
          }

          // Non-stream: parse and return
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';

          return NextResponse.json(
            { reply, provider: providerName, model: requestModel },
            {
              headers: {
                'X-G4F-Provider': providerName,
                'X-G4F-Model': requestModel,
              },
            }
          );
        }

        // Handle non-OK responses
        const errorText = await response.text().catch(() => 'Unknown error');
        const errSummary = errorText.substring(0, 200);
        errors.push({ provider: providerName, status: response.status, error: errSummary });

        console.log(`[G4F Route] ❌ Provider "${providerName}" returned ${response.status}: ${errSummary.substring(0, 80)}`);

        // If 429 (rate limited) or 5xx, try next provider
        if (response.status === 429 || response.status >= 500) {
          continue;
        }

        // For 402 (payment required), also try next
        if (response.status === 402) {
          continue;
        }

        // For other 4xx, also retry (model might not be on this provider)
        if (response.status >= 400 && response.status < 500) {
          continue;
        }
      } catch (error: any) {
        const errMsg = error.name === 'AbortError' ? 'Timeout (30s)' : (error.message || 'Unknown error');
        errors.push({ provider: providerName, error: errMsg });
        console.log(`[G4F Route] ❌ Provider "${providerName}" error: ${errMsg}`);
        continue;
      }
    }

    // ── All providers failed ──
    console.error(`[G4F Route] All ${maxAttempts} providers failed for model "${targetModelName}"`);
    
    return NextResponse.json(
      {
        ok: false,
        error: `All ${maxAttempts} G4F providers failed or are rate-limited`,
        reply: `⚠️ All G4F providers failed. Errors:\n${errors.map(e => `• ${e.provider}: ${e.status || 'error'} — ${e.error.substring(0, 80)}`).join('\n')}`,
        attempts: errors,
      },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('[G4F Route] Fatal error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error', reply: `❌ G4F Route Error: ${error.message}` },
      { status: 500 }
    );
  }
}
