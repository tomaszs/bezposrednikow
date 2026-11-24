/* global window */
(function initBezposrednikowNormalize(global) {
  const LEGAL_SUFFIX_RE =
    /\b(sp\.?\s*z\.?\s*o\.?\s*o\.?|spółka\s+z\s+ograniczoną\s+odpowiedzialnością|sp\.?\s*k\.?|s\.?\s*a\.?|sp\.?\s*j\.?|z\s+o\.?\s*o\.?)\b/gi;

  const TRAILING_REGION_RE = /\b(polska|poland|polska\s+sp\.?\s*z\.?\s*o\.?\s*o\.?)\b/gi;

  function stripDiacritics(value) {
    return value.normalize('NFD').replace(/\p{M}/gu, '');
  }

  function normalizeCompanyName(raw) {
    if (!raw || typeof raw !== 'string') {
      return '';
    }

    let value = stripDiacritics(raw).toLowerCase();
    value = value.replace(LEGAL_SUFFIX_RE, ' ');
    value = value.replace(TRAILING_REGION_RE, ' ');
    value = value.replace(/[^a-z0-9+&.\-\s]/g, ' ');
    value = value.replace(/\s+/g, ' ').trim();

    return value;
  }

  /** Short label for UI and blocklist keys, e.g. "ITDS Polska Sp. z o.o." → "ITDS" */
  function companyToFilterKey(raw) {
    const normalized = normalizeCompanyName(raw);
    if (!normalized) {
      return '';
    }

    const tokens = normalized.split(' ').filter(Boolean);
    if (tokens.length === 0) {
      return '';
    }

    if (tokens.length === 1) {
      return tokens[0];
    }

    const stop = new Set(['sp', 'z', 'oo', 'sa', 'the', 'and', 'group', 'holding', 'services', 'solutions', 'software']);
    const significant = tokens.filter((t) => !stop.has(t));

    if (significant.length === 0) {
      return tokens[0];
    }

    if (significant.length === 1) {
      return significant[0];
    }

    if (significant[0] === 'it' && significant[1]) {
      return `${significant[0]} ${significant[1]}`;
    }

    return significant[0];
  }

  global.BezposrednikowNormalize = {
    normalizeCompanyName,
    companyToFilterKey,
    stripDiacritics,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
