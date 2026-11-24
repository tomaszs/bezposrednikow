/**
 * Crawls it.pracuj.pl listings, classifies employers (agency/consultancy vs direct),
 * writes scripts/blocklist-candidates.json and scripts/blocklist-reviewed.json
 */
import puppeteer from 'puppeteer';
import { writeFileSync, readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shared = join(__dirname, '..', 'extension', 'shared');
const sandbox = { window: {} };
sandbox.window = sandbox;
const ctx = createContext(sandbox);
runInContext(readFileSync(join(shared, 'normalize.js'), 'utf8'), ctx);
runInContext(readFileSync(join(shared, 'match.js'), 'utf8'), ctx);

const { companyToFilterKey } = sandbox.window.BezposrednikowNormalize;
const { textShouldExcludeOffer, textLooksLikeConsultingCompany, textLooksLikeAgencyOffer } =
  sandbox.window.BezposrednikowMatch;

const { employerWebsitesIndicateConsultancy } = await import('./lib/website-fetch.mjs');

/** Product / direct employers — never auto-add from heuristics */
const DIRECT_EMPLOYER_KEYS = new Set(
  [
    'google',
    'amazon',
    'microsoft',
    'meta',
    'apple',
    'netflix',
    'spotify',
    'uber',
    'revolut',
    'allegro',
    'cd projekt',
    'comarch',
    'asseco',
    'livechat',
    'docplanner',
    'booksy',
    'brainly',
    'grupa allegro',
    'santander',
    'mbank',
    'ing',
    'pkobp',
    'pekao',
    'lux med',
    'orange polska',
    't-mobile',
    'play',
    'plus',
    'nokia',
    'intel',
    'amd',
    'nvidia',
    'samsung',
    'huawei',
    'ericsson',
    'siemens',
    'bosch',
    'philips',
    'abb',
    'schneider',
  ].map((k) => k.toLowerCase()),
);

const SEARCHES = [
  'https://it.pracuj.pl/praca',
  'https://it.pracuj.pl/praca/java;kw',
  'https://it.pracuj.pl/praca/javascript;kw',
  'https://it.pracuj.pl/praca/angular;kw',
  'https://it.pracuj.pl/praca/react;kw',
  'https://it.pracuj.pl/praca/python;kw',
  'https://it.pracuj.pl/praca/devops;kw',
  'https://it.pracuj.pl/praca/.net;kw',
  'https://it.pracuj.pl/praca/php;kw',
  'https://it.pracuj.pl/praca/tester;kw',
  'https://it.pracuj.pl/praca/analityk;kw',
];

const PAGES = Number(process.env.BUILD_PAGES || 8);
const DETAIL_LIMIT = Number(process.env.BUILD_DETAIL_LIMIT || 200);

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

async function acceptCookies(page) {
  try {
    const btn = await page.$('button#onetrust-accept-btn-handler');
    if (btn) await btn.click();
  } catch {
    //
  }
}

async function scrapePage(page) {
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('[data-test="link-company-logo"]').forEach((a) => {
      const m = a.title?.match(/profil pracodawcy\s+(.+)/i);
      if (!m) return;
      const inner = a.closest('[class*="offer-tile_cnf6am"]');
      const parent = inner?.parentElement;
      const tile = parent?.querySelector('[data-test="mobile-banner"]') ? parent : inner?.parentElement;
      const titleLink = tile?.querySelector('[data-test="link-offer-title"], h2 a[href*=",oferta,"]');
      rows.push({
        employer: m[1].trim(),
        href: titleLink?.href || '',
        tileText: tile?.innerText?.slice(0, 2500) || '',
      });
    });

    return rows;
  });
}

async function goToPage(page, n) {
  const btn = await page.$(`[data-test="bottom-pagination-button-page-${n}"]`);
  if (!btn) return false;
  await btn.click();
  await new Promise((r) => setTimeout(r, 4500));

  return true;
}

const employers = new Map();

for (const url of SEARCHES) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await acceptCookies(page);
  await new Promise((r) => setTimeout(r, 4000));

  for (let p = 1; p <= PAGES; p += 1) {
    const rows = await scrapePage(page);
    for (const row of rows) {
      const key = companyToFilterKey(row.employer);
      if (!key) continue;
      if (!employers.has(key)) {
        employers.set(key, {
          key,
          employer: row.employer,
          offers: new Set(),
          tileText: row.tileText,
          count: 0,
        });
      }

      const e = employers.get(key);
      e.count += 1;
      if (row.href) e.offers.add(row.href);
      if (row.tileText.length > e.tileText.length) e.tileText = row.tileText;
    }

    if (p < PAGES && !(await goToPage(page, p + 1))) break;
  }

  await page.close();
}

console.log(`Collected ${employers.size} unique employers from listings.`);

const toClassify = [...employers.values()].sort((a, b) => b.count - a.count);
let detailDone = 0;

for (const entry of toClassify) {
  if (DIRECT_EMPLOYER_KEYS.has(entry.key) || DIRECT_EMPLOYER_KEYS.has(entry.employer.toLowerCase())) {
    entry.verdict = 'direct-whitelist';
    continue;
  }

  if (textShouldExcludeOffer(entry.tileText)) {
    entry.verdict = 'exclude-tile';
    continue;
  }

  if (detailDone >= DETAIL_LIMIT) {
    entry.verdict = 'unchecked';
    continue;
  }

  const offerUrl = [...entry.offers][0];
  if (offerUrl) {
    const dp = await browser.newPage();
    await dp.goto(offerUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await new Promise((r) => setTimeout(r, 2500));
    const text = await dp.evaluate(() => {
      const job = [
        document.querySelector('[data-test="block-description"]'),
        document.querySelector('[data-test="section-about-project"]'),
        document.querySelector('[data-test="section-offered"]'),
      ]
        .filter(Boolean)
        .map((el) => el.textContent)
        .join('\n');
      const about = document.querySelector('[data-test="about-us-extended"]')?.textContent || '';

      return `${job}\n\n${about}`;
    });
    await dp.close();
    detailDone += 1;

    entry.aboutSample = text.slice(0, 300);
    if (textShouldExcludeOffer(text)) {
      entry.verdict = 'exclude-offer-text';
      continue;
    }
  }

  const web = await employerWebsitesIndicateConsultancy(entry.employer);
  entry.website = web;
  if (web.exclude) {
    entry.verdict = `exclude-website-${web.reason}`;
    continue;
  }

  entry.verdict = 'likely-direct';
}

await browser.close();

const exclude = toClassify
  .filter((e) => e.verdict && e.verdict.startsWith('exclude'))
  .map((e) => ({
    key: e.key,
    employer: e.employer,
    verdict: e.verdict,
    count: e.count,
  }));

const likelyDirect = toClassify
  .filter((e) => e.verdict === 'likely-direct')
  .slice(0, 40)
  .map((e) => ({ key: e.key, employer: e.employer, count: e.count }));

writeFileSync(join(__dirname, 'blocklist-candidates.json'), JSON.stringify({ exclude, likelyDirect, total: employers.size }, null, 2));

console.log(`Excluded by heuristics: ${exclude.length}`);
console.log('Wrote scripts/blocklist-candidates.json');
