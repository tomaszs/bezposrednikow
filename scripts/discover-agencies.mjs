/**
 * Scans IT category listings (multiple searches + pagination), classifies employers,
 * fetches offer descriptions for ones not on the blocklist, reports gaps.
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
const context = createContext(sandbox);
runInContext(readFileSync(join(shared, 'normalize.js'), 'utf8'), context);
runInContext(readFileSync(join(shared, 'match.js'), 'utf8'), context);
const { companyToFilterKey } = sandbox.window.BezposrednikowNormalize;
const { employerMatchesBlocklist, textLooksLikeAgencyOffer, textLooksLikeConsultingCompany, getExclusionReason } =
  sandbox.window.BezposrednikowMatch;

const defaultsSrc = readFileSync(join(shared, 'defaults.js'), 'utf8');
const blocklist = [...defaultsSrc.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);

const SEARCHES = [
  'https://it.pracuj.pl/praca',
  'https://it.pracuj.pl/praca/angular;kw',
  'https://it.pracuj.pl/praca/java;kw',
  'https://it.pracuj.pl/praca/react;kw',
  'https://it.pracuj.pl/praca/devops;kw',
];

const PAGES_PER_SEARCH = Number(process.env.DISCOVER_PAGES || 5);
const DETAIL_SAMPLE_LIMIT = Number(process.env.DISCOVER_DETAIL_LIMIT || 100);

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});

async function acceptCookies(page) {
  try {
    const accept = await page.$('button#onetrust-accept-btn-handler');
    if (accept) await accept.click();
  } catch {
    //
  }
}

async function scrapeListingPage(page) {
  return page.evaluate(() => {
    const rows = [];
    document.querySelectorAll('[data-test="link-company-logo"]').forEach((a) => {
      const m = a.title?.match(/profil pracodawcy\s+(.+)/i);
      if (!m) return;
      const inner = a.closest('[class*="offer-tile_cnf6am"]');
      const parent = inner?.parentElement;
      const tile = parent?.querySelector('[data-test="mobile-banner"]') ? parent : inner?.parentElement || a.closest('[class*="offer-tile"]');
      const titleLink = tile?.querySelector('[data-test="link-offer-title"], h2 a[href*=",oferta,"]');
      const overlay = tile?.querySelector('[data-test="link-offer"]');
      const href = titleLink?.href || (overlay?.href?.includes(',oferta,') ? overlay.href : '');
      rows.push({
        employer: m[1].trim(),
        tileText: tile?.innerText?.slice(0, 2000) || '',
        href,
      });
    });

    return rows;
  });
}

async function goToPage(page, pageNumber) {
  const selector = `[data-test="bottom-pagination-button-page-${pageNumber}"]`;
  const btn = await page.$(selector);
  if (!btn) return false;
  await btn.click();
  await new Promise((r) => setTimeout(r, 5000));

  return true;
}

const employers = new Map();

for (const searchUrl of SEARCHES) {
  const page = await browser.newPage();
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await acceptCookies(page);
  await new Promise((r) => setTimeout(r, 5000));

  for (let pageNum = 1; pageNum <= PAGES_PER_SEARCH; pageNum += 1) {
    const rows = await scrapeListingPage(page);
    const source = `${searchUrl}#page${pageNum}`;

    for (const row of rows) {
      const key = companyToFilterKey(row.employer);
      if (!employers.has(key)) {
        employers.set(key, {
          employer: row.employer,
          key,
          offerUrls: new Set(),
          tileAgency: false,
          detailAgency: false,
          detailConsulting: false,
          blocked: employerMatchesBlocklist(row.employer, blocklist),
          sources: new Set(),
        });
      }

      const entry = employers.get(key);
      entry.sources.add(source);
      entry.tileAgency = entry.tileAgency || textLooksLikeAgencyOffer(row.tileText);
      entry.blocked = entry.blocked || employerMatchesBlocklist(row.employer, blocklist);
      if (row.href) entry.offerUrls.add(row.href);
    }

    if (pageNum < PAGES_PER_SEARCH) {
      const moved = await goToPage(page, pageNum + 1);
      if (!moved) break;
    }
  }

  await page.close();
}

const needsDetail = [...employers.values()]
  .filter((e) => !e.blocked && !e.tileAgency)
  .slice(0, DETAIL_SAMPLE_LIMIT);

let detailChecks = 0;
for (const entry of needsDetail) {
  const offerUrl = [...entry.offerUrls][0];
  if (!offerUrl) continue;

  const dp = await browser.newPage();
  await dp.goto(offerUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await new Promise((r) => setTimeout(r, 2500));
  const description = await dp.evaluate(() => {
    const jobSelectors = [
      '[data-test="section-about-project"]',
      '[data-test="section-responsibilities"]',
      '[data-test="section-requirements"]',
      '[data-test="offer-badge-description"]',
      '[data-test="section-offered"]',
    ];
    const job = [
      document.querySelector('[data-test="block-description"]')?.textContent?.trim() || '',
      ...jobSelectors.map((s) => document.querySelector(s)?.textContent?.trim() || ''),
    ]
      .filter(Boolean)
      .join('\n');
    const about = [
      document.querySelector('[data-test="about-us-extended"]')?.textContent?.trim() || '',
      document.querySelector('[data-test="section-employer-profile"]')?.textContent?.trim() || '',
    ]
      .filter(Boolean)
      .join('\n');

    return { job, about, full: [job, about].filter(Boolean).join('\n\n') };
  });
  await dp.close();

  entry.detailAgency = textLooksLikeAgencyOffer(description.full);
  entry.detailConsulting = textLooksLikeConsultingCompany(description.full);
  entry.aboutSample = description.about.slice(0, 200);
  detailChecks += 1;
}

await browser.close();

const unfilteredAgency = [...employers.values()].filter(
  (e) => !e.blocked && (e.tileAgency || e.detailAgency || e.detailConsulting),
);
const unfilteredLikelyAgencyKeys = unfilteredAgency.map((e) => ({
  key: e.key,
  employer: e.employer,
  tileAgency: e.tileAgency,
  detailAgency: e.detailAgency,
  detailConsulting: e.detailConsulting,
  reason: getExclusionReason(`${e.aboutSample || ''}`) || (e.detailConsulting ? 'consulting' : 'agency'),
}));

const stillVisible = [...employers.values()]
  .filter((e) => !e.blocked && !e.tileAgency && !e.detailAgency)
  .map((e) => ({ key: e.key, employer: e.employer, count: e.sources.size }))
  .sort((a, b) => b.count - a.count);

const report = {
  blocklistSize: blocklist.length,
  uniqueEmployers: employers.size,
  detailChecks,
  unfilteredLikelyAgencyKeys,
  stillVisibleTop: stillVisible.slice(0, 40),
};

writeFileSync(join(__dirname, 'discover-output.json'), JSON.stringify(report, null, 2));

console.log(`Employers: ${employers.size}, detail checks: ${detailChecks}`);
console.log(`Agency copy but NOT on blocklist (${unfilteredLikelyAgencyKeys.length}):`);
unfilteredLikelyAgencyKeys.forEach((row) => console.log(`  - ${row.key} (${row.employer}) tile=${row.tileAgency} detail=${row.detailAgency}`));
console.log('Full report: scripts/discover-output.json');
