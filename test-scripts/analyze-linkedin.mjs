import { readFileSync } from 'fs';

const html = readFileSync(new URL('../przyklady/linkedin.txt', import.meta.url), 'utf8');

const patterns = [
  'data-job-id',
  'job-search-card',
  'base-search-card',
  'jobs-search__results-list',
  'job-card-container',
  'entity-result',
  'data-entity-urn',
  'artdeco-entity-lockup__subtitle',
  'job-details-jobs-unified-top-card',
  'data-view-name',
  'job-card-list',
  'semantic-search-results-list',
];

for (const p of patterns) {
  const count = (html.match(new RegExp(p, 'g')) || []).length;
  console.log(`${p}: ${count}`);
}

const viewNames = [
  ...new Set([...html.matchAll(/data-view-name="([^"]+)"/g)].map((m) => m[1])),
].filter((n) => /job/i.test(n));

console.log('\njob-related data-view-name:', viewNames.join(', '));

const companySpans = [
  ...html.matchAll(/class="[^"]*artdeco-entity-lockup__subtitle[^"]*"[^>]*>([^<]+)</g),
].slice(0, 15);

console.log('\nlockup subtitle samples:');
companySpans.forEach((m) => console.log(' -', m[1].trim()));

const jobLinks = [...html.matchAll(/href="([^"]*\/jobs\/view\/[^"]+)"/g)].slice(0, 5);
console.log('\njob link samples:', jobLinks.map((m) => m[1]));

const componentDl = [...html.matchAll(/data-testid="([^"]+)"/g)];
const testIds = [...new Set(componentDl.map((m) => m[1]))];
console.log('\ndata-testid count', testIds.length);
console.log(testIds.filter((t) => /job|company|entity|result|search/i.test(t)).slice(0, 50).join('\n'));

const ariaLabels = [...html.matchAll(/aria-label="([^"]{5,120})"/g)]
  .map((m) => m[1])
  .filter((l) => /job|company|hiring/i.test(l))
  .slice(0, 30);
console.log('\naria-label samples:\n', ariaLabels.join('\n'));

const components = [...new Set([...html.matchAll(/componentkey="([^"]+)"/gi)].map((m) => m[1]))];
console.log('\ncomponentkey job-ish:', components.filter((c) => /job|search|company/i.test(c)).slice(0, 30));

const classHits = [...new Set([...html.matchAll(/class="([^"]{1,200})"/g)].map((m) => m[1]))]
  .filter((c) => /job|search|result|entity|lockup|subtitle|company/i.test(c))
  .slice(0, 40);
console.log('\nrelevant classes:\n', classHits.join('\n'));

const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
console.log('\npage title:', titleMatch?.[1]);

const cardIdx = html.indexOf('job-card-component-ref-4487725454');
if (cardIdx >= 0) {
  console.log('\n--- snippet around first job card ---\n');
  console.log(html.slice(cardIdx - 200, cardIdx + 3500));
}

const companyHints = [...html.matchAll(/>([A-Za-z0-9][^<]{1,80}(?:sp\. z o\.o\.|Sp\. z o\.o\.|Ltd\.|GmbH|Inc\.|Group|Talent|IT|Tech)[^<]{0,40})</g)]
  .map((m) => m[1].trim())
  .filter((t) => !t.includes('{') && t.length < 90)
  .slice(0, 40);
console.log('\ncompany-ish text nodes:', [...new Set(companyHints)].slice(0, 25));

const cardIds = [
  ...new Set([...html.matchAll(/componentkey="(job-card-component-ref-\d+)"/g)].map((m) => m[1])),
];
console.log('\nunique job cards', cardIds.length);

function employerFromCardChunk(chunk) {
  const companyLink = chunk.match(/href="https:\/\/www\.linkedin\.com\/company\/[^"]*"[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>/i);
  if (companyLink?.[1]) {
    return companyLink[1].replace(/&amp;/g, '&').trim();
  }

  const linkAria = chunk.match(/aria-label="View [^"]+ at ([^"]+)"/i);
  if (linkAria?.[1]) {
    return linkAria[1].trim();
  }

  const ps = [...chunk.matchAll(/<p class="dr0jq5 dr0jwr[^"]*">([^<]+)<\/p>/g)].map((m) =>
    m[1].replace(/&amp;/g, '&').trim(),
  );
  const locationLike = /\(|\bremote\b|\bhybrid\b|\bpoland\b|\bukraine\b|, /i;
  const candidate = ps.find((t) => t && !locationLike.test(t));

  return candidate || '';
}

for (const id of cardIds.slice(0, 15)) {
  const i = html.indexOf(`componentkey="${id}"`);
  const chunk = html.slice(i, i + 6000);
  const employer = employerFromCardChunk(chunk);
  const dismiss = chunk.match(/aria-label="Dismiss ([^"]+) job"/)?.[1];
  const companyHrefs = [...chunk.matchAll(/href="([^"]*\/company\/[^"]+)"/g)].map((m) => m[1]).slice(0, 2);
  console.log({ dismiss, employer, companyHrefs });
}

const detailIdx = html.indexOf('jobs-unified-top-card') >= 0 ? html.indexOf('jobs-unified-top-card') : html.indexOf('SearchResultsMainContent');
const detailChunk = html.slice(-80000);
const topTitle = detailChunk.match(/<title>([^<]+)<\/title>/);
console.log('\ndetail/title area:', topTitle?.[1]);
const orgLinks = [...detailChunk.matchAll(/href="([^"]*\/company\/[^"]+)"/g)].slice(0, 5).map((m) => m[1]);
console.log('company links in tail:', orgLinks);