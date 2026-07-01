const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser to inspect DeepInfra...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set fake user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Intercept requests
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('api.deepinfra.com') && req.method() === 'POST') {
      console.log("\n--- CAUGHT API REQUEST ---");
      console.log("URL:", url);
      console.log("HEADERS:", req.headers());
      console.log("BODY:", req.postData());
      console.log("--------------------------\n");
    }
    req.continue();
  });

  console.log("Navigating to https://deepinfra.com/chat ...");
  await page.goto('https://deepinfra.com/chat', { waitUntil: 'networkidle2' });
  
  console.log("Waiting for input...");
  await page.waitForSelector('textarea');
  
  console.log("Typing message...");
  await page.type('textarea', 'hello');
  await page.keyboard.press('Enter');
  
  console.log("Waiting for request to fire...");
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  console.log("Done.");
})();
