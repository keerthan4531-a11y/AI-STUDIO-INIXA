const fetch = require('node-fetch');

(async () => {
  try {
    console.log('Fetching github-template for xKevIsDev/vanilla-vite-template...');
    const startTime = Date.now();
    const resp = await fetch('http://127.0.0.1:3000/vibe-studio/api/github-template?repo=xKevIsDev/vanilla-vite-template');
    console.log('Status:', resp.status);
    console.log('Time taken (ms):', Date.now() - startTime);
    const text = await resp.text();
    console.log('Result length:', text.length);
    console.log('Preview:', text.substring(0, 200));
  } catch (err) {
    console.error('Error:', err);
  }
})();
