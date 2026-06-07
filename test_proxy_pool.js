const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const nodeFetch = require('node-fetch');

const targetEndpoint = 'https://g4f.space/v1/chat/completions';
const modelToTest = 'srv_mkoloq41e34074b6133e:openai-fast'; // Pollinations backend, or gemini, etc.

async function runTest() {
  console.log('[Test] Fetching proxies from geonode...');
  let proxyPool = [];
  try {
    const res = await nodeFetch('https://proxylist.geonode.com/api/proxy-list?limit=100&page=1&sort_by=lastChecked&sort_type=desc&protocols=http%2Chttps');
    const data = await res.json();
    if (data && data.data) {
      proxyPool = data.data
        .filter((p) => p.speed < 2000)
        .map((p) => `http://${p.ip}:${p.port}`);
    }
  } catch (e) {
    console.error('Failed to get geonode proxies', e);
  }

  if (proxyPool.length === 0) {
    console.log('Using fallback proxies...');
    try {
      const res = await nodeFetch('https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      proxyPool = lines.slice(0, 50).map(p => `http://${p.trim()}`);
    } catch(e) {}
  }

  if (proxyPool.length === 0) {
    console.log('No proxies found.');
    return;
  }

  console.log(`Loaded ${proxyPool.length} proxies. Testing a few...`);

  const maxAttempts = 3;
  for (let i = 0; i < maxAttempts; i++) {
    const proxyUrl = proxyPool[i];
    console.log(`\nAttempt ${i+1}: Using proxy ${proxyUrl}`);
    const agent = proxyUrl.startsWith('https') ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
    
    try {
      const startTime = Date.now();
      const fakeIP = `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
      
      const g4fRes = await nodeFetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://g4f.dev',
          'Referer': 'https://g4f.dev/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'X-Forwarded-For': fakeIP
        },
        body: JSON.stringify({
          model: modelToTest,
          messages: [{ role: 'user', content: 'Say Hi briefly' }]
        }),
        agent: agent,
        timeout: 15000
      });

      const timeMs = Date.now() - startTime;
      if (g4fRes.ok) {
        const json = await g4fRes.json();
        const content = json.choices?.[0]?.message?.content || JSON.stringify(json);
        console.log(`✅ SUCCESS! (${g4fRes.status}) [${timeMs}ms]`);
        console.log(`Response: ${content}`);
        break; 
      } else {
        const errText = await g4fRes.text();
        console.log(`❌ FAILED (${g4fRes.status}) [${timeMs}ms]`);
        console.log(`Error body: ${errText.substring(0, 150)}`);
      }
    } catch (error) {
      console.log(`❌ CRASH: ${error.message}`);
    }
  }
}

runTest();
