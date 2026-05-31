const modelsToTest = [
  'g4f/srv_mkoloq41e34074b6133e:openai-fast',
  'g4f/srv_mkoloq41e34074b6133e:openai',
  'g4f/srv_mp2huzrg06e426ad12f3:deepseek-ai/DeepSeek-V4-Pro',
  'g4f/srv_mkoloq41e34074b6133e:claude-fast',
  'g4f/srv_mkol5tgcd33cc358ddbc:models/gemini-3-flash-preview',
];

async function testAll() {
  for (const model of modelsToTest) {
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
        console.log(`Reply: ${data.reply.trim()}`);
      } else {
        console.log(`Response: ${JSON.stringify(data)}`);
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testAll();
