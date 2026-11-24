/**
 * E2E without loading the MV3 extension (works with Puppeteer's bundled Chromium).
 * Injects the same match/normalize logic and applies hiding like the content script.
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shared = path.resolve(__dirname, '..', 'extension', 'shared');
const listingUrl = 'https://it.pracuj.pl/praca/angular;kw';

const normalizeJs = readFileSync(path.join(shared, 'normalize.js'), 'utf8');
const matchJs = readFileSync(path.join(shared, 'match.js'), 'utf8');

const blocklist = [
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
];

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

const page = await browser.newPage();
await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });

try {
  const accept = await page.$('button#onetrust-accept-btn-handler');
  if (accept) await accept.click();
} catch {
  //
}

await new Promise((r) => setTimeout(r, 8000));

await page.evaluate(
  ({ normalizeJs, matchJs, blocklist }) => {
    // eslint-disable-next-line no-eval
    eval(normalizeJs);
    // eslint-disable-next-line no-eval
    eval(matchJs);

    const { companyToFilterKey, normalizeCompanyName } = BezposrednikowNormalize;
    const { employerMatchesBlocklist, textLooksLikeAgencyOffer } = BezposrednikowMatch;

    function getEmployerFromTile(tile) {
      const logoLink = tile.querySelector('[data-test="link-company-logo"]');
      if (logoLink?.title) {
        const match = logoLink.title.match(/profil pracodawcy\s+(.+)/i);
        if (match) return match[1].trim();
      }

      return '';
    }

    function getTileContainer(linkOffer) {
      const inner = linkOffer.closest('[class*="offer-tile_cnf6am"]');
      if (!inner?.parentElement) return linkOffer.closest('[class*="offer-tile"]');
      const parent = inner.parentElement;
      if (parent.querySelector('[data-test="mobile-banner"]')) return parent;

      return inner.parentElement.closest('[class*="offer-tile"]') || inner.parentElement;
    }

    function containerFromCompanyLogo(logoLink) {
      const inner = logoLink.closest('[class*="offer-tile_cnf6am"]');
      if (!inner?.parentElement) return logoLink.closest('[class*="offer-tile"]');
      const parent = inner.parentElement;
      if (parent.querySelector('[data-test="mobile-banner"]')) return parent;

      return inner.parentElement.closest('[class*="offer-tile"]') || parent;
    }

    const tiles = new Set();
    document.querySelectorAll('[data-test="link-company-logo"]').forEach((logo) => {
      const t = containerFromCompanyLogo(logo);
      if (t) tiles.add(t);
    });
    document.querySelectorAll('[data-test="link-offer"]').forEach((link) => {
      const t = getTileContainer(link);
      if (t) tiles.add(t);
    });

    let hidden = 0;
    tiles.forEach((tile) => {
      const employer = getEmployerFromTile(tile);
      const text = tile.innerText || '';
      const hide =
        employerMatchesBlocklist(employer, blocklist) || textLooksLikeAgencyOffer(text);
      if (hide) {
        tile.style.display = 'none';
        tile.setAttribute('data-bezposrednikow-hidden', 'true');
        hidden += 1;
      }
    });

    window.__bezposrednikowTest = { hidden, normalizeCompanyName, companyToFilterKey };
  },
  { normalizeJs, matchJs, blocklist },
);

const stats = await page.evaluate(() => {
  const visible = [];
  document.querySelectorAll('[data-test="link-company-logo"]').forEach((a) => {
    const hidden = a.closest('[data-bezposrednikow-hidden="true"]');
    if (!hidden) {
      const m = a.title?.match(/profil pracodawcy\s+(.+)/i);
      if (m) visible.push(m[1]);
    }
  });

  return {
    hiddenCount: window.__bezposrednikowTest?.hidden ?? 0,
    visibleEmployers: [...new Set(visible)],
  };
});

console.log('Injected E2E:', JSON.stringify(stats, null, 2));

const leaked = stats.visibleEmployers.filter((name) =>
  /devapo|itds|scalo|ness solution|optiveum|code ?talent|it connect|square one|dotlinkers|^sii /i.test(name),
);

if (stats.hiddenCount < 5) {
  console.error('Expected at least 5 hidden offers, got', stats.hiddenCount);
  await browser.close();
  process.exit(1);
}

if (leaked.length > 0) {
  console.error('Blocked employers still visible:', leaked);
  await browser.close();
  process.exit(1);
}

console.log('Injected E2E test passed.');
await browser.close();
