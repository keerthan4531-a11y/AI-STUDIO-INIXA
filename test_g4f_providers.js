const { SocksProxyAgent } = require('socks-proxy-agent');
const nodeFetch = require('node-fetch');

async function testG4FProvider(providerName) {
  try {
    // Just grab 1 proxy to test
    const psRes = await nodeFetch('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=4000&country=all');
    const psText = await psRes.text();
    const proxy = psText.split('\n')[0].trim();
    if (!proxy) throw new Error("No proxy");

    console.log(`Testing provider: ${providerName} via proxy: socks5://${proxy}`);
    const agent = new SocksProxyAgent(`socks5://${proxy}`);
    const fakeIP = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

    const res = await nodeFetch('https://g4f.space/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://g4f.dev',
        'Referer': 'https://g4f.dev/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Forwarded-For': fakeIP
      },
      body: JSON.stringify({
        model: "gpt-4o",
        provider: providerName,
        messages: [{ role: 'user', content: 'Say hello and tell me what AI you are.' }]
      }),
      agent: agent,
      timeout: 15000
    });

    const text = await res.text();
    console.log(`[${providerName}] Status: ${res.status}`);
    console.log(`[${providerName}] Response: ${text.substring(0, 300)}`);
  } catch (e) {
    console.error(`[${providerName}] Error:`, e.message);
  }
}

testG4FProvider("Blackbox");
testG4FProvider("You");
testG4FProvider("Liaobots");
