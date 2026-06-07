const fetch = require('node-fetch');

(async () => {
  const resp = await fetch('https://bolt-3rv.pages.dev/vibe-studio/api/llmcall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: 'You are an AI',
      message: 'Hello',
      model: 'auto/claude-opus-4-7',
      provider: { name: 'Inixa' },
      streamOutput: true
    })
  });
  console.log(resp.status);
  console.log(await resp.text());
})();
