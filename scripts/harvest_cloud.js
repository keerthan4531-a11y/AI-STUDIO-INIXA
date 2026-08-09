const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const WORKER_URL = 'https://ultimate-ai-worker.haruyhari930.workers.dev';

async function harvestToken(isClaude = false) {
  let browser = null;
  try {
    console.log(`[CloudHarvester] Harvesting Turnstile token for ${isClaude ? 'Claude' : 'GPT'}...`);
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800 });

    const targetUrl = isClaude ? "https://minitoolai.com/Claude/" : "https://minitoolai.com/gpt-ai/";
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 400));
      result = await page.evaluate(() => {
        let html = document.documentElement.outerHTML;
        let utMatch = html.match(/var\s+utoken\s*=\s*['"]([^'"]+)['"]/);
        let siMatch = html.match(/var\s+safety_identifier\s*=\s*['"]([^'"]+)['"]/);
        let ut = window.utoken || (utMatch ? utMatch[1] : "");
        let si = window.safety_identifier || (siMatch ? siMatch[1] : "");
        let cft = window.cft || document.querySelector('[name="cf-turnstile-response"]')?.value || "";
        return { ut, si, cft };
      });
      if (result.ut && result.cft && result.cft.length > 20 && result.cft !== 'error' && result.cft !== 'expired') {
        break;
      }
    }

    const cookies = await page.cookies();
    const sessCookie = cookies.find(c => c.name === 'PHPSESSID')?.value || '';

    await browser.close();
    browser = null;

    if (sessCookie && result.ut && result.cft && result.cft.length > 20) {
      console.log(`[CloudHarvester] Successfully harvested! PHPSESSID=${sessCookie.substring(0,8)}..., cft_len=${result.cft.length}`);
      const activateRes = await fetch(`${WORKER_URL}/minitool/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phpsessid: sessCookie,
          utoken: result.ut,
          safety_identifier: result.si,
          cft: result.cft,
          is_claude: isClaude
        })
      });
      const actData = await activateRes.json();
      console.log(`[CloudHarvester] Activated in Redis:`, actData);
      return true;
    } else {
      console.warn(`[CloudHarvester] Incomplete harvest:`, { sessCookie: !!sessCookie, ut: !!result.ut, cftLen: result?.cft?.length });
    }
  } catch (err) {
    console.error(`[CloudHarvester] Error:`, err.message);
    if (browser) {
      try { await browser.close(); } catch(_) {}
    }
  }
  return false;
}

async function run() {
  console.log("🚀 Running Cloud Turnstile Harvester (Batch Pool)...");
  // Harvest 3 sessions for GPT and 3 sessions for Claude
  for (let i = 0; i < 3; i++) {
    console.log(`[Batch ${i + 1}/3] Harvesting GPT...`);
    await harvestToken(false);
    await new Promise(r => setTimeout(r, 1000));
  }
  for (let i = 0; i < 3; i++) {
    console.log(`[Batch ${i + 1}/3] Harvesting Claude...`);
    await harvestToken(true);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("Batch harvesting finished successfully.");
}

run();
