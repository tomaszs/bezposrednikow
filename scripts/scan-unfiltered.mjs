import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { createContext, runInContext } from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shared = path.join(__dirname, '..', 'extension', 'shared');
const sandbox = { window: {} };
sandbox.window = sandbox;
const ctx = createContext(sandbox);
runInContext(readFileSync(path.join(shared, 'normalize.js'), 'utf8'), ctx);
runInContext(readFileSync(path.join(shared, 'match.js'), 'utf8'), ctx);
const { companyToFilterKey } = sandbox.window.BezposrednikowNormalize;
const { employerMatchesBlocklist, textLooksLikeAgencyOffer } = sandbox.window.BezposrednikowMatch;

const defaultsSrc = readFileSync(path.join(__dirname, '..', 'extension', 'shared', 'defaults.js'), 'utf8');
const blocklist = [...defaultsSrc.matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);

const url = 'https://it.pracuj.pl/praca/angular;kw';

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
try {
  const accept = await page.$('button#onetrust-accept-btn-handler');
  if (accept) await accept.click();
} catch {
  //
}
await new Promise((r) => setTimeout(r, 6000));

const sample = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[data-test="link-company-logo"]').forEach((a) => {
    const m = a.title?.match(/profil pracodawcy\s+(.+)/i);
    if (!m) return;
    const tile = a.closest('[class*="offer-tile_cnf6am"]')?.parentElement || a.closest('[class*="offer-tile"]');
    const offerLink = tile?.querySelector('[data-test="link-offer-title"], h2 a[href*=",oferta,"]');
    out.push({
      employer: m[1].trim(),
      tileText: tile?.innerText?.slice(0, 500) || '',
      href: offerLink?.href || '',
    });
  });

  return out.slice(0, 40);
});

const notBlocked = sample.filter((r) => !employerMatchesBlocklist(r.employer, blocklist));
console.log('Not on blocklist (sample):', notBlocked.length);

for (const row of notBlocked.slice(0, 8)) {
  if (!row.href) continue;
  const dp = await browser.newPage();
  await dp.goto(row.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));
  const detail = await dp.evaluate(() => {
    const desc = [
      document.querySelector('[data-test="block-description"]'),
      document.querySelector('[data-test="section-about-project"]'),
      document.querySelector('[data-test="section-requirements"]'),
    ]
      .filter(Boolean)
      .map((el) => el.innerText)
      .join('\n');

    return { descSample: desc.slice(0, 600), len: desc.length };
  });
  await dp.close();
  const tileAgency = textLooksLikeAgencyOffer(row.tileText);
  const detailAgency = textLooksLikeAgencyOffer(detail.descSample);
  console.log({
    employer: row.employer,
    key: companyToFilterKey(row.employer),
    tileAgency,
    detailAgency,
    detailLen: detail.len,
    snippet: detail.descSample.slice(0, 120),
  });
}

await browser.close();
