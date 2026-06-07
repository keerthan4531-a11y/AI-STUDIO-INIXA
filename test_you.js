const fetch = require('node-fetch');

async function testYou() {
  try {
    const res = await fetch("https://you.com/api/streamingSearch?q=hi&page=1&count=10&safeSearch=Moderate&mkt=en-US", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/event-stream"
      }
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.substring(0, 300)}`);
  } catch (e) {
    console.error(e.message);
  }
}
testYou();
