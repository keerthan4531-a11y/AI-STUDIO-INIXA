const fetch = require('node-fetch');
fetch('https://ai-studio-inixa.vercel.app/api/chat/g4f', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'g4f/grok', messages: [{ role: 'user', content: 'hi' }] })
}).then(r => r.text()).then(console.log).catch(console.error);
