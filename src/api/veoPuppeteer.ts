import puppeteer from 'puppeteer-core';
import type { Browser, Page } from 'puppeteer-core';

const CHROME_PATH_WIN = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_PATH_MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VEO_URL = 'https://veoaifree.com/veo-video-generator/';

function getChromePath(): string {
  if (process.platform === 'win32') return CHROME_PATH_WIN;
  return CHROME_PATH_MAC;
}

interface BrowserSession {
  browser: Browser;
  page: Page;
  createdAt: number;
}

let session: BrowserSession | null = null;
const SESSION_TTL = 10 * 60 * 1000;

async function createSession(): Promise<BrowserSession> {
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=en-US,en',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Set realistic user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  await page.goto(VEO_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Verify page loaded correctly
  const hasAjaxObject = await page.evaluate(() => {
    const win = window as any;
    return !!(win.ajax_object && win.ajax_object.nonce);
  });
  
  if (!hasAjaxObject) {
    throw new Error('Page loaded but ajax_object not found - possible bot detection');
  }

  console.log('[VEO Browser] Session created');
  return { browser, page, createdAt: Date.now() };
}

async function getSession(force = false): Promise<BrowserSession> {
  if (session && !force) {
    if (Date.now() - session.createdAt < SESSION_TTL) return session;
    console.log('[VEO Browser] Session expired');
    await session.browser.close().catch(() => {});
  }
  if (session) await session.browser.close().catch(() => {});
  session = await createSession();
  return session;
}

export async function generateVideo(prompt: string, aspectRatio: string, totalVariations: number = 1): Promise<string> {
  const { page } = await getSession(true);

  // Set up response interceptor
  let taskId: string | null = null;
  const responseHandler = async (resp: any) => {
    try {
      const url = resp.url();
      if (!url.includes('admin-ajax.php')) return;
      const req = resp.request();
      if (req.method() !== 'POST') return;
      const postData = req.postData() || '';
      if (!postData.includes('full-video-generate')) return;
      const text = await resp.text();
      taskId = text.trim();
    } catch (e) { /* ignore */ }
  };

  page.on('response', responseHandler);

  // Fill form
  await page.evaluate(({ p, ar, tv }) => {
    const w = window as any;
    const ta = document.querySelector('#fn__include_textarea') as HTMLTextAreaElement;
    if (ta) {
      const setter = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(ta, p);
      else ta.value = p;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const rs = document.querySelector('#aspect-ration') as HTMLSelectElement;
    if (rs) rs.value = ar;
    const vs = document.querySelector('#total-variations') as HTMLSelectElement;
    if (vs) vs.value = String(tv);
  }, { p: prompt, ar: aspectRatio, tv: totalVariations });

  // Click generate
  await page.click('#generate_it').catch(() => {});

  // Wait for response
  for (let i = 0; i < 40; i++) {
    if (taskId) break;
    await new Promise(r => setTimeout(r, 500));
  }

  page.off('response', responseHandler);

  if (!taskId || isNaN(parseInt(taskId)) || taskId === '0' || taskId === '-1') {
    throw new Error(`Generation failed: ${taskId}`);
  }

  console.log(`[VEO Browser] Task: ${taskId}`);
  return taskId;
}

export async function pollVideo(taskId: string): Promise<string | null> {
  const { page } = await getSession();

  let result: string | null = null;
  const responseHandler = async (resp: any) => {
    try {
      const url = resp.url();
      if (!url.includes('admin-ajax.php')) return;
      const req = resp.request();
      if (req.method() !== 'POST') return;
      const postData = req.postData() || '';
      if (!postData.includes('final-video-results') || !postData.includes(taskId)) return;
      const text = await resp.text();
      result = text.trim() || null;
    } catch (e) { /* ignore */ }
  };

  page.on('response', responseHandler);

  // Trigger poll via browser
  await page.evaluate((tid) => {
    const w = window as any;
    if (w.ajax_object && w.jQuery) {
      w.jQuery.ajax({
        url: w.ajax_object.ajax_url,
        type: 'POST',
        data: {
          action: 'veo_video_generator',
          nonce: w.ajax_object.nonce,
          sceneData: tid,
          actionType: 'final-video-results',
        },
      });
    }
  }, taskId);

  // Wait for response
  for (let i = 0; i < 40; i++) {
    if (result !== null) break;
    await new Promise(r => setTimeout(r, 500));
  }

  page.off('response', responseHandler);
  return result;
}

export async function cleanup() {
  if (session) {
    await session.browser.close().catch(() => {});
    session = null;
  }
}

process.on('exit', () => { cleanup().catch(() => {}); });
process.on('SIGINT', async () => { await cleanup(); process.exit(); });
process.on('SIGTERM', async () => { await cleanup(); process.exit(); });
