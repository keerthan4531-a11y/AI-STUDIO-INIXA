import { NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit, extractApiKeyFromHeader } from '@/lib/apiKeyManager';

export const maxDuration = 60; // Allow longer execution time for AI responses

// CORS Headers for public API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // 1. Check Authorization
    const authHeader = request.headers.get('authorization');
    const rawKey = extractApiKeyFromHeader(authHeader);

    if (!rawKey) {
      return NextResponse.json(
        { error: { message: 'Invalid or missing Authorization header. Expected format: Bearer inx_...', type: 'authentication_error' } },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2. Validate API Key
    const validation = await validateApiKey(rawKey);
    if (!validation.valid || !validation.record) {
      return NextResponse.json(
        { error: { message: validation.error || 'Invalid API key.', type: 'authentication_error' } },
        { status: 401, headers: corsHeaders }
      );
    }

    const keyHash = validation.record.keyHash;

    // 3. Check Rate Limit
    const rateLimit = await checkRateLimit(keyHash);
    
    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(Math.max(0, rateLimit.remaining)),
      'X-RateLimit-Reset': String(rateLimit.resetAt),
      ...corsHeaders
    };

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { message: 'Rate limit exceeded. Try again later.', type: 'rate_limit_error' } },
        { status: 429, headers: rateLimitHeaders }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: { message: 'messages array is required.', type: 'invalid_request_error' } },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // 5. Proxy to our INTERNAL rich Next.js API endpoint instead of the raw CF worker
    // This ensures all AI_MODELS, formatting, G4F, and fallback logic is fully supported.
    const url = new URL(request.url);
    const targetUrl = `${url.origin}/api/chat/completions`;

    // Add tracking headers or clean up body if needed
    const proxyReqBody = { ...body };

    let proxyRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional: Pass through user agent or other info
      },
      body: JSON.stringify(proxyReqBody),
    });

    // 6. Fallback Logic: If primary model fails, fallback to Qwen Max
    if (!proxyRes.ok) {
      console.log(`[V1 API] Primary model "${body.model}" failed (Status: ${proxyRes.status}). Falling back to Qwen 3.7 Max...`);
      const fallbackBody = { ...proxyReqBody, model: 'qwen-free/qwen-max' };
      
      proxyRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackBody),
      });
    }

    // 7. Handle Streaming response
    if (body.stream && proxyRes.ok && proxyRes.body) {
      return new Response(proxyRes.body, {
        status: proxyRes.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...rateLimitHeaders
        }
      });
    }

    // 7. Handle Standard JSON response
    const data = await proxyRes.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      return NextResponse.json(
        { error: { message: 'Invalid response from upstream AI provider.', type: 'upstream_error' } },
        { status: 502, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(jsonData, {
      status: proxyRes.status,
      headers: rateLimitHeaders
    });

  } catch (error: any) {
    console.error('[Public API /v1/chat/completions] Error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error processing the API request.', type: 'server_error' } },
      { status: 500, headers: corsHeaders }
    );
  }
}
