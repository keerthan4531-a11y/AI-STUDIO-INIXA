const fetch = require('node-fetch');

async function testBlackbox() {
  try {
    const res = await fetch("https://www.blackbox.ai/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://www.blackbox.ai",
        "Referer": "https://www.blackbox.ai/"
      },
      body: JSON.stringify({
        messages: [{ id: "test", role: "user", content: "hi, who are you?" }],
        model: "blackboxai",
        previewToken: null,
        userId: null,
        codeModelMode: true,
        agentMode: {},
        trendingAgentMode: {},
        isMicMode: false,
        maxTokens: 1024,
        playgroundTemperature: 0.5,
        playgroundTopP: 0.9,
        isChromeExt: false,
        githubToken: null,
        clickedAnswer2: false,
        clickedAnswer3: false,
        clickedForceWebSearch: false,
        visitFromDelta: false,
        mobileClient: false,
        userSelectedModel: "blackboxai"
      })
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Response: ${text.substring(0, 300)}`);
  } catch (e) {
    console.error(e.message);
  }
}
testBlackbox();
