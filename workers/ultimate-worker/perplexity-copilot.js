export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      
      const messages = body.messages || [];
      // Filter out system messages (like CHART_SYSTEM_PROMPT) because Perplexity search gets confused by them
      const userAndAssistantMessages = messages.filter(m => m.role !== 'system');
      
      // Combine messages. For search queries, just joining text is better than role prefixes
      let fullPrompt = userAndAssistantMessages.map((m, i) => {
        if (i === userAndAssistantMessages.length - 1 && m.role === 'user') {
          return m.content; // Just the query for the final user message
        }
        return `${m.role}: ${m.content}`;
      }).join("\n\n");
      
      // Fallback if no messages but a generic query is provided
      if (!fullPrompt && body.query) {
        fullPrompt = body.query;
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
        "query_str": fullPrompt
      };

      const perplexityHeaders = {
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
      };

      const response = await fetch("https://www.perplexity.ai/rest/sse/perplexity_ask", {
        method: "POST",
        headers: perplexityHeaders,
        body: JSON.stringify(payload)
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Content-Type", "text/event-stream");

      // Parse Perplexity SSE and transform to OpenAI format
      let buffer = '';
      let fullResponse = '';
      
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          buffer += new TextDecoder().decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue; // We'll send DONE at the end

              try {
                const jsonData = JSON.parse(jsonStr);
                
                for (const block of jsonData.blocks || []) {
                  for (const patch of block.diff_block?.patches || []) {
                    if (patch.path === "/progress" || patch.path.startsWith("/goals")) continue;
                    
                    if (patch.path.endsWith("/text") || patch.path.endsWith("/content")) {
                      let value = patch.value || "";
                      if (typeof value === "object") {
                        value = value.answer || value.text || "";
                      }
                      
                      if (typeof value === "string") {
                        // Extract delta
                        if (value.startsWith(fullResponse)) {
                          value = value.slice(fullResponse.length);
                        } else if (fullResponse.endsWith(value)) {
                          value = "";
                        }

                        if (value) {
                          fullResponse += value;
                          const openaiChunk = {
                            id: `chatcmpl-${Date.now()}`,
                            object: 'chat.completion.chunk',
                            created: Math.floor(Date.now() / 1000),
                            model: "copilot",
                            choices: [{ index: 0, delta: { content: value }, finish_reason: null }],
                          };
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        },
        flush(controller) {
          const encoder = new TextEncoder();
          const finalChunk = { id: `chatcmpl-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: "copilot", choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        }
      });

      return new Response(response.body.pipeThrough(transformStream), {
        status: response.status,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
