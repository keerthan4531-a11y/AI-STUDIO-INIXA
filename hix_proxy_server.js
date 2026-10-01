/**
 * HIX.AI Puppeteer Stealth Proxy Server
 * 
 * A local HTTP server that proxies chat requests through HIX.AI
 * using puppeteer-extra with stealth plugin.
 * 
 * Features:
 * - Fresh device-id per request
 * - Optional SOCKS5/HTTP proxy rotation for IP rotation
 * - OpenAI-compatible API format
 * - Real Claude/GPT responses from HIX.AI
 * 
 * Usage:
 *   node hix_proxy_server.js [--port 3456] [--proxy socks5://user:pass@host:port]
 * 
 * API:
 *   POST /v1/chat/completions
 *   { model: "claude-opus-5", messages: [...], stream: true/false }
 */

const http = require('http');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const crypto = require('crypto');

puppeteer.use(StealthPlugin());

// ─── Config ───
const PORT = parseInt(process.argv.find((a, i) => process.argv[i-1] === '--port') || '3456');
const PROXY = process.argv.find((a, i) => process.argv[i-1] === '--proxy') || process.env.HIX_PROXY || '';
const PROXY_LIST_STR = process.env.HIX_PROXY_LIST || ''; // comma-separated proxies for rotation

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// HIX model mapping
const MODELS = {
  'claude-opus-5': { botId: 85502, name: 'Claude Opus 5' },
  'claude-opus-4.8': { botId: 85496, name: 'Claude Opus 4.8' },
  'claude-opus-4.7': { botId: 85491, name: 'Claude Opus 4.7' },
  'claude-sonnet-4.6': { botId: 85486, name: 'Claude Sonnet 4.6' },
  'claude-opus-4.6': { botId: 85487, name: 'Claude Opus 4.6' },
  'claude-opus-4.5': { botId: 85480, name: 'Claude Opus 4.5' },
  'claude-sonnet-4.5': { botId: 85476, name: 'Claude Sonnet 4.5' },
  'claude-haiku-4.5': { botId: 85477, name: 'Claude Haiku 4.5' },
  'gpt-5.5': { botId: 85492, name: 'GPT-5.5' },
  'gpt-5.6-luna': { botId: 85499, name: 'GPT-5.6 Luna' },
  'gpt-4o-mini': { botId: 86, name: 'GPT-4o mini' },
  'gemini-3.5-flash': { botId: 85495, name: 'Gemini 3.5 Flash' },
  'deepseek-v4-pro': { botId: 85494, name: 'DeepSeek-V4-Pro' },
};

// Proxy rotation
const proxyList = PROXY_LIST_STR ? PROXY_LIST_STR.split(',').map(p => p.trim()) : (PROXY ? [PROXY] : []);
let proxyIndex = 0;

function getNextProxy() {
  if (proxyList.length === 0) return null;
  const proxy = proxyList[proxyIndex % proxyList.length];
  proxyIndex++;
  return proxy;
}

function resolveModel(modelStr) {
  const clean = (modelStr || '').replace('hix/', '').replace('hix-', '').toLowerCase().trim();
  if (MODELS[clean]) return MODELS[clean];
  for (const [key, conf] of Object.entries(MODELS)) {
    if (clean.includes(key) || key.includes(clean)) return conf;
  }
  return MODELS['claude-opus-5'];
}

// ─── Core: Get response from HIX.AI ───
async function getHixResponse(messages, modelConfig) {
  const deviceId = crypto.randomBytes(16).toString('hex');
  const proxy = getNextProxy();
  
  console.log(`[HIX] Model: ${modelConfig.name}, Device: ${deviceId.substring(0, 8)}..., Proxy: ${proxy || 'direct'}`);
  
  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
  ];
  
  if (proxy) {
    launchArgs.push(`--proxy-server=${proxy}`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: launchArgs,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Set fresh device-id
    await page.setCookie({
      name: 'device-id', value: deviceId, domain: 'hix.ai', path: '/'
    });

    // Navigate to HIX
    const modelUrl = MODELS[Object.keys(MODELS).find(k => MODELS[k].botId === modelConfig.botId)]
      ? '/c/claude-opus-5' : '/c/claude-opus-5';
    
    try {
      await page.goto(`https://hix.ai${modelUrl}`, { waitUntil: 'networkidle2', timeout: 40000 });
    } catch(e) { /* timeout ok */ }
    
    await sleep(5000);

    // Check for CF challenge
    const title = await page.title();
    if (title.includes('Attention') || title.includes('moment')) {
      console.log('[HIX] Cloudflare challenge, waiting...');
      await sleep(12000);
    }

    // Build prompt from messages
    let fullPrompt = '';
    if (messages.length === 1) {
      fullPrompt = typeof messages[0].content === 'string' ? messages[0].content : JSON.stringify(messages[0].content);
    } else {
      fullPrompt = messages.map(m => {
        const role = m.role === 'assistant' ? 'Assistant' : m.role === 'system' ? 'System' : 'User';
        const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return `${role}: ${text}`;
      }).join('\n\n');
    }

    // Execute chat flow inside the page
    const result = await page.evaluate(async (botId, prompt) => {
      // Step 1: Create chat
      const createRes = await fetch('/api/trpc/hixChat.createChat?batch=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "0": {
            "json": { "title": prompt.substring(0, 30), "botId": botId, "agentType": null, "extraData": null },
            "meta": { "values": { "agentType": ["undefined"], "extraData": ["undefined"] } }
          }
        })
      });

      if (createRes.status !== 200) {
        const err = await createRes.text();
        return { error: `createChat ${createRes.status}`, detail: err.substring(0, 300) };
      }

      const createData = await createRes.json();
      const chatId = createData[0]?.result?.data?.json?.id;
      if (!chatId) return { error: 'No chatId', raw: JSON.stringify(createData).substring(0, 200) };

      // Step 2: Send message
      const chatRes = await fetch('/api/hix/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ chatId, question: prompt, search: false })
      });

      if (!chatRes.ok) {
        return { error: `chat ${chatRes.status}`, chatId };
      }

      const raw = await chatRes.text();
      let content = '';
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]') continue;
        try { const p = JSON.parse(d); if (p.content) content += p.content; } catch(e) {}
      }

      return { chatId, content, rawLength: raw.length };
    }, modelConfig.botId, fullPrompt);

    return result;
  } finally {
    await browser.close();
  }
}

// ─── HTTP Server ───
const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Models endpoint
  if (req.url === '/v1/models' && req.method === 'GET') {
    const modelList = Object.entries(MODELS).map(([id, conf]) => ({
      id: `hix/${id}`, object: 'model', created: Date.now(), owned_by: 'hix.ai',
      name: conf.name
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: modelList }));
    return;
  }

  // Chat completions
  if (req.url === '/v1/chat/completions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const modelConfig = resolveModel(data.model || 'claude-opus-5');
        const messages = data.messages || [{ role: 'user', content: 'hello' }];
        const isStream = data.stream !== false;

        console.log(`[REQ] ${modelConfig.name} - "${messages[messages.length-1]?.content?.substring(0, 50)}..."`);

        const result = await getHixResponse(messages, modelConfig);

        if (result.error) {
          console.log(`[ERR] ${result.error}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: result.error, detail: result.detail } }));
          return;
        }

        const content = result.content || '';
        console.log(`[OK] ${content.substring(0, 80)}...`);

        const completionId = `chatcmpl-hix-${Date.now()}`;
        const created = Math.floor(Date.now() / 1000);

        if (isStream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Provider': `hix.ai/${modelConfig.name}`
          });

          // Send content in chunks for streaming feel
          const chunkSize = 10;
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.substring(i, i + chunkSize);
            const sseData = {
              id: completionId, object: 'chat.completion.chunk', created,
              model: modelConfig.name,
              choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
            };
            res.write(`data: ${JSON.stringify(sseData)}\n\n`);
          }

          // Final chunk
          const finalData = {
            id: completionId, object: 'chat.completion.chunk', created,
            model: modelConfig.name,
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
          };
          res.write(`data: ${JSON.stringify(finalData)}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json', 'X-Provider': `hix.ai/${modelConfig.name}` });
          res.end(JSON.stringify({
            id: completionId, object: 'chat.completion', created,
            model: modelConfig.name,
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 0, completion_tokens: content.length, total_tokens: content.length }
          }));
        }
      } catch (err) {
        console.error('[ERR]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', proxies: proxyList.length, models: Object.keys(MODELS).length }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  HIX.AI Puppeteer Stealth Proxy Server               ║
║                                                      ║
║  Port: ${PORT}                                         ║
║  Proxies: ${proxyList.length || 'none (direct)'}                                   ║
║  Models: ${Object.keys(MODELS).length}                                          ║
║                                                      ║
║  API: http://localhost:${PORT}/v1/chat/completions      ║
║  Models: http://localhost:${PORT}/v1/models              ║
║  Health: http://localhost:${PORT}/health                  ║
║                                                      ║
║  Usage:                                              ║
║  curl http://localhost:${PORT}/v1/chat/completions \\     ║
║    -H "Content-Type: application/json" \\              ║
║    -d '{"model":"claude-opus-5",                     ║
║         "messages":[{"role":"user",                  ║
║                      "content":"hello"}]}'           ║
╚══════════════════════════════════════════════════════╝
  `);
  
  if (proxyList.length > 0) {
    console.log('🔄 Proxy rotation enabled:');
    proxyList.forEach((p, i) => console.log(`  ${i+1}. ${p}`));
  } else {
    console.log('⚠️  No proxies configured. Set HIX_PROXY_LIST env var for IP rotation.');
    console.log('   Example: HIX_PROXY_LIST="socks5://proxy1:1080,socks5://proxy2:1080"');
    console.log('   Or: node hix_proxy_server.js --proxy socks5://user:pass@host:port\n');
  }
});
