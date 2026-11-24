const EMPLOYER_WEBSITE_HINTS = {
  ailleron: ['https://www.ailleron.com/pl/', 'https://www.ailleron.com/'],
  bcf: ['https://bcf-software.com/pl', 'https://bcf-software.com/'],
  mindbox: ['https://mindboxgroup.com/'],
};

const HOSTNAME_STRONG_RE =
  /(consulting|consultancy|staffing|outsourcing|talent|recruiting|advisory|advisors|bodyleasing|body-leasing)/i;

const HOMEPAGE_CONSULTING_STRONG = [
  /\bconsultative\s+guidance\b/i,
  /\btrusted\s+partner\b/i,
  /\bsoftware\s+house\b/i,
  /\bit\s+consulting\b/i,
  /\btalent\s+network\b/i,
  /\bIT\s+experts\b/i,
  /\boutsourcing\b/i,
  /\bbody\s*leasing\b/i,
  /\bteam\s+augmentation\b/i,
  /\bprovide\s+consultants\b/i,
  /\bconsultants?\s+to\s+(?:its\s+)?clients\b/i,
  /\bdedicated\s+IT\s+specialists\b/i,
  /\bnearshore\b/i,
  /\bHuman\s+\+\s+Machine\b/i,
  /\bbecome\s+one\s+of\s+us\b/i,
  /\bconnecting\s+talents\b/i,
  /\btrusted\s+r&d\s+partner\b/i,
  /\bsoftware\s+r&d\s+services\b/i,
  /\bzaufanym?\s+partnerem?\s+w\s+inżynierii\s+oprogramowania\b/i,
  /\binżynierii\s+oprogramowania\b/i,
  /\bcustom\s+software\s+development\b/i,
  /\bfinancial\s+technology\s+services\b/i,
  /\btechnology\s+services\s+for\s+(?:fintechs?|banks?)\b/i,
];

const HOMEPAGE_CONSULTING_WEAK = [
  /\bconsulting\b/i,
  /\bconsultancy\b/i,
  /\bfor\s+our\s+clients\b/i,
  /\bwhat\s+our\s+clients\s+say\b/i,
  /\btransformations?\b/i,
  /\bcompetence\s+cent(?:er|re)\b/i,
];

const websiteResultCache = new Map();

function stripDiacritics(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

export function companyToFilterKey(raw) {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let value = stripDiacritics(raw).toLowerCase();
  value = value.replace(/\b(sp\.?\s*z\.?\s*o\.?\s*o\.?|spółka\s+z\s+ograniczoną\s+odpowiedzialnością|s\.?\s*a\.?)\b/gi, ' ');
  value = value.replace(/[^a-z0-9+\-.\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = value.split(' ').filter(Boolean);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0];
  const stop = new Set(['sp', 'z', 'oo', 'sa', 'the', 'and', 'group', 'holding', 'services', 'solutions', 'software']);
  const significant = tokens.filter((t) => !stop.has(t));
  if (significant.length === 0) return tokens[0];
  if (significant.length === 1) return significant[0];
  if (significant[0] === 'it' && significant[1]) return `${significant[0]} ${significant[1]}`;

  return significant[0];
}

export function buildWebsiteCandidates(employerName) {
  const key = companyToFilterKey(employerName);
  const urls = new Set();

  if (!key) {
    return [];
  }

  const hints = EMPLOYER_WEBSITE_HINTS[key] || [];
  hints.forEach((url) => urls.add(url));

  const bases = [key, key.replace(/\s+/g, '')];
  bases.forEach((base) => {
    if (!base) return;
    urls.add(`https://${base}.com/`);
    urls.add(`https://www.${base}.com/`);
    urls.add(`https://${base}.pl/`);
    urls.add(`https://www.${base}.pl/`);
    urls.add(`https://${base}group.com/`);
    urls.add(`https://www.${base}group.com/`);
    urls.add(`https://${base}-group.com/`);
    urls.add(`https://${base}-software.com/`);
    urls.add(`https://www.${base}-software.com/`);
    urls.add(`https://${base}-software.com/pl`);
  });

  return [...urls].slice(0, 8);
}

export function hostnameIndicatesConsultancy(hostname, employerKey) {
  const host = hostname.toLowerCase();
  if (HOSTNAME_STRONG_RE.test(host)) {
    return true;
  }

  if (employerKey && /group\.(com|pl|eu|io|net)$/i.test(host) && host.includes(employerKey.replace(/\s+/g, ''))) {
    return true;
  }

  return false;
}

export function homepageTextIndicatesConsultancy(text) {
  if (!text) {
    return false;
  }

  if (HOMEPAGE_CONSULTING_STRONG.some((pattern) => pattern.test(text))) {
    return true;
  }

  const weakHits = HOMEPAGE_CONSULTING_WEAK.filter((pattern) => pattern.test(text)).length;

  return weakHits >= 3;
}

async function fetchHomepageText(url) {
  const response = await fetch(url, {
    credentials: 'omit',
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pl,en;q=0.8',
    },
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25_000);
}

export async function employerWebsitesIndicateConsultancy(employerName) {
  const key = companyToFilterKey(employerName);
  if (!key) {
    return { exclude: false };
  }

  if (websiteResultCache.has(key)) {
    return websiteResultCache.get(key);
  }

  const candidates = buildWebsiteCandidates(employerName);

  for (const url of candidates) {
    try {
      const parsed = new URL(url);
      if (hostnameIndicatesConsultancy(parsed.hostname, key.replace(/\s+/g, ''))) {
        const result = { exclude: true, reason: 'website-host', url };
        websiteResultCache.set(key, result);

        return result;
      }

      const text = await fetchHomepageText(url);
      if (!text) {
        continue;
      }

      if (homepageTextIndicatesConsultancy(text)) {
        const result = { exclude: true, reason: 'website-content', url };
        websiteResultCache.set(key, result);

        return result;
      }
    } catch {
      //
    }
  }

  const result = { exclude: false };
  websiteResultCache.set(key, result);

  return result;
}
