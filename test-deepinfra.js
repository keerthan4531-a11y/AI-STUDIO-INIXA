async function testDeepInfra() {
  const url = 'https://api.deepinfra.com/v1/openai/chat/completions';
  
  // Fake browser headers
  const headers = {
    'Accept': 'text/event-stream',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': 'https://deepinfra.com',
    'Referer': 'https://deepinfra.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Deepinfra-Source': 'web-chat',
    // Try sending an empty captcha or typical bypass
    'X-Captcha-Token': ''
  };

  const body = JSON.stringify({
    model: 'meta-llama/Meta-Llama-3-70B-Instruct', // standard model
    messages: [{ role: 'user', content: 'hello' }],
    stream: false
  });

  try {
    console.log("Sending request with browser headers...");
    const res = await fetch(url, { method: 'POST', headers, body });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}

testDeepInfra();
