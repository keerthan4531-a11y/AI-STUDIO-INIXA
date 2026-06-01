const fs = require('fs');

async function testAll() {
  const content = fs.readFileSync('./src/api/aiEngine.ts', 'utf-8');
  const matches = [...content.matchAll(/modelStr:\s*'(g4f\/[^']+)'/g)];
  const models = matches.map(m => m[1]);
  
  console.log(`Found ${models.length} G4F models. Testing...`);

  for (const model of models) {
    console.log(`\nTesting model: ${model}`);
    try {
      const res = await fetch('http://localhost:3000/api/chat/g4f', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say "hello world" in short.' }],
          model: model,
          stream: false
        })
      });
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      if (data.reply) {
        let snippet = data.reply.trim().substring(0, 100);
        snippet = snippet.replace(/\n/g, '\\n');
        console.log(`Reply: ${snippet}`);
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        let snippet = data.choices[0].message.content.trim().substring(0, 100);
        snippet = snippet.replace(/\n/g, '\\n');
        console.log(`Reply: ${snippet}`);
      } else {
        console.log(`Response: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testAll();
