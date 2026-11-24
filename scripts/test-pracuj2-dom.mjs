import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shared = path.join(root, 'extension/shared');
const html = readFileSync(path.join(root, 'przyklady/pracuj2.txt'), 'utf8');

const blocklist = JSON.parse(
  readFileSync(path.join(shared, 'curated-blocklist.js'), 'utf8').match(/export const CURATED_BLOCKLIST = (\[[\s\S]*?\]);/)?.[1] ||
    '[]',
);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(
  ({ normalizeJs, matchJs, pracujDomJs, blocklist }) => {
    // eslint-disable-next-line no-eval
    eval(normalizeJs);
    // eslint-disable-next-line no-eval
    eval(matchJs);
    // eslint-disable-next-line no-eval
    eval(pracujDomJs);

    const { collectOfferTiles, getEmployerFromTile } = BezposrednikowPracujDom;
    const { employerMatchesBlocklist } = BezposrednikowMatch;

    const tiles = collectOfferTiles();
    const rows = tiles.map((tile) => {
      const employer = getEmployerFromTile(tile);

      return {
        employer,
        hide: employerMatchesBlocklist(employer, blocklist),
      };
    });

    return {
      tileCount: tiles.length,
      alten: rows.filter((row) => /alten/i.test(row.employer)),
      hiddenSample: rows.filter((row) => row.hide).slice(0, 12),
    };
  },
  {
    normalizeJs: readFileSync(path.join(shared, 'normalize.js'), 'utf8'),
    matchJs: readFileSync(path.join(shared, 'match.js'), 'utf8'),
    pracujDomJs: readFileSync(path.join(shared, 'pracuj-dom.js'), 'utf8'),
    blocklist,
  },
);

console.log(JSON.stringify(result, null, 2));

const altenHidden = result.alten.length > 0 && result.alten.every((row) => row.hide);
const ok = result.tileCount >= 25 && altenHidden;

if (!ok) {
  console.error('pracuj2 DOM test failed');
  process.exitCode = 1;
} else {
  console.log('pracuj2 DOM test passed (Alten hidden)');
}

await browser.close();