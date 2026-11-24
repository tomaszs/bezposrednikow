import { readFileSync } from 'fs';

const html = readFileSync(new URL('../przyklady/justjoin.txt', import.meta.url), 'utf8');

const patterns = [
  'offer-card',
  'container-name:offer-card',
  'justjoin.it',
  'hiring-company',
  'company-logos',
  '/job-offer/',
  '/offers/',
  'data-testid',
  'CodeTalent',
  'ITDS',
];

for (const p of patterns) {
  const count = (html.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`${p}: ${count}`);
}

const title = html.match(/<title>([^<]+)<\/title>/i);
console.log('\ntitle:', title?.[1]);

const hrefs = [...new Set([...html.matchAll(/href="(\/[^"]*(?:job|offer)[^"]*)"/g)].map((m) => m[1]))].slice(0, 25);
console.log('\noffer hrefs:', hrefs);

const testIds = [
  ...new Set([...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1])),
].filter((t) => /offer|company|job|card/i.test(t));
console.log('\ndata-testid:', testIds.slice(0, 40).join(', '));

const firstOffer = html.match(/href="(\/job-offer\/[^"]+)"/);
if (firstOffer) {
  const i = html.indexOf(firstOffer[0]);
  console.log('\n--- first job-offer link snippet ---\n');
  console.log(html.slice(i - 800, i + 3500));
}

const companyNames = [
  ...html.matchAll(/alt="([^"]+)"[^>]*src="[^"]*company-logos[^"]*"/g),
].map((m) => m[1]);
console.log('\nlogo alt companies:', [...new Set(companyNames)].slice(0, 20));

const hiringAlts = [
  ...html.matchAll(/alt="([^"]+)"[^>]*hiring-company-logos/g),
].map((m) => m[1]);
console.log('hiring logo alts:', [...new Set(hiringAlts)].slice(0, 20));

const offerLinks = [...html.matchAll(/href="(\/job-offer\/[^"]+)"/g)].length;
console.log('\njob-offer link count:', offerLinks);