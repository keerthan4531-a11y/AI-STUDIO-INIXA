const ENDPOINT = "https://fancy-hall-310d.bearinthenorth29.workers.dev/v1/chat/completions";

const modelsToTest = [
  "ddg/gpt-4o-mini",
  "qwen/qwen3",
  "perplexity/turbo",
  "puter-gpt4o", // without prefix as it maps directly
  "openai-fast" // pollinations
];

async function testModel(model) {
  try {
    console.log(`\n⏳ Testing model: ${model}...`);
    const start = Date.now();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Say 'Hello' and nothing else." }],
        stream: false
      })
    });

    const time = Date.now() - start;
    const chain = res.headers.get("x-fallback-chain") || "direct";
    
    if (!res.ok) {
      const text = await res.text();
      console.log(`❌ ${model} failed (${res.status}). Chain: ${chain}\nResponse: ${text.substring(0, 100)}`);
      return false;
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || data.reply;
    console.log(`✅ ${model} SUCCESS in ${time}ms! Chain: ${chain}\nReply: "${reply}"`);
    return true;
  } catch (e) {
    console.log(`❌ ${model} error: ${e.message}`);
    return false;
  }
}

async function runTests() {
  console.log("Starting Gateway Tests with Header Inspection...");
  let successCount = 0;
  for (const model of modelsToTest) {
    const success = await testModel(model);
    if (success) successCount++;
  }
  console.log(`\n🎉 Tests completed: ${successCount}/${modelsToTest.length} working.`);
}

runTests();
