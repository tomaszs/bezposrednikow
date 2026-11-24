import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('https://it.pracuj.pl/praca/angular;kw', { waitUntil: 'domcontentloaded', timeout: 90000 });
await new Promise((r) => setTimeout(r, 6000));

const pag = await page.evaluate(() => {
  const next = document.querySelector('[data-test="job-offers-bottom-pagination"]');
  const links = next ? [...next.querySelectorAll('a, button')].map((el) => ({
    tag: el.tagName,
    text: el.textContent?.trim(),
    href: el.href,
    test: el.getAttribute('data-test'),
  })) : [];

  return { links };
});

console.log(JSON.stringify(pag, null, 2));
await browser.close();
