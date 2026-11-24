import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, '../przyklady/justjoin.txt'), 'utf8');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout?.(1000);

const result = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('[style*="container-name: offer-card"], [class*="mui-"]')].filter(
    (el) => getComputedStyle(el).containerName === 'offer-card',
  );

  const cards2 = [...document.querySelectorAll('a[href*="/job-offer/"]')].map((a) => a.closest('[class*="mui-"]'));

  const offerLinks = [...document.querySelectorAll('a[href*="/job-offer/"]')];

  function offerCard(link) {
    let node = link.parentElement;
    while (node) {
      if (getComputedStyle(node).containerName === 'offer-card') {
        return node;
      }
      node = node.parentElement;
    }

    return link;
  }

  function sampleFromLink(link) {
    const tile = offerCard(link);

    const imgs = tile ? [...tile.querySelectorAll('img[alt]')].map((img) => img.alt) : [];
    const texts = tile ? [...tile.querySelectorAll('span, p')].map((n) => n.textContent?.trim()).filter(Boolean) : [];

    return {
      href: link.getAttribute('href'),
      tileTag: tile?.tagName,
      imgs,
      texts: texts.slice(0, 8),
    };
  }

  return {
    containerCards: cards.length,
    offerLinkCount: offerLinks.length,
    samples: offerLinks.slice(0, 10).map(sampleFromLink),
    title: document.title,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();