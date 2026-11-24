import puppeteer from 'puppeteer';

const url = 'https://www.pracuj.pl/praca/senior-angular-developer-warszawa-aleje-jerozolimskie-100,oferta,1005154742';

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
await new Promise((r) => setTimeout(r, 3000));

const data = await page.evaluate(() => {
  const dataTests = [...document.querySelectorAll('[data-test]')]
    .map((el) => el.getAttribute('data-test'))
    .filter((t) => /desc|offer|about|require|responsib|scope|project/i.test(t || ''));
  const unique = [...new Set(dataTests)].sort();

  const mainText = document.querySelector('main')?.innerText?.slice(0, 2500) || document.body.innerText.slice(0, 2500);

  return { unique, mainText };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
