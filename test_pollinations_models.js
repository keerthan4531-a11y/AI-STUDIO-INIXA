const fetch = require('node-fetch');

async function testPollinations(model, label) {
  try {
    const start = Date.now();
    const res = await fetch("https://text.pollinations.ai/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Say hello in one word" }]
      }),
      timeout: 30000
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    console.log(`[${label}] Status: ${res.status} (${elapsed}ms)`);
    console.log(`   ${text.substring(0, 200)}\n`);
    return res.status === 200;
  } catch (e) {
    console.log(`[${label}] Error: ${e.message}\n`);
    return false;
  }
}

async function run() {
  // Test Pollinations models one-by-one with delays
  const models = [
    ["openai", "GPT (openai)"],
    ["openai-fast", "GPT Fast"],
    ["openai-large", "GPT Large"],
    ["claude-hybrid", "Claude Hybrid"],
    ["deepseek-chat", "DeepSeek Chat"],
    ["deepseek-r1", "DeepSeek R1"],
    ["qwen-coder", "Qwen Coder"],
    ["gemini", "Gemini"],
    ["llama", "Llama"],
    ["mistral", "Mistral"],
    ["searchgpt", "SearchGPT"],
    ["unity", "Unity"],
    ["command-a", "Command A"],
    ["grok", "Grok"],
  ];

  for (const [model, label] of models) {
    await testPollinations(model, label);
    // 2s delay between each
    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
