import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const url = 'https://it.pracuj.pl/praca/angular;kw';

const browser = await puppeteer.launch({
  headless: false,
  args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
try {
  const accept = await page.$('button#onetrust-accept-btn-handler');
  if (accept) await accept.click();
} catch {
  //
}
await new Promise((r) => setTimeout(r, 6000));

const companies = await page.evaluate(() => {
  const names = new Set();
  document.querySelectorAll('a[data-test="link-company-logo"], a[title*="profil pracodawcy"]').forEach((a) => {
    const m = a.getAttribute('title')?.match(/profil pracodawcy (.+)/i);
    if (m) names.add(m[1].trim());
  });
  document.querySelectorAll('[data-test="link-check-company-profile"]').forEach((a) => {
    const t = a.textContent?.trim();
    if (t) names.add(t);
  });

  return [...names].sort();
});

console.log('Companies on page 1:', companies.length);
console.log(companies.join('\n'));

writeFileSync('scripts/angular-companies-page1.json', JSON.stringify(companies, null, 2));

await browser.close();
