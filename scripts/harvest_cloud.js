const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const WORKER_URL = 'https://ultimate-ai-worker.haruyhari930.workers.dev';

async function harvestToken(serviceType = 'gpt') {
  let browser = null;
  try {
    console.log(`[CloudHarvester] Harvesting Turnstile token for ${serviceType}...`);
    const chromePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    browser = await puppeteer.launch({
      executablePath: chromePath,
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

    let targetUrl = "https://minitoolai.com/gpt-ai/";
    if (serviceType === 'claude') targetUrl = "https://minitoolai.com/Claude/";
    else if (serviceType === 'grok') targetUrl = "https://minitoolai.com/grok/";
    else if (serviceType === 'glm') targetUrl = "https://minitoolai.com/zai-glm/";

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
      console.log(`[CloudHarvester] Successfully harvested ${serviceType}! PHPSESSID=${sessCookie.substring(0,8)}..., cft_len=${result.cft.length}`);
      const activateRes = await fetch(`${WORKER_URL}/minitool/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phpsessid: sessCookie,
          utoken: result.ut,
          safety_identifier: result.si,
          cft: result.cft,
          service_type: serviceType,
          is_claude: serviceType === 'claude'
        })
      });
      const actData = await activateRes.json();
      console.log(`[CloudHarvester] Activated ${serviceType} in Redis:`, actData);
      return true;
    } else {
      console.warn(`[CloudHarvester] Incomplete harvest for ${serviceType}:`, { sessCookie: !!sessCookie, ut: !!result.ut, cftLen: result?.cft?.length });
    }
  } catch (err) {
    console.error(`[CloudHarvester] Error for ${serviceType}:`, err.message);
    if (browser) {
      try { await browser.close(); } catch(_) {}
    }
  }
  return false;
}

async function run() {
  console.log("🚀 Running Cloud Turnstile Harvester (GPT, Claude, Grok, GLM Pools)...");
  const services = ['gpt', 'claude', 'grok', 'glm'];
  for (const s of services) {
    for (let i = 0; i < 4; i++) {
      console.log(`[Batch ${i + 1}/4] Harvesting ${s}...`);
      await harvestToken(s);
      await new Promise(r => setTimeout(r, 400));
    }
  }
  console.log("Enterprise batch harvesting finished successfully.");
}

run();
