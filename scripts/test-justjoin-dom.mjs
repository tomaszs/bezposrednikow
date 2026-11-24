import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const shared = path.join(root, 'extension/shared');
const html = readFileSync(path.join(root, 'przyklady/justjoin.txt'), 'utf8');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded' });

const blocklist = ['Experis', 'Netguru', 'Cyclad', 'Ness', 'Accenture', 'Manpower'];

const result = await page.evaluate(
  ({ normalizeJs, matchJs, justjoinDomJs, blocklist }) => {
    // eslint-disable-next-line no-eval
    eval(normalizeJs);
    // eslint-disable-next-line no-eval
    eval(matchJs);
    // eslint-disable-next-line no-eval
    eval(justjoinDomJs);

    const { collectOfferTiles, getEmployerFromTile } = BezposrednikowJustjoinDom;
    const { employerMatchesBlocklist } = BezposrednikowMatch;

    const tiles = collectOfferTiles();
    const rows = tiles.map((tile) => ({
      employer: getEmployerFromTile(tile),
      hide: employerMatchesBlocklist(getEmployerFromTile(tile), blocklist),
    }));

    return {
      tileCount: tiles.length,
      missingEmployers: rows.filter((row) => !row.employer).length,
      blockedSample: rows.filter((row) => row.hide).slice(0, 12),
      firstEmployers: rows.slice(0, 8).map((row) => row.employer),
    };
  },
  {
    normalizeJs: readFileSync(path.join(shared, 'normalize.js'), 'utf8'),
    matchJs: readFileSync(path.join(shared, 'match.js'), 'utf8'),
    justjoinDomJs: readFileSync(path.join(shared, 'justjoin-dom.js'), 'utf8'),
    blocklist,
  },
);

console.log(JSON.stringify(result, null, 2));

const ok = result.tileCount >= 40 && result.missingEmployers <= 2 && result.blockedSample.length > 0;

if (!ok) {
  console.error('Just Join DOM test failed');
  process.exitCode = 1;
} else {
  console.log('Just Join DOM test passed');
}

await browser.close();