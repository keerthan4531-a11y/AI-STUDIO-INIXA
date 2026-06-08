const fetch = require('node-fetch');

async function getChatAnywhereModels() {
  try {
    const res = await fetch("https://api.chatanywhere.tech/v1/models", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (!res.ok) {
      console.log("Failed to fetch models list:", res.status, res.statusText);
      const text = await res.text();
      console.log(text);
      return;
    }
    const data = await res.json();
    console.log(`Successfully fetched ${data.data?.length || 0} models!`);
    
    // Print all available model IDs
    const modelIds = data.data.map(m => m.id);
    console.log("\nAvailable Models:");
    console.log(modelIds.join('\n'));
    
    // Group by provider for easier reading
    const gpt = modelIds.filter(id => id.includes('gpt'));
    const claude = modelIds.filter(id => id.includes('claude'));
    const gemini = modelIds.filter(id => id.includes('gemini'));
    const deepseek = modelIds.filter(id => id.includes('deepseek'));
    const others = modelIds.filter(id => !id.includes('gpt') && !id.includes('claude') && !id.includes('gemini') && !id.includes('deepseek'));
    
    console.log("\n--- Breakdown ---");
    console.log(`GPT Models: ${gpt.length}`);
    console.log(`Claude Models: ${claude.length}`);
    console.log(`Gemini Models: ${gemini.length}`);
    console.log(`DeepSeek Models: ${deepseek.length}`);
    console.log(`Other Models: ${others.length}`);
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

getChatAnywhereModels();
