import { chromium, Browser } from 'playwright';

let sharedBrowser: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }
  if (browserInitPromise) {
    return browserInitPromise;
  }

  browserInitPromise = (async () => {
    try {
      const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
        args: [
          '--window-position=-2400,-2400',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--disable-dev-shm-usage'
        ]
      });
      sharedBrowser = browser;
      return browser;
    } finally {
      browserInitPromise = null;
    }
  })();

  return browserInitPromise;
}

export interface ArenaBattleResult {
  assistantA: string;
  assistantB: string;
  fullReply: string;
}

/**
 * Execute an anonymous frontier model battle on LMSYS arena.ai
 */
export async function runArenaBattle(
  prompt: string,
  onChunk?: (text: string) => void
): Promise<ArenaBattleResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let assistantA = '';
  let assistantB = '';
  let aFinished = false;
  let bFinished = false;
  let streamClosed = false;
  let bStreamStarted = false;

  const headerA = '### ⚔️ LMSYS Chatbot Arena — Frontier Battle\n\n#### 🤖 Assistant A (Frontier Model)\n';
  const headerB = '\n\n---\n\n#### 🤖 Assistant B (Frontier Model)\n';

  if (onChunk) {
    onChunk(headerA);
  }

  // Intercept the create-evaluation stream
  page.on('response', async res => {
    if (res.url().includes('/nextjs-api/stream/create-evaluation')) {
      try {
        const text = await res.text();
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('a0:')) {
            try {
              const chunk = JSON.parse(line.slice(3));
              assistantA += chunk;
              if (onChunk && !aFinished) {
                onChunk(chunk);
              }
            } catch {}
          } else if (line.startsWith('b0:')) {
            try {
              const chunk = JSON.parse(line.slice(3));
              assistantB += chunk;
              if (onChunk && bStreamStarted) {
                onChunk(chunk);
              }
            } catch {}
          } else if (line.startsWith('ad:')) {
            aFinished = true;
            if (onChunk && !bStreamStarted) {
              bStreamStarted = true;
              onChunk(headerB + assistantB);
            }
          } else if (line.startsWith('bd:')) {
            bFinished = true;
          }
        }

        streamClosed = true;
      } catch (err) {
        console.error('[ArenaService] Stream error:', err);
      }
    }
  });

  try {
    await page.goto('https://arena.ai/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);

    // Dismiss banner if present
    const banner = page.locator('button[aria-label="Dismiss banner"]').first();
    if (await banner.isVisible()) {
      await banner.click().catch(() => {});
    }

    // Type prompt
    const textarea = page.locator('textarea:visible').first();
    await textarea.click();
    await textarea.fill(prompt);
    await page.waitForTimeout(300);
    await textarea.press('Enter');

    // Accept terms if displayed
    await page.waitForTimeout(1000);
    const agree = page.locator('button:has-text("Agree"), button:has-text("I agree"), button:has-text("Accept")').first();
    if (await agree.isVisible()) {
      await agree.click().catch(() => {});
    }

    // Wait for stream to complete
    const start = Date.now();
    while (!streamClosed && Date.now() - start < 35000) {
      await page.waitForTimeout(500);
    }

    // If B stream was never flushed, flush now
    if (onChunk && !bStreamStarted && assistantB) {
      bStreamStarted = true;
      onChunk(headerB + assistantB);
    }

    const fullReply = `${headerA}${assistantA.trim()}${headerB}${assistantB.trim()}`;

    return {
      assistantA: assistantA.trim(),
      assistantB: assistantB.trim(),
      fullReply
    };
  } finally {
    await context.close().catch(() => {});
  }
}
