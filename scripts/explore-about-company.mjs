import puppeteer from 'puppeteer';

const url =
  'https://www.pracuj.pl/praca/senior-java-developer-krakow-stanislawa-klimeckiego-1,oferta,1005062286';

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
await new Promise((r) => setTimeout(r, 4000));

const data = await page.evaluate(() => {
  const employer = document.querySelector('[data-test="text-employer-name"]')?.textContent?.trim();

  const aboutTests = [...document.querySelectorAll('[data-test]')]
    .map((el) => el.getAttribute('data-test'))
    .filter((t) => /about|company|employer|profile|firma/i.test(t || ''));

  const aboutSections = [...document.querySelectorAll('[data-test*="about"], [data-test*="employer"], section')]
    .filter((el) => /about|company|o firmie|about the company/i.test(el.textContent?.slice(0, 80) || ''))
    .slice(0, 8)
    .map((el) => ({
      test: el.getAttribute('data-test'),
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 500),
    }));

  const aboutUs = document.querySelector('[data-test="about-us-extended"]')?.innerText?.slice(0, 2000);
  const aboutUsHeader = document.querySelector('[data-test="about-us-extended-header"]')?.innerText;

  return {
    employer,
    aboutTests: [...new Set(aboutTests)].sort(),
    aboutUsHeader,
    aboutUs,
    aboutSections,
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
