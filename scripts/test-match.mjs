import { createContext, runInContext } from 'vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ext = join(__dirname, '..', 'extension', 'shared');

const sandbox = { window: {} };
sandbox.window = sandbox;
const context = createContext(sandbox);
runInContext(readFileSync(join(ext, 'normalize.js'), 'utf8'), context);
runInContext(readFileSync(join(ext, 'match.js'), 'utf8'), context);

const { BezposrednikowNormalize, BezposrednikowMatch } = sandbox.window;
const { companyToFilterKey } = BezposrednikowNormalize;
const { employerMatchesBlocklist, textLooksLikeConsultingCompany, textShouldExcludeOffer } = BezposrednikowMatch;

const blocklist = ['ITDS', 'Devapo', 'IT CONNECT', 'NESS'];

const cases = [
  ['ITDS Polska Sp. z o.o.', true, 'ITDS'],
  ['DEVAPO SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', true, 'Devapo'],
  ['IT CONNECT Sp. z o.o. Sp. k.', true, 'IT CONNECT'],
  ['NESS SOLUTION sp. z o.o.', true, 'NESS'],
  ['Mindbox Sp. z o.o.', false, 'Mindbox'],
  ['Google', false, 'Google'],
];

const textCases = [
  ['We are hiring for our client in Warsaw.', true],
  ['Join our product team building payments.', false],
  ['Rekrutujemy w imieniu naszego klienta.', true],
  ['For our client we need a Senior Developer.', true],
];

const consultingCases = [
  [
    'As a trusted partner to global asset managers & financial institutions, Investor Services provides thoughtful, consultative guidance.',
    true,
  ],
  [
    'Brown Brothers Harriman (BBH) is a premier global financial services firm. We work with sophisticated clients.',
    true,
  ],
  ['We ship features for our own SaaS product used by thousands of merchants.', false],
  [
    'Ailleron to firma, która tworzy produkty własne oraz nowoczesne oprogramowanie dla liderów z branży bankowej. Napędzają takich światowych gigantów jak mBank.',
    true,
  ],
];

const { textLooksLikeAgencyOffer } = BezposrednikowMatch;

let failed = 0;
for (const [text, expected] of textCases) {
  const match = textShouldExcludeOffer(text);
  if (match !== expected) {
    failed += 1;
    console.error('FAIL text', { text, expected, match });
  } else {
    console.log('ok text', text.slice(0, 50));
  }
}

for (const [text, expected] of consultingCases) {
  const match = textLooksLikeConsultingCompany(text);
  if (match !== expected) {
    failed += 1;
    console.error('FAIL consulting', { text: text.slice(0, 80), expected, match });
  } else {
    console.log('ok consulting', text.slice(0, 55));
  }
}

for (const [employer, expected, label] of cases) {
  const key = companyToFilterKey(employer);
  const match = employerMatchesBlocklist(employer, blocklist);
  const ok = match === expected;
  if (!ok) {
    failed += 1;
    console.error('FAIL', { employer, expected, match, key });
  } else {
    console.log('ok', label, '→', key);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log('All match tests passed.');
