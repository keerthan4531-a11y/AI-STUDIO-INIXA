const fetch = require('node-fetch');

async function testEndpoint(name, url, body) {
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeout: 15000
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    console.log(`\n✅ [${name}] Status: ${res.status} (${elapsed}ms)`);
    console.log(`   Response: ${text.substring(0, 200)}`);
  } catch (e) {
    console.log(`\n❌ [${name}] Error: ${e.message}`);
  }
}

async function run() {
  const msg = [{ role: "user", content: "Say hello in one word" }];

  // 1. Pollinations Direct (NO KEY, NO PROXY)
  await testEndpoint("Pollinations Direct", "https://text.pollinations.ai/openai/chat/completions", {
    model: "openai", messages: msg
  });

  // 2. Pollinations with specific models
  await testEndpoint("Pollinations GPT-4o-mini", "https://text.pollinations.ai/openai/chat/completions", {
    model: "openai-large", messages: msg
  });

  // 3. Pollinations DeepSeek
  await testEndpoint("Pollinations DeepSeek", "https://text.pollinations.ai/openai/chat/completions", {
    model: "deepseek-chat", messages: msg
  });

  // 4. Pollinations Claude
  await testEndpoint("Pollinations Claude", "https://text.pollinations.ai/openai/chat/completions", {
    model: "claude-hybrid", messages: msg
  });

  // 5. Groq direct (NO KEY)
  await testEndpoint("Groq Direct", "https://api.groq.com/openai/v1/chat/completions", {
    model: "llama-3.3-70b-versatile", messages: msg
  });

  // 6. NVIDIA NIM (NO KEY)
  await testEndpoint("NVIDIA NIM", "https://integrate.api.nvidia.com/v1/chat/completions", {
    model: "meta/llama-3.1-8b-instruct", messages: msg
  });

  // 7. Gemini direct via generativelanguage
  await testEndpoint("Gemini Direct (no key)", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    model: "gemini-2.0-flash", messages: msg
  });

  // 8. DeepInfra (free tier)
  await testEndpoint("DeepInfra", "https://api.deepinfra.com/v1/openai/chat/completions", {
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", messages: msg
  });

  // 9. Together AI free
  await testEndpoint("Together AI", "https://api.together.xyz/v1/chat/completions", {
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", messages: msg
  });

  // 10. Cerebras free
  await testEndpoint("Cerebras", "https://api.cerebras.ai/v1/chat/completions", {
    model: "llama-3.3-70b", messages: msg
  });

  // 11. Puter.js (free, no key needed for this endpoint)
  await testEndpoint("Puter.js Direct", "https://api.puter.com/drivers/call", {
    interface: "puter-chat-completion",
    driver: "ai-chat",
    method: "complete",
    args: { messages: msg, model: "google:google/gemini-3-flash-preview" }
  });
}

run();
