const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'changeme123';

// ── Auth Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

// ── Helpers ──────────────────────────────────────────────────────
async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800'
    ]
  });
}

async function getPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });
  return page;
}

// ── Bypassers ────────────────────────────────────────────────────

// link-hub.net bypasser
async function bypassLinkHub(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait and click through any "Continue" / "Get Link" buttons
  const buttonSelectors = [
    'a.btn-primary',
    'button.btn-primary',
    '#get-link',
    '.get-link',
    'a[href*="go"]',
    '.continue-btn',
    'input[type="submit"]'
  ];

  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, 2000));

    // Try clicking any visible button
    for (const sel of buttonSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      } catch (e) {}
    }

    // Check if we've been redirected to the final URL
    const currentUrl = page.url();
    if (
      currentUrl.includes('mega.nz') ||
      currentUrl.includes('drive.google') ||
      currentUrl.includes('mediafire') ||
      currentUrl.includes('gofile') ||
      (!currentUrl.includes('link-hub.net') && currentUrl !== url)
    ) {
      return currentUrl;
    }

    // Look for a visible link on the page
    const finalLink = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href]')];
      const target = links.find(a =>
        a.href.includes('mega.nz') ||
        a.href.includes('drive.google') ||
        a.href.includes('mediafire') ||
        a.href.includes('gofile') ||
        a.href.includes('1fichier')
      );
      return target ? target.href : null;
    });

    if (finalLink) return finalLink;
  }

  throw new Error('Could not bypass link-hub.net');
}

// linkvertise.com bypasser
async function bypassLinkvertise(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Handle "I'm not a robot" / task pages
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise(r => setTimeout(r, 2500));

    const currentUrl = page.url();
    if (
      currentUrl.includes('mega.nz') ||
      currentUrl.includes('drive.google') ||
      (!currentUrl.includes('linkvertise') && currentUrl !== url)
    ) {
      return currentUrl;
    }

    // Try clicking through tasks
    const selectors = [
      '#human-verification',
      '.continue-button',
      'a.btn-primary',
      '#task-timer-button',
      '.start-task',
      'button[type="submit"]',
      '.skip-task'
    ];

    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) { await el.click(); break; }
      } catch (e) {}
    }

    // Find destination link
    const link = await page.evaluate(() => {
      const a = document.querySelector('a[data-url], #destination-link, .destination');
      return a ? (a.dataset.url || a.href) : null;
    });

    if (link) return link;
  }

  throw new Error('Could not bypass Linkvertise');
}

// work.ink bypasser
async function bypassWorkInk(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, 2500));

    const currentUrl = page.url();
    if (!currentUrl.includes('work.ink') && currentUrl !== url) {
      return currentUrl;
    }

    const selectors = [
      '.continue-btn',
      '#continue',
      'a.btn',
      'button.btn-success',
      'input[type="submit"]'
    ];

    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) { await el.click(); break; }
      } catch (e) {}
    }

    // Check for redirect
    const link = await page.evaluate(() => {
      const a = document.querySelector('a[href*="mega"], a[href*="drive.google"], a[href*="mediafire"]');
      return a ? a.href : null;
    });

    if (link) return link;
  }

  throw new Error('Could not bypass work.ink');
}

// Generic bypasser for unknown lockers
async function bypassGeneric(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, 2500));

    const currentUrl = page.url();
    const finalDomains = ['mega.nz', 'drive.google', 'mediafire', 'gofile.io', '1fichier'];

    if (finalDomains.some(d => currentUrl.includes(d))) return currentUrl;

    // Click any primary button
    const btns = ['a.btn-primary', 'button.btn-primary', 'input[type="submit"]', '.get-link', '#get-link', 'a.continue'];
    for (const sel of btns) {
      try {
        const el = await page.$(sel);
        if (el) { await el.click(); break; }
      } catch (e) {}
    }

    // Look for final links on page
    const link = await page.evaluate((domains) => {
      const all = [...document.querySelectorAll('a[href]')];
      const found = all.find(a => domains.some(d => a.href.includes(d)));
      return found ? found.href : null;
    }, finalDomains);

    if (link) return link;
  }

  throw new Error('Could not bypass this link');
}

// ── Route: Detect & Bypass ────────────────────────────────────────
app.post('/bypass', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let browser;
  try {
    browser = await launchBrowser();
    const page = await getPage(browser);

    let result;
    if (url.includes('link-hub.net'))     result = await bypassLinkHub(page, url);
    else if (url.includes('linkvertise')) result = await bypassLinkvertise(page, url);
    else if (url.includes('work.ink'))    result = await bypassWorkInk(page, url);
    else                                  result = await bypassGeneric(page, url);

    await browser.close();
    res.json({ status: 'success', original: url, result });

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ status: 'failed', original: url, error: err.message });
  }
});

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Bypass service running on port ${PORT}`));
