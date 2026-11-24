import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(
  'https://www.pracuj.pl/praca/java-fullstack-developer-with-angular-warszawa,oferta,1005113526',
  { waitUntil: 'networkidle0', timeout: 120000 },
);
await new Promise((r) => setTimeout(r, 4000));

const ld = await page.evaluate(() => {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
    try {
      return JSON.parse(s.textContent);
    } catch {
      return s.textContent;
    }
  });
});

console.log(JSON.stringify(ld, null, 2));
await browser.close();
