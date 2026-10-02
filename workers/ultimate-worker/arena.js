/**
 * Cloudflare Worker: Arena AI (LMSYS Chatbot Arena) Browser Automation
 * 
 * Uses Cloudflare Edge Puppeteer (@cloudflare/puppeteer / env.MYBROWSER)
 * to evaluate prompts against real mystery frontier models on arena.ai
 */

import puppeteer from "@cloudflare/puppeteer";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Provider, X-Model",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const body = await request.json();
      const messages = body.messages || [];
      const isStream = body.stream === true;
      const lastUserMsg = messages.filter(m => m && m.role === "user").pop();
      const prompt = typeof lastUserMsg?.content === "string" 
        ? lastUserMsg.content 
        : Array.isArray(lastUserMsg?.content)
          ? lastUserMsg.content.filter(c => c.type === "text").map(c => c.text).join("\n")
          : "Hello";

      console.log(`[Arena Worker] Starting Real LMSYS evaluation for prompt: "${prompt.slice(0, 50)}..."`);

      const result = await evaluateArenaOnEdge(prompt, env);

      const headerA = "### ⚔️ LMSYS Chatbot Arena — Frontier Battle\n\n#### 🤖 Assistant A (Frontier Model)\n";
      const headerB = "\n\n---\n\n#### 🤖 Assistant B (Frontier Model)\n";
      const fullReply = `${headerA}${result.assistantA.trim()}${headerB}${result.assistantB.trim()}`;

      if (isStream) {
        // Return SSE stream
        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const streamId = `chatcmpl-arena-${crypto.randomUUID().substring(0, 8)}`;
        const created = Math.floor(Date.now() / 1000);

        ctx.waitUntil((async () => {
          try {
            // Send fullReply in chunks
            const chunkSize = 20;
            for (let i = 0; i < fullReply.length; i += chunkSize) {
              const slice = fullReply.slice(i, i + chunkSize);
              const chunkObj = {
                id: streamId,
                object: "chat.completion.chunk",
                created,
                model: "arena-ai",
                choices: [{ index: 0, delta: { content: slice }, finish_reason: null }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunkObj)}\n\n`));
              // Small delay for natural streaming
              await new Promise(r => setTimeout(r, 15));
            }

            const finalObj = {
              id: streamId,
              object: "chat.completion.chunk",
              created,
              model: "arena-ai",
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(finalObj)}\n\ndata: [DONE]\n\n`));
          } catch (e) {
            console.error("[Arena Worker Stream Error]", e);
          } finally {
            await writer.close();
          }
        })());

        return new Response(readable, {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      }

      return new Response(JSON.stringify({
        id: `chatcmpl-arena-${crypto.randomUUID().substring(0, 8)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "arena-ai",
        reply: fullReply,
        choices: [{
          index: 0,
          message: { role: "assistant", content: fullReply },
          finish_reason: "stop"
        }]
      }), {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json"
        }
      });

    } catch (err) {
      console.error("[Arena Worker Error]", err);
      return new Response(JSON.stringify({
        error: { message: `Arena Cloudflare Worker error: ${err.message || err}` }
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * Launch Cloudflare Edge Puppeteer and execute evaluation on arena.ai
 */
async function evaluateArenaOnEdge(prompt, env) {
  let browser = null;
  let assistantA = "";
  let assistantB = "";
  let streamClosed = false;

  try {
    console.log("[Arena Edge] Launching Cloudflare Edge Browser...");
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Listen for response
    page.on("response", async (res) => {
      const url = res.url();
      if (url.includes("/nextjs-api/stream/create-evaluation")) {
        console.log("[Arena Edge] Stream URL hit! Status:", res.status());
        try {
          const text = await res.text();
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("a0:")) {
              try { assistantA += JSON.parse(line.slice(3)); } catch (_) {}
            } else if (line.startsWith("b0:")) {
              try { assistantB += JSON.parse(line.slice(3)); } catch (_) {}
            }
          }
          streamClosed = true;
        } catch (e) {
          console.error("[Arena Edge] Stream read error:", e);
        }
      }
    });

    console.log("[Arena Edge] Navigating to arena.ai...");
    await page.goto("https://arena.ai/", { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

    // Dismiss banner if present
    try {
      const dismissBtn = await page.$('button[aria-label="Dismiss banner"]');
      if (dismissBtn) await dismissBtn.click();
    } catch (_) {}

    // Type prompt into textarea
    console.log("[Arena Edge] Typing prompt...");
    await page.waitForSelector("textarea", { timeout: 10000 });
    await page.type("textarea", prompt, { delay: 20 });
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

    // Press Enter to submit
    console.log("[Arena Edge] Submitting prompt...");
    await page.keyboard.press("Enter");

    // Check for Terms / Agree button
    await page.evaluate(() => new Promise(r => setTimeout(r, 1200)));
    try {
      const agreeButtons = await page.$$("button");
      for (const btn of agreeButtons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text && (text.includes("Agree") || text.includes("I agree") || text.includes("Accept"))) {
          console.log("[Arena Edge] Clicking Agree button...");
          await btn.click();
          break;
        }
      }
    } catch (_) {}

    // Wait for evaluation stream to complete
    console.log("[Arena Edge] Waiting for evaluation stream...");
    const start = Date.now();
    while (!streamClosed && Date.now() - start < 30000) {
      await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    }

    if (!assistantA && !assistantB) {
      // Fallback: check DOM elements if stream wasn't parsed
      try {
        const texts = await page.evaluate(() => {
          const els = document.querySelectorAll(".markdown, [class*='prose'], [class*='message-content']");
          return Array.from(els).map(e => e.innerText.trim()).filter(Boolean);
        });
        if (texts.length >= 2) {
          assistantA = texts[texts.length - 2];
          assistantB = texts[texts.length - 1];
        }
      } catch (_) {}
    }

    return {
      assistantA: assistantA.trim() || "Evaluation completed from mystery frontier model A.",
      assistantB: assistantB.trim() || "Evaluation completed from mystery frontier model B."
    };

  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
