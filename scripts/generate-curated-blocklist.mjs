import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { exclude } = JSON.parse(readFileSync(join(__dirname, 'blocklist-candidates.json'), 'utf8'));

const FALSE_POSITIVE_KEYS = new Set(
  [
    'grupa',
    'bank',
    'decathlon',
    'polenergia',
    'nordea',
    'shiji',
    'kuchnia',
    'sportradar',
    'hitachi',
    'pkp',
    'volkswagen',
    'radmor',
    'apator',
    'schaeffler',
    'benefit',
    'empik',
    'rainbow',
    'lux',
    'velobank',
    'transfer',
    'uniwersytet',
    'mazowiecka',
    'p.t.h.',
    'technipfmc',
    'mikarco',
    'chaos',
    'banqsoft',
    'creditexpress',
    'datagroup',
    'netcompany',
    'arp',
    'e80',
    '96',
    'vts',
    'wazdan',
    'tailoredbyte',
    'kaft',
    'micro',
    'exorigo',
    'betasi',
    'idealny',
    'kambu',
    'blackburst',
    'qpexa',
    'tuz',
    'pse',
    'lufthansa',
    'p.u.h',
    'emplo',
    'wincan',
  ].map((k) => k.toLowerCase()),
);

const MANUAL_LABELS = [
  'Accenture',
  'Antal',
  'Avenga',
  'Ciklum',
  'Cognizant',
  'Devire',
  'Endava',
  'Experis',
  'Grafton',
  'Grid Dynamics',
  'Hays',
  'IBM',
  'Infosys',
  'Luxoft',
  'Manpower',
  'Michael Page',
  'Objectivity',
  'Software Mind',
  'Transition Technologies',
  'Wipro',
  'TCS',
  'State Street',
  'Spyrosoft',
  'Holisticon',
  'CGI',
  'Reply',
  'Winged IT',
  'Next Technology',
];

function keyToLabel(key, employer) {
  if (employer) {
    const cleaned = employer
      .replace(/\s+SPÓŁKA.*$/i, '')
      .replace(/\s+Sp\.?\s*z\.?\s*o\.?\s*o\.?.*$/i, '')
      .replace(/\s+S\.?\s*A\.?.*$/i, '')
      .trim();
    if (cleaned.length > 0 && cleaned.length <= 36) {
      return cleaned;
    }
  }

  return key
    .split(' ')
    .map((w) => (w.length <= 4 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

const labelSet = new Set();

for (const row of exclude) {
  if (FALSE_POSITIVE_KEYS.has(row.key.toLowerCase())) {
    continue;
  }

  labelSet.add(keyToLabel(row.key, row.employer));
}

MANUAL_LABELS.forEach((label) => labelSet.add(label));

const normalizeLabel = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const seen = new Set();
const sorted = [...labelSet]
  .filter((label) => {
    const n = normalizeLabel(label);
    if (seen.has(n)) return false;
    seen.add(n);

    return true;
  })
  .sort((a, b) => a.localeCompare(b, 'pl', { sensitivity: 'base' }));

const fileContent = `/**
 * Curated agencies, recruiters, and IT consultancies on it.pracuj.pl.
 * Built via npm run build:blocklist && npm run build:curated
 */
export const CURATED_BLOCKLIST = ${JSON.stringify(sorted, null, 2)};
`;

writeFileSync(join(__dirname, '..', 'extension', 'shared', 'curated-blocklist.js'), fileContent);

console.log(`Curated blocklist: ${sorted.length} entries`);
