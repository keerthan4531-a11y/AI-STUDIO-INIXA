const test = async () => {
  try {
    const res = await fetch('https://raw.githubusercontent.com/alistaitsacle/free-llm-api-keys/main/README.md');
    const text = await res.text();
    const regex = /\|\s*`(sk-[a-zA-Z0-9_-]+)`\s*\|\s*([a-zA-Z0-9._\/-]+)\s*\|/g;
    let keys = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      keys.push({key: match[1], model: match[2]});
    }
    console.log('Found keys:', keys.length);
    if (keys.length === 0) return;
    const gptKeys = keys.filter(k => k.model.includes('gpt-5.5'));
    console.log('GPT keys:', gptKeys.length);
    if (gptKeys.length > 0) {
      const req = await fetch('https://aiapiv2.pekpik.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + gptKeys[0].key },
        body: JSON.stringify({ model: gptKeys[0].model, messages: [{ role: 'user', content: 'hi' }] })
      });
      console.log('Status:', req.status, await req.text());
    }
  } catch (e) { console.error(e); }
};
test();
