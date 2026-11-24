import {
  buildWebsiteCandidates,
  companyToFilterKey,
  employerWebsitesIndicateConsultancy,
  homepageTextIndicatesConsultancy,
  hostnameIndicatesConsultancy,
} from './lib/website-fetch.mjs';

const mindboxCandidates = buildWebsiteCandidates('Mindbox Sp. z o.o.');
if (!mindboxCandidates.some((u) => u.includes('mindboxgroup.com'))) {
  console.error('Missing mindboxgroup.com candidate', mindboxCandidates);
  process.exit(1);
}

if (!hostnameIndicatesConsultancy('mindboxgroup.com', 'mindbox')) {
  console.error('mindboxgroup.com hostname should indicate consultancy');
  process.exit(1);
}

const sampleHomepage =
  'TALENT NETWORK. Great technology needs great people. connecting talents with your needs. IT experts powering projects.';

if (!homepageTextIndicatesConsultancy(sampleHomepage)) {
  console.error('Sample homepage text should indicate consultancy');
  process.exit(1);
}

console.log('Static website checks ok. Key:', companyToFilterKey('Mindbox Sp. z o.o.'));

const live = await employerWebsitesIndicateConsultancy('Mindbox Sp. z o.o.');
console.log('Live Mindbox check:', live);

if (!live.exclude) {
  console.error('Expected mindboxgroup.com to flag Mindbox as consultancy');
  process.exit(1);
}

const bcf = await employerWebsitesIndicateConsultancy('BCF Software Sp. z o.o.');
console.log('Live BCF check:', bcf);

if (!bcf.exclude) {
  console.error('Expected bcf-software.com to flag BCF as consultancy');
  process.exit(1);
}

const ailleron = await employerWebsitesIndicateConsultancy('Ailleron');
console.log('Live Ailleron check:', ailleron);

if (!ailleron.exclude) {
  console.error('Expected ailleron.com to flag Ailleron as consultancy');
  process.exit(1);
}

console.log('Website tests passed.');
