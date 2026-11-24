import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const url = 'https://it.pracuj.pl/praca/angular;kw';

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await new Promise((r) => setTimeout(r, 8000));

const html = await page.content();
writeFileSync('scripts/debug-page.html', html);

const stats = await page.evaluate(() => ({
  title: document.title,
  linkCount: document.querySelectorAll('a').length,
  ofertaLinks: [...document.querySelectorAll('a')]
    .filter((a) => a.href.includes('oferta'))
    .slice(0, 5)
    .map((a) => a.href),
  bodyLen: document.body?.innerText?.length,
  bodyStart: document.body?.innerText?.slice(0, 500),
}));

console.log(JSON.stringify(stats, null, 2));

await browser.close();
