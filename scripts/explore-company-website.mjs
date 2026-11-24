import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(
  'https://www.pracuj.pl/praca/java-fullstack-developer-with-angular-warszawa,oferta,1005113526',
  { waitUntil: 'networkidle0', timeout: 120000 },
);
await new Promise((r) => setTimeout(r, 5000));

const data = await page.evaluate(() => {
  const about = document.querySelector('[data-test="about-us-extended"]');
  const aboutLinks = about
    ? [...about.querySelectorAll('a[href]')].map((a) => ({ href: a.href, text: a.textContent?.trim() }))
    : [];

  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent?.slice(0, 500));

  const allAboutArea = document.querySelector('[data-test="section-employer-profile"]');
  const profileLinks = allAboutArea
    ? [...allAboutArea.querySelectorAll('a[href^="http"]')].map((a) => ({ href: a.href, text: a.textContent?.trim() }))
    : [];

  return { aboutLinks, profileLinks, jsonLdCount: jsonLd.length, jsonLdSample: jsonLd[0] };
});

console.log(JSON.stringify(data, null, 2));

const profilePage = await browser.newPage();
await profilePage.goto('https://pracodawcy.pracuj.pl/company/1074221283?pid=1005113526', {
  waitUntil: 'domcontentloaded',
  timeout: 90000,
});
await new Promise((r) => setTimeout(r, 6000));
const profile = await profilePage.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="http"]')]
    .filter((a) => !a.href.includes('pracuj'))
    .map((a) => ({ href: a.href, text: a.textContent?.trim().slice(0, 80) }));

  return { title: document.title, links: links.slice(0, 20), body: document.body.innerText.slice(0, 800) };
});
console.log('PROFILE', JSON.stringify(profile, null, 2));

await browser.close();
