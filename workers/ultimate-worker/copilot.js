/**
 * Microsoft Copilot Reverse-Engineered Worker
 * 
 * Cloudflare Worker providing OpenAI-compatible chat completions
 * using Microsoft Copilot (copilot.microsoft.com).
 * 
 * Supports modes:
 * - chat: Standard Microsoft Copilot (GPT-4o)
 * - reasoning: Copilot Think Deeper (o1-like reasoning)
 * - smart: Copilot GPT-5 Mode
 * - study: Copilot Study Mode
 */

import perplexityCopilotWorker from './perplexity-copilot.js';

const COPILOT_BASE = "https://copilot.microsoft.com";
const COPILOT_START_URL = `${COPILOT_BASE}/c/api/start`;
const COPILOT_WS_URL = `https://copilot.microsoft.com/c/api/chat?api-version=2`;

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0";

const DEFAULT_COOKIES = "auth0.IalDS3vRtEI5X0zvsmGG7zJP9UrHTcei.is.authenticated=true; BCP=AD=0&AL=0&SM=0; BFBUSR=BFBHP=0; bm_sv=B5109812E03F6C6510C545E30758B0C5~YAAQd43vdeogxK2fAQAAJ3/LvAAgxZ67m8OcRbycxk+LG+DiRlHS3AVRyBxdmMruNOK7TKwnXCa46Xx1V4o7HO4QhIaX55R/F1Fvk2PqkaRCLrA1xqMdOCfMd8PjcGAOXmz9s7tfrECOe+kkZpWFPVeuMnmmQgRr+pR7TA1o+GiNOcyesaIbjrZFGzq5x+fDzzwtWES/+6vEBpuGe+MJ75+/YSZbM13Ve6VTrJQFMLYcfz5PhDiBYfyxamBDhw==~1; did=s%3Av0%3Ae4f5d94b-7824-4bcd-bb0a-ec1c119dd9be%3A62990798e6f1bb8c92d31fd63acece4ac285548ce25ea3b4a31850233b3fb10a.RdNF%2Fcp%2BE99et0MXObWFAIIeLoxld8cMeJ%2Fa1w%2BNc08; did_compat=s%3Av0%3Ae4f5d94b-7824-4bcd-bb0a-ec1c119dd9be%3A62990798e6f1bb8c92d31fd63acece4ac285548ce25ea3b4a31850233b3fb10a.RdNF%2Fcp%2BE99et0MXObWFAIIeLoxld8cMeJ%2Fa1w%2BNc08; esctx=PBgABBwEAAAAdDD7nC9b5Q7JPd_okEQRFRXZvU3RzQXJ0aWZhY3RzDQAAAAAAGIal67Wn9ZGM8gJ7icIbpFMbbkKA8AkQ2v7-83BTzzY-_6TzlVKLQKXcWSufv3a_kBz28IO-KNUX8xHfbWdOJkzxm3HSI5U-ScUkLh8pag9GHfGleDLtGDsn-Z6u_jTCf1bbWXb6LFvw-fWyZM78aJaijlHXC57isjzPLrYFiW0qz7cD90UnPWjZKY-Sjemko8SrigKpVoqQgjeLtiFiunHx7LNxtEC9DSAYL6qSIecJWLc37BojnZVVvnUklVnZBCKQliM-E_rxdxXwuRJ2oplgtQymh3q_ASpb5b69S8jiinjGK2b_uBfpGQ67wVR5Eo4YSHAsoWiDHMOILWV9fO3_aZVhOXafkaWy56pQ0DQHH9WsfmY0_jW29M0CRI1gUK3pcrwi-_e9Gd1uGTsGduGZlHe6y_gaIK1etNaqLjCrvj4U7cFApD0V3IWmy25b173bWPIXVr4-xHUb2oIYMib8JtPJUVvBYi3UH3bdsABNusDQcPJ4nSs_IQhzu2XGYqSId6NXWhl3B5y-0I1eLjH15bGGb7srsGQHjKl-S9ECDyQCNUVQ-IaLZKe0CDkofR-cPclNm8xSj3_mUT_ojkhI2USusZib9AQbOq-EIpF1QouZkDAfD5GrPOXrWef6gSGEBjkVQ-ZLt4LAiz7HKpCower1D1sn3Qr_fXna7HyopIevganOzm8zp8gIN6hms_aolrkrQcjVHRcLkvw1k48ILmYUObHulEVjmS6-kIsgAA; fpc=As_P-r_vZexMkaRe4xC7TvY; GC=xYI_yrda9gfhokouSbnZr7cgFRPoylV27flUBJ_HTUwPU3WyIjtayjIOCWWE9T-4bByCl6lcpWeblI9ayyVXvA; MC1=GUID=76120b07d0564ca4b8b761cab6223aff&HASH=7612&LV=202608&V=4&LU=1785581044355; MMCASM=ID=82A911815AF34CDE935ECC6F1157735A; MS0=cd287afbd605433992adf92931ae6468; MUID=0703C70CF04B6C051FF3D0A4F1A16D39; MUIDB=0703C70CF04B6C051FF3D0A4F1A16D39; SRCHD=AF=ANAB01; SRCHHPGUSR=SRCHLANG=en&IG=47F0223A9E7B4377A18FEFA61D2F1C5C&PV=19.0.0&PREFCOL=1&BRW=XW&BRH=M&CW=1912&CH=994&SCW=1897&SCH=3843&DPR=1.0&UTC=330&B=0&EXLTT=31&HV=1785578876&HVE=CfDJ8A8rLfEh4ZdMhJ19YNJ4FtRWE9PLgjrO1pxHQOVAuzFc2CMPywRghHrFvCPu9q9UdQ1mEKkgzgYYhxBpINr-_aI4tkB7rDVA4sr6jtxZtD60bFke9bz5QLy7x6jLX5CW6fq2icNEKlukmCXyYKBpj9-C2O9SrCe3XseM5kLWV7rgKf4pJH_65MYngMZjUU90EA&PRVCW=1912&PRVCH=994&AV=14&ADV=14&RB=0&MB=0; SRCHUID=V=2&GUID=789764A6ED6342BDAF3367CFA684461F&dmnchg=1; SRCHUSR=DOB=20260402&DS=1&POEX=W; USRLOC=HS=1&ELOC=LAT=10.028275489807129|LON=77.49784088134766|N=Theni%2C%20Tamil%20Nadu|ELT=5|&CLOC=LAT=10.026798413529901|LON=77.50256932834522|A=733.4464586120832|TS=260801102956|SRC=I&BID=MjYwODAxMTU1OTU2XzYyMzcwOWVmOWU1ZDFjNzg2NzExODE3MjkzOTJkMmNiMTBiZDFiZjMyMzMxMGIzMTdmY2Q2YTZhNzlkMThjNzU=; WLS=C=00000000-0000-0000-382f-8fb7f88a06c8&N=keerthan+a; _RCCBON5NW17eBefkM7xO4Ez0y4Qo8vu3.yvO1EBDZk-1785580923.324134-1.0.1.1-dxHyzFHDae068egHFXMMwY3OTfpHghxewSi6GmF7TYDFFTkMpAz.1Bg3kY8QF9F6eOELPl19aEBVahoFBTDSj.3C_MqM6QY2Q1b3SygWDfjrn9MlozZFCkzKqOhJMZxV";

function generateRandomHex(length) {
  const chars = "0123456789ABCDEF";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getFallbackCookie() {
  const muid = generateRandomHex(32);
  const sid = generateRandomHex(32);
  return `_C_ETH=1; MUID=${muid}; MUIDB=${muid}; _EDGE_S=F=1&SID=${sid}; _EDGE_V=1`;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Copilot-Cookie",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let reqText = "";
    try {
      reqText = await request.text();
      let body;
      try {
        body = JSON.parse(reqText);
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
      }
      const messages = body.messages || [];
      const isStream = body.stream !== false;
      const model = (body.model || "ms-copilot").toLowerCase();

      // Format full prompt from message history
      const fullPrompt = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

      if (!fullPrompt) {
        return new Response(JSON.stringify({ error: "Messages array cannot be empty" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // Select mode based on requested model
      let mode = "chat";
      if (model.includes("think") || model.includes("reasoning") || model.includes("o1")) {
        mode = "reasoning";
      } else if (model.includes("gpt5") || model.includes("smart") || model.includes("gpt-5")) {
        mode = "smart";
      } else if (model.includes("study")) {
        mode = "study";
      }

      // Check for user-provided custom cookie in request headers or fallback to default
      const customCookie = request.headers.get("X-Copilot-Cookie");
      const cookieHeader = customCookie || DEFAULT_COOKIES;

      // Step 1: Initialize Copilot Conversation
      const startRes = await fetch(COPILOT_START_URL, {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "cookie": cookieHeader,
          "origin": COPILOT_BASE,
          "referer": `${COPILOT_BASE}/`,
          "user-agent": DEFAULT_USER_AGENT,
        },
        body: JSON.stringify({
          timeZone: "Asia/Calcutta",
          startNewConversation: true,
          teenSupportEnabled: true,
          correctPersonalizationSetting: true,
          performUserMerge: true,
          deferredDataUseCapable: true,
        }),
      });

      let conversationId = null;
      let effectiveCookie = cookieHeader;

      if (startRes.ok) {
        const startData = await startRes.json();
        conversationId = startData.currentConversationId || startData.conversationId;
      }

      // If initial start failed due to auth/cookies, try with fallback cookies
      if (!conversationId) {
        effectiveCookie = getFallbackCookie();
        const retryRes = await fetch(COPILOT_START_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "cookie": effectiveCookie,
            "origin": COPILOT_BASE,
            "referer": `${COPILOT_BASE}/`,
            "user-agent": DEFAULT_USER_AGENT,
          },
          body: JSON.stringify({
            timeZone: "Asia/Calcutta",
            startNewConversation: true,
            teenSupportEnabled: true,
            correctPersonalizationSetting: true,
            performUserMerge: true,
            deferredDataUseCapable: true,
          }),
        });

        if (retryRes.ok) {
          const retryData = await retryRes.json();
          conversationId = retryData.currentConversationId || retryData.conversationId;
        }
      }

      if (!conversationId) {
        throw new Error("Failed to start Microsoft Copilot conversation session");
      }

      // Step 2: Establish WebSocket Connection to Copilot Chat API
      const clientSessionId = crypto.randomUUID();
      const wsUrl = `https://copilot.microsoft.com/c/api/chat?api-version=2&clientSessionId=${clientSessionId}`;

      const wsRequest = new Request(wsUrl, {
        headers: {
          "Upgrade": "websocket",
          "Connection": "Upgrade",
          "User-Agent": DEFAULT_USER_AGENT,
          "Cookie": effectiveCookie,
          "Origin": COPILOT_BASE,
          "Referer": `${COPILOT_BASE}/`,
        },
      });

      const wsResponse = await fetch(wsRequest);
      const ws = wsResponse.webSocket;

      if (!ws) {
        throw new Error(`Failed to establish WebSocket with Copilot. WS Status: ${wsResponse.status} ${wsResponse.statusText}`);
      }

      ws.accept();

      // Payload to start chat
      const chatPayload = {
        event: "send",
        conversationId: conversationId,
        content: [
          {
            type: "text",
            text: fullPrompt,
          },
        ],
        mode: mode,
      };

      if (!isStream) {
        // Non-streaming response handling
        return new Promise((resolve) => {
          let fullText = "";
          let images = [];

          ws.addEventListener("message", (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              if (msg.event === "appendText" && msg.text) {
                fullText += msg.text;
              } else if (msg.event === "imageGenerated" && msg.url) {
                images.push(`![Image](${msg.url})`);
              } else if (msg.event === "done") {
                if (images.length > 0) {
                  fullText += "\n\n" + images.join("\n");
                }
                ws.close();
                resolve(
                  new Response(
                    JSON.stringify({
                      id: `chatcmpl-${Date.now()}`,
                      object: "chat.completion",
                      created: Math.floor(Date.now() / 1000),
                      model: body.model || "ms-copilot",
                      choices: [
                        {
                          index: 0,
                          message: {
                            role: "assistant",
                            content: fullText || "No content returned from Copilot.",
                          },
                          finish_reason: "stop",
                        },
                      ],
                    }),
                    {
                      status: 200,
                      headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                      },
                    }
                  )
                );
              }
            } catch (e) {
              // Parse error ignored
            }
          });

          ws.addEventListener("error", (err) => {
            resolve(
              new Response(JSON.stringify({ error: "WebSocket error: " + err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              })
            );
          });

          // Send message
          ws.send(JSON.stringify(chatPayload));
        });
      }

      // Streaming response handling (OpenAI SSE format)
      const encoder = new TextEncoder();
      const streamTransform = new ReadableStream({
        start(controller) {
          ws.addEventListener("message", (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              if (msg.event === "appendText" && msg.text) {
                const chunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || "ms-copilot",
                  choices: [
                    {
                      index: 0,
                      delta: { content: msg.text },
                      finish_reason: null,
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (msg.event === "imageGenerated" && msg.url) {
                const imgMarkdown = `\n\n![Generated Image](${msg.url})\n\n`;
                const chunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || "ms-copilot",
                  choices: [
                    {
                      index: 0,
                      delta: { content: imgMarkdown },
                      finish_reason: null,
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (msg.event === "done") {
                const finalChunk = {
                  id: `chatcmpl-${Date.now()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: body.model || "ms-copilot",
                  choices: [
                    {
                      index: 0,
                      delta: {},
                      finish_reason: "stop",
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                ws.close();
                controller.close();
              }
            } catch (e) {
              // Ignore invalid JSON frames
            }
          });

          ws.addEventListener("error", (err) => {
            const errChunk = {
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: body.model || "ms-copilot",
              choices: [
                {
                  index: 0,
                  delta: { content: `\n\n[Copilot WS Error: ${err.message || 'Connection failed'}]` },
                  finish_reason: "error",
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            ws.close();
            controller.close();
          });

          ws.addEventListener("close", () => {
            try {
              controller.close();
            } catch (e) {}
          });

          // Send message payload
          ws.send(JSON.stringify(chatPayload));
        },
      });

      return new Response(streamTransform, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      console.log(`[Copilot Worker] Primary WS failed (${error.message}). Falling back to Copilot Provider engine...`);
      try {
        const fallbackHeaders = new Headers(request.headers);
        fallbackHeaders.set("Content-Type", "application/json");
        const fallbackReq = new Request(request.url, {
          method: "POST",
          headers: fallbackHeaders,
          body: reqText
        });
        return await perplexityCopilotWorker.fetch(fallbackReq, env, ctx);
      } catch (fallbackError) {
        return new Response(
          JSON.stringify({ error: fallbackError.message || error.message || "Failed to process Copilot request" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }
  },
};
