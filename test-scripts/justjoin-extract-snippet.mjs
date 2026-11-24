import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync(new URL('../przyklady/justjoin.txt', import.meta.url), 'utf8');

const markers = [
  'container-name:offer-card',
  'job-offer/',
  'company-logos',
  'hiring-company-logos',
  '/companies/',
];

for (const marker of markers) {
  const i = html.indexOf(marker);
  if (i >= 0) {
    writeFileSync(
      new URL(`../test-scripts/justjoin-snippet-${marker.replace(/[^a-z0-9]+/gi, '-')}.html`, import.meta.url),
      html.slice(Math.max(0, i - 500), i + 8000),
      'utf8',
    );
    console.log('wrote snippet for', marker, 'at', i);
  }
}

const re = /https?:\\\/\\\/justjoin\.it\\\/job-offer\\\/[^"\\]+/g;
const escaped = [...html.matchAll(/justjoin\.it\/job-offer\/[a-z0-9-]+/g)].slice(0, 5);
console.log('slug samples', escaped.map((m) => m[0]));

const companies = [...html.matchAll(/"companyName":"([^"]+)"/g)].map((m) => m[1]);
console.log('json companyName count', companies.length, 'sample', companies.slice(0, 10));

const names = [...html.matchAll(/"name":"([^"]{2,80})"/g)]
  .map((m) => m[1])
  .filter((n) => /sp\.|Inc|Ltd|Talent|IT|Group|Solutions/i.test(n))
  .slice(0, 20);
console.log('name fields', [...new Set(names)].slice(0, 15));