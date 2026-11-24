import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const html = readFileSync(path.join(root, 'przyklady/linkedin.txt'), 'utf8');

const shared = path.join(root, 'extension/shared');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

await page.setContent(html, { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(
  ({ normalizeJs, matchJs, linkedinDomJs }) => {
    // eslint-disable-next-line no-eval
    eval(normalizeJs);
    // eslint-disable-next-line no-eval
    eval(matchJs);
    // eslint-disable-next-line no-eval
    eval(linkedinDomJs);

    const { collectOfferTiles, getEmployerFromTile, getEmployerFromPageTitle } = BezposrednikowLinkedinDom;
    const tiles = collectOfferTiles();
    const employers = tiles.map((tile) => ({
      employer: getEmployerFromTile(tile),
      componentkey: tile.getAttribute('componentkey'),
    }));

    return {
      tileCount: tiles.length,
      pageTitleEmployer: getEmployerFromPageTitle(),
      sample: employers.slice(0, 8),
      missing: employers.filter((row) => !row.employer).length,
    };
  },
  {
    normalizeJs: readFileSync(path.join(shared, 'normalize.js'), 'utf8'),
    matchJs: readFileSync(path.join(shared, 'match.js'), 'utf8'),
    linkedinDomJs: readFileSync(path.join(shared, 'linkedin-dom.js'), 'utf8'),
  },
);

console.log(JSON.stringify(result, null, 2));

const ok =
  result.tileCount > 0 && result.pageTitleEmployer === 'FlowTribe.io' && result.missing < result.tileCount * 0.2;

if (!ok) {
  console.error('LinkedIn DOM test failed');
  process.exitCode = 1;
} else {
  console.log('LinkedIn DOM test passed');
}

await browser.close();