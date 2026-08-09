const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const WORKER_URL = 'https://ultimate-ai-worker.haruyhari930.workers.dev';
const chromePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function harvestToken(serviceType = 'gpt') {
  let browser = null;
  try {
    console.log(`[LocalHarvester] Harvesting Turnstile token for ${serviceType}...`);
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    let targetUrl = "https://minitoolai.com/gpt-ai/";
    if (serviceType === 'claude') targetUrl = "https://minitoolai.com/Claude/";
    else if (serviceType === 'grok') targetUrl = "https://minitoolai.com/grok/";
    else if (serviceType === 'glm') targetUrl = "https://minitoolai.com/zai-glm/";

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const htmlContent = await page.content();
    const utMatch = htmlContent.match(/var\s+utoken\s*=\s*['"]([^'"]+)['"]/);
    const siMatch = htmlContent.match(/var\s+safety_identifier\s*=\s*['"]([^'"]+)['"]/);
    const extractedUt = utMatch ? utMatch[1] : "";
    const extractedSi = siMatch ? siMatch[1] : "";

    const result = await page.evaluate(async (exUt, exSi) => {
      let getCft = () => window.cft || document.querySelector('[name="cf-turnstile-response"]')?.value || document.querySelector('textarea[name="g-recaptcha-response"]')?.value || "";
      let cft = getCft();
      let ut = window.utoken || exUt;
      let si = window.safety_identifier || exSi;
      let attempts = 0;
      while ((!cft || cft.length < 10 || cft === "error" || cft === "expired") && attempts < 100) {
        await new Promise(r => setTimeout(r, 200));
        cft = getCft();
        ut = window.utoken || ut || exUt;
        si = window.safety_identifier || si || exSi;
        attempts++;
      }
      return { ut, si, cft };
    }, extractedUt, extractedSi);

    const cookies = await page.cookies();
    const sessCookie = cookies.find(c => c.name === 'PHPSESSID')?.value || '';

    await browser.close();
    browser = null;

    if (sessCookie && result.ut && result.cft && result.cft.length > 10) {
      console.log(`[LocalHarvester] Successfully harvested ${serviceType}! PHPSESSID=${sessCookie.substring(0,8)}..., cft_len=${result.cft.length}`);
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
      console.log(`[LocalHarvester] Activated ${serviceType} in Redis:`, actData);
      return true;
    } else {
      console.warn(`[LocalHarvester] Incomplete harvest for ${serviceType}:`, { sessCookie: !!sessCookie, ut: !!result.ut, cftLen: result?.cft?.length });
    }
  } catch (err) {
    console.error(`[LocalHarvester] Error for ${serviceType}:`, err.message);
    if (browser) {
      try { await browser.close(); } catch(_) {}
    }
  }
  return false;
}

async function run() {
  console.log("🚀 Running Local Turnstile Harvester (GPT, Claude, Grok, GLM)...");
  const services = ['grok', 'glm', 'claude', 'gpt'];
  for (const s of services) {
    for (let i = 0; i < 3; i++) {
      console.log(`[Batch ${i + 1}/3] Harvesting ${s}...`);
      await harvestToken(s);
      await new Promise(r => setTimeout(r, 500));
    }
  }
  console.log("Local harvesting complete!");
}

run();
