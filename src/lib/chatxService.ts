/**
 * ChatX.ai Automated Browser Service
 * 
 * Interacts directly with ChatX via stealth background Chromium.
 * Automatically solves Turnstile and streams real-time AI responses.
 */

let sharedBrowser: any = null;
let browserPromise: Promise<any> | null = null;

async function getBrowser() {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }
  if (browserPromise) {
    return browserPromise;
  }

  browserPromise = (async () => {
    try {
      const req = typeof eval !== 'undefined' ? eval('require') : null;
      if (!req) return null;
      const { chromium } = req('playwright');

      try {
        sharedBrowser = await chromium.launch({
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
      } catch {
        sharedBrowser = await chromium.launch({
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage'
          ]
        });
      }
      return sharedBrowser;
    } catch (e: any) {
      console.warn('[ChatX Service] Failed to launch Playwright browser:', e.message);
      return null;
    } finally {
      browserPromise = null;
    }
  })();

  return browserPromise;
}

export const CHATX_MODEL_ALIASES: Record<string, string> = {
  // Grok
  'grok': 'grok_fast',
  'grok_fast': 'grok_fast',
  'grok_main': 'grok_main',
  'grok-4.3': 'grok_fast',
  'grok-4.6': 'grok_main',
  'grok-fast': 'grok_fast',
  'grok-main': 'grok_main',

  // DeepSeek
  'deepseek': 'deepseek_flash',
  'deepseek_flash': 'deepseek_flash',
  'deepseek-flash': 'deepseek_flash',
  'deepseek-v4': 'deepseek_flash',

  // Claude
  'claude': 'claude_sonnet',
  'claude_sonnet': 'claude_sonnet',
  'claude-sonnet': 'claude_sonnet',
  'claude_opus': 'claude_opus',
  'claude-opus': 'claude_opus',
  'claude_haiku': 'claude_haiku',
  'claude-haiku': 'claude_haiku',
  'claude_fable': 'claude_fable',

  // Gemini
  'gemini': 'gemini',
  'gemini_pro': 'gemini_pro',
  'gemini-pro': 'gemini_pro',
  'gemini-3.8': 'gemini_pro',
  'gemini-3.5': 'gemini',

  // GPT & OpenAI
  'gpt': 'gpt4',
  'gpt3': 'gpt3',
  'gpt-luna': 'gpt3',
  'gpt4': 'gpt4',
  'gpt-5.4': 'gpt4',
  'gpt4_5': 'gpt4_5',
  'gpt-4.1': 'gpt4_5',
  'gpt5_5': 'gpt5_5',
  'gpt-sol': 'gpt5_5',
  'gpt-6.1': 'gpt5_5',
  'gpt6_astra': 'gpt6_astra',
  'gpt-astra': 'gpt6_astra',
};

/**
 * Execute ChatX query via background browser and stream response in real-time.
 * Strictly NO fallback: any model restriction or failure immediately throws an error.
 */
export async function executeChatXStream(
  prompt: string,
  modelName: string,
  onDelta: (chunk: string) => void
): Promise<string> {
  const targetModel = CHATX_MODEL_ALIASES[modelName.toLowerCase()] || modelName;
  const browser = await getBrowser();

  if (!browser) {
    throw new Error('Local browser automation is not available in this environment');
  }

  const page = await browser.newPage();
  let accumulatedText = '';
  let streamEnded = false;
  let networkError: string | null = null;

  const streamHandler = async (res: any) => {
    const url = res.url();
    if (url.includes('chats_stream') || url.includes('sendchat')) {
      if (res.status() >= 400) {
        try {
          const body = await res.text();
          networkError = `ChatX server returned HTTP ${res.status()}: ${body.slice(0, 300)}`;
        } catch {
          networkError = `ChatX server returned HTTP ${res.status()}`;
        }
        return;
      }
    }

    if (url.includes('chats_stream')) {
      try {
        const body = await res.text();
        const lines = body.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              streamEnded = true;
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.delta || parsed.content || parsed.text || '';
              if (chunk) {
                accumulatedText += chunk;
                onDelta(chunk);
              }
            } catch {
              // Raw text chunk
              if (data && !data.startsWith('{')) {
                accumulatedText += data;
                onDelta(data);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ChatX Service] Stream parsing notice:', err);
      }
    }
  };

  page.on('response', streamHandler);

  try {
    // 1. Navigate to ChatX (Grok portal hosts all model switches)
    await page.goto('https://chatx.ai/grok', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(1500);

    // 2. Switch to requested target model in the UI & check immediately for restrictions
    const switchAlert = await page.evaluate((m: string) => {
      // Clear previous alerts
      document.querySelectorAll('.alert').forEach(a => a.remove());

      const select = document.querySelector('#primary_model_select, #current_model') as HTMLSelectElement | null;
      if (select) {
        select.value = m;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const modelBtn = document.querySelector(`[data-model="${m}"]`) as HTMLElement | null;
      if (modelBtn) {
        modelBtn.click();
      }

      // Check if an immediate alert or restriction message appeared
      const alert = document.querySelector('.alert-danger, .alert-warning, .toast-error, [role="alert"]');
      if (alert && (alert as HTMLElement).offsetParent !== null) {
        const text = (alert as HTMLElement).innerText.trim().replace(/^×\s*/, '').trim();
        if (text) return text;
      }
      return null;
    }, targetModel);

    if (switchAlert) {
      throw new Error(`Model restriction: ${switchAlert}`);
    }

    await page.waitForTimeout(600);

    // Re-check after 600ms for delayed alerts
    const delayedAlert = await page.evaluate(() => {
      const alert = document.querySelector('.alert-danger, .alert-warning, .toast-error, [role="alert"]');
      if (alert && (alert as HTMLElement).offsetParent !== null) {
        const text = (alert as HTMLElement).innerText.trim().replace(/^×\s*/, '').trim();
        if (text) return text;
      }
      return null;
    });

    if (delayedAlert) {
      throw new Error(`Model restriction: ${delayedAlert}`);
    }

    // 3. Fill prompt into active textarea and trigger event listeners
    const textarea = page.locator('textarea:visible, #prompt').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill(prompt);
    await page.evaluate(() => {
      const p = document.getElementById('prompt') as HTMLTextAreaElement | null;
      if (p) {
        p.dispatchEvent(new Event('input', { bubbles: true }));
        p.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);

    // 4. Submit prompt via #sendchat_btn
    const sendBtn = page.locator('#sendchat_btn');
    if (await sendBtn.isVisible() && await sendBtn.isEnabled()) {
      await sendBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = document.getElementById('sendchat_btn') as HTMLButtonElement | null;
        if (btn) {
          btn.disabled = false;
          btn.click();
        }
      });
    }

    // 5. Wait for streaming response to finish with real-time DOM polling
    const startTime = Date.now();
    const TIMEOUT_MS = 45000;
    let lastReportedLen = 0;
    let hasStarted = false;
    let idleCycles = 0;

    while (Date.now() - startTime < TIMEOUT_MS) {
      if (page.isClosed()) break;
      if (networkError) {
        throw new Error(networkError);
      }

      // Check if a runtime alert/error popped up
      const pageStatus = await page.evaluate(() => {
        const alert = document.querySelector('.alert-danger, .alert-warning, .toast-error, [role="alert"]');
        if (alert && (alert as HTMLElement).offsetParent !== null) {
          const text = (alert as HTMLElement).innerText.trim().replace(/^×\s*/, '').trim();
          if (text) return { error: text };
        }

        const writer = document.querySelector('.system_write');
        const stopBtn = document.querySelector('#stopprocess');
        const isGenerating = stopBtn && window.getComputedStyle(stopBtn).display !== 'none';
        return {
          text: writer ? (writer as HTMLElement).innerText.trim() : '',
          isGenerating
        };
      }).catch(() => null);

      if (pageStatus?.error) {
        throw new Error(`Model error: ${pageStatus.error}`);
      }

      if (pageStatus?.text) {
        hasStarted = true;
        const cleanCurrentText = pageStatus.text.replace(/end$/, '');
        if (cleanCurrentText.length > lastReportedLen) {
          const delta = cleanCurrentText.slice(lastReportedLen);
          lastReportedLen = cleanCurrentText.length;
          accumulatedText = cleanCurrentText;
          idleCycles = 0;
          if (delta.trim() !== 'end' && delta.length > 0) {
            onDelta(delta);
          }
        } else {
          idleCycles++;
          if ((!pageStatus.isGenerating && idleCycles >= 4) || idleCycles >= 15) {
            break;
          }
        }
      }

      if (streamEnded && accumulatedText.trim().length > 0) {
        break;
      }

      await page.waitForTimeout(200).catch(() => {});
    }

    if (networkError) {
      throw new Error(networkError);
    }

    if (!accumulatedText.trim()) {
      throw new Error(`ChatX model ${targetModel} did not generate any response.`);
    }

    const cleanResult = accumulatedText.replace(/end$/, '').trim();
    return cleanResult;

  } finally {
    page.off('response', streamHandler);
    await page.close().catch(() => {});
  }
}
