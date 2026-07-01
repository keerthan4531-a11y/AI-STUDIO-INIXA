const fetch = require('node-fetch');

(async () => {
  try {
    const resp = await fetch('http://127.0.0.1:3000/vibe-studio/api/llmcall', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'login page',
        model: 'deepinfra/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B',
        provider: { name: 'Inixa' },
        system: 'You are an AI'
      })
    });
    console.log('Status:', resp.status);
    console.log('Headers:', Object.fromEntries(resp.headers.entries()));
    console.log('Body:', await resp.text());
  } catch (err) {
    console.error('Fetch error:', err);
  }
})();
