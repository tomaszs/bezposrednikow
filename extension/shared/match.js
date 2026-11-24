/* global window */
(function initBezposrednikowMatch(global) {
  const { normalizeCompanyName } = global.BezposrednikowNormalize;

  const DESCRIPTION_PATTERNS = [
    /\bagencj[aą]\s+rekrutacyjn[aą]/i,
    /\bfirma\s+rekrutacyjn[aą]/i,
    /\bbiu[ró]o\s+rekrutacyjne/i,
    /\bpośrednik\s+pracy/i,
    /\brekrutujemy\s+w\s+imieniu/i,
    /\bw\s+imieniu\s+naszego\s+klienta/i,
    /\bw\s+imieniu\s+klienta\b/i,
    /\bdla\s+naszego\s+klienta\b/i,
    /\bna\s+rzecz\s+(?:naszego\s+)?klienta\b/i,
    /\bnaszym\s+klientem\s+jest/i,
    /\brekrutacja\s+dla\s+klienta\b/i,
    /\bpraca\s+u\s+klienta\b/i,
    /\bpracodawca\s+ukryty/i,
    /\bbody\s*leasing\b/i,
    /\bstaffing\b/i,
    /\boutsource(?:r|ing)\b/i,
    /\brecruitment\s+agency\b/i,
    /\bfor\s+our\s+client\b/i,
    /\bfor\s+a\s+client\b/i,
    /\bon\s+behalf\s+of\s+(?:our\s+)?client\b/i,
    /\brecruiting\s+for\s+(?:our\s+)?client\b/i,
    /\bhiring\s+for\s+(?:our\s+)?client\b/i,
    /\bwe\s+are\s+recruiting\s+for\b/i,
    /\bwe\s+recruit\s+for\b/i,
  ];

  function normalizeBlockKey(key) {
    return normalizeCompanyName(key);
  }

  function employerMatchesBlocklist(employerName, blocklist) {
    const employerNorm = normalizeCompanyName(employerName);
    if (!employerNorm || !blocklist?.length) {
      return false;
    }

    return blocklist.some((entry) => {
      const key = normalizeBlockKey(entry);
      if (!key) {
        return false;
      }

      if (employerNorm === key) {
        return true;
      }

      if (employerNorm.startsWith(`${key} `) || employerNorm.startsWith(key)) {
        return true;
      }

      return employerNorm.includes(` ${key} `) || employerNorm.endsWith(` ${key}`);
    });
  }

  const CONSULTING_COMPANY_STRONG = [
    /\bconsultative\s+guidance\b/i,
    /\btrusted\s+partner\s+to\b/i,
    /\bit\s+consulting\b/i,
    /\btechnology\s+consulting\b/i,
    /\bmanagement\s+consulting\b/i,
    /\bsoftware\s+house\b/i,
    /\bbody\s*leasing\b/i,
    /\boutsourcing\s+(?:it|of\s+it|software)\b/i,
    /\bfirma\s+konsultingowa\b/i,
    /\bi\s+outsourcing\b/i,
    /\bsystem\s+integrator\b/i,
    /\bnearshore\s+(?:development|services|team)\b/i,
    /\bteam\s+augmentation\b/i,
    /\brealizujemy\s+projekty\s+dla\s+klientów\b/i,
    /\bprojekty\s+dla\s+klientów\s+zewnętrznych\b/i,
    /\bświadczy(?:my|ć)\s+usługi\s+(?:it\s+)?dla\s+klientów\b/i,
    /\basset\s+managers?\s+&\s+financial\s+institutions\b/i,
    /\binvestor\s+services\b/i,
    /\bdepositary\s+&\s+trustee\b/i,
    /\btransfer\s+agency\b/i,
    /\bcustody,?\s+global\s+tax\s+services\b/i,
    /\bnowoczesne\s+oprogramowanie\s+dla\s+liderów\b/i,
    /\boprogramowanie\s+dla\s+liderów\s+z\s+branży\b/i,
    /\btworzy\s+produkty\s+własne\s+oraz\b/i,
    /\bnapędzają\s+takich\s+światowych\b/i,
    /\bcustom\s+software\s+development\b/i,
    /\btechnology\s+services\s+for\s+(?:fintechs?|banks?)\b/i,
    /\bfinancial\s+technology\s+services\b/i,
  ];

  const CONSULTING_COMPANY_WEAK = [
    /\bconsulting\b/i,
    /\bconsultancy\b/i,
    /\bconsultan(?:t|cy)\s+services\b/i,
    /\bfinancial\s+services\s+firm\b/i,
    /\bdoradztwo\b/i,
    /\bkonsulting\b/i,
    /\bpartnerstwo\s+z\s+klientami\b/i,
    /\bclient\s+partnerships?\b/i,
    /\bsuite\s+of\s+solutions\b/i,
    /\bpartner(?:ship)?\s+approach\s+to\s+client\b/i,
    /\bsophisticated\s+clients\b/i,
    /\brealizacja\s+projektów\s+dedykowanych\b/i,
    /\brozwiązania\s+dla\s+klientów\b/i,
  ];

  function textLooksLikeAgencyOffer(text) {
    if (!text) {
      return false;
    }

    return DESCRIPTION_PATTERNS.some((pattern) => pattern.test(text));
  }

  function textLooksLikeConsultingCompany(text) {
    if (!text) {
      return false;
    }

    if (CONSULTING_COMPANY_STRONG.some((pattern) => pattern.test(text))) {
      return true;
    }

    const weakHits = CONSULTING_COMPANY_WEAK.filter((pattern) => pattern.test(text)).length;

    return weakHits >= 2;
  }

  function getExclusionReason(text) {
    if (textLooksLikeAgencyOffer(text)) {
      return 'agency';
    }

    if (textLooksLikeConsultingCompany(text)) {
      return 'consulting';
    }

    return null;
  }

  function textShouldExcludeOffer(text) {
    return getExclusionReason(text) !== null;
  }

  global.BezposrednikowMatch = {
    employerMatchesBlocklist,
    textLooksLikeAgencyOffer,
    textLooksLikeConsultingCompany,
    textShouldExcludeOffer,
    getExclusionReason,
    DESCRIPTION_PATTERNS,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
