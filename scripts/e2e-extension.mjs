import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '..', 'extension');
const listingUrl = 'https://it.pracuj.pl/praca/angular;kw';

const chromePath = process.env.CHROME_PATH;

const browser = await puppeteer.launch({
  headless: false,
  ...(chromePath ? { executablePath: chromePath } : { channel: 'chrome' }),
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-sandbox',
    '--disable-blink-features=AutomationControlled',
  ],
});

async function waitForExtensionWorker(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const target = browser
      .targets()
      .find((t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://'));
    if (target) {
      return target;
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  return null;
}

const extensionTarget = await waitForExtensionWorker();
if (!extensionTarget) {
  console.error('Extension service worker not found. Is Google Chrome installed?');
  await browser.close();
  process.exit(1);
}

const worker = await extensionTarget.worker();
await worker.evaluate(async () => {
  await chrome.storage.sync.set({
    enabled: true,
    blocklist: [
      'ITDS',
      'Devapo',
      'Scalo',
      'NESS',
      'Optiveum',
      'CodeTalent',
      'IT CONNECT',
      'Square One',
      'dotLinkers',
      'Sii',
    ],
  });
});

const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});

await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

try {
  const accept = await page.$('button#onetrust-accept-btn-handler');
  if (accept) await accept.click();
} catch {
  //
}

await new Promise((r) => setTimeout(r, 10000));

const stats = await page.evaluate(() => {
  const tiles = document.querySelectorAll('[data-bezposrednikow-hidden="true"]');
  const visibleCompanies = [];
  document.querySelectorAll('[data-test="link-company-logo"]').forEach((a) => {
    const container = a.closest('[data-bezposrednikow-hidden="true"]');
    if (!container) {
      const m = a.title?.match(/profil pracodawcy\s+(.+)/i);
      if (m) visibleCompanies.push(m[1]);
    }
  });

  return {
    hiddenCount: tiles.length,
    visibleEmployersSample: [...new Set(visibleCompanies)],
  };
});

console.log('E2E stats:', JSON.stringify(stats, null, 2));

const leaked = stats.visibleEmployersSample.filter((name) =>
  /devapo|itds|scalo|ness solution|optiveum|code ?talent|it connect|square one|dotlinkers|^sii /i.test(name),
);

if (stats.hiddenCount < 5) {
  console.error('Expected at least 5 hidden offers on angular listing, got', stats.hiddenCount);
  await browser.close();
  process.exit(1);
}

if (leaked.length > 0) {
  console.error('Agency employers still visible:', leaked);
  await browser.close();
  process.exit(1);
}

console.log('E2E extension test passed.');
await browser.close();
