import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge'; // Cloudflare-like Edge worker runtime

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const payload = {
      "params": {
        "last_backend_uuid": "627625f2-77cb-43f3-ab91-c04b0f9a34ef",
        "read_write_token": "22c2d43d-857d-4210-9e34-ce72a5657a35",
        "attachments": [],
        "language": "en-GB",
        "timezone": "Asia/Calcutta",
        "search_focus": "internet",
        "sources": ["web"],
        "frontend_uuid": "062b5138-5ea9-4ffa-b80a-640e800eee43",
        "mode": "copilot",
        "model_preference": "turbo",
        "is_related_query": false,
        "is_sponsored": false,
        "prompt_source": "user",
        "query_source": "followup",
        "is_incognito": false,
        "time_from_first_type": 613.6000000238419,
        "local_search_enabled": false,
        "use_schematized_api": true,
        "send_back_text_in_streaming_api": false,
        "supported_block_use_cases": [
          "answer_modes", "media_items", "knowledge_cards", "inline_entity_cards", "place_widgets",
          "finance_widgets", "sports_widgets", "news_widgets", "shopping_widgets", "jobs_widgets",
          "search_result_widgets", "inline_images", "inline_assets", "placeholder_cards", "diff_blocks",
          "inline_knowledge_cards", "entity_group_v2", "refinement_filters", "canvas_mode", "maps_preview",
          "answer_tabs", "price_comparison_widgets", "preserve_latex", "generic_onboarding_widgets",
          "in_context_suggestions", "pending_followups", "inline_claims", "unified_assets", "workflow_steps",
          "workflow_widgets", "navigation_results", "background_agents"
        ],
        "client_coordinates": null,
        "mentions": [],
        "skip_search_enabled": true,
        "is_nav_suggestions_disabled": false,
        "followup_source": "link",
        "source": "default",
        "always_search_override": false,
        "override_no_search": false,
        "should_ask_for_mcp_tool_confirmation": true,
        "supports_tool_approval_modal": true,
        "force_enable_browser_agent": false,
        "supported_features": ["browser_agent_permission_banner_v1.1"],
        "extended_context": false,
        "is_local_browser_available": false,
        "is_local_browser_allowed": false,
        "version": "2.18",
        "rum_session_id": "95d0263a-14b5-46c4-ade1-d70d020e3538"
      },
      "query_str": query
    };

    const response = await fetch("https://www.perplexity.ai/rest/sse/perplexity_ask", {
      method: "POST",
      headers: {
        "accept": "text/event-stream",
        "accept-language": "en-IN,en-US;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Google Chrome\";v=\"150\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-perplexity-request-endpoint": "https://www.perplexity.ai/rest/sse/perplexity_ask",
        "x-perplexity-request-reason": "ask-query-state-provider",
        "x-perplexity-request-try-number": "1",
        "x-request-id": "062b5138-5ea9-4ffa-b80a-640e800eee43",
        "referrer": "https://www.perplexity.ai/search/627625f2-77cb-43f3-ab91-c04b0f9a34ef",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: "Perplexity upstream error", status: response.status, details: text }, { status: response.status });
    }

    // Return the SSE stream directly to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
