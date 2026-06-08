const fetch = require('node-fetch');
fetch('http://localhost:3000/api/chat/g4f', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer inixa_secret_key_123'
  },
  body: JSON.stringify({ model: 'g4f/grok', messages: [{ role: 'user', content: 'hi' }] })
}).then(r => r.text()).then(console.log).catch(console.error);
