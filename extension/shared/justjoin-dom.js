/* global window */
(function initBezposrednikowJustjoinDom(global) {
  const METADATA_PATTERN =
    /^(remote|hybrid|office|b2b|permanent|any|full[- ]?time|part[- ]?time|contract|freelance|undisclosed)/i;

  const SENIORITY_PATTERN = /^(senior|mid|junior|lead|c-level|intern|regular)$/i;

  function decodeHtml(text) {
    return (text || '').replace(/&amp;/g, '&').trim();
  }

  function looksLikeMetadata(text) {
    const value = decodeHtml(text);
    if (!value) {
      return true;
    }

    if (METADATA_PATTERN.test(value)) {
      return true;
    }

    if (SENIORITY_PATTERN.test(value)) {
      return true;
    }

    if (/\d+\s*-\s*\d+/.test(value)) {
      return true;
    }

    if (/pln|eur|usd|\/h|\/month|monthly|hourly/i.test(value)) {
      return true;
    }

    if (/^\d+[\s\u00a0]/.test(value)) {
      return true;
    }

    return false;
  }

  function isOfferCard(node) {
    if (!node || node === document.body) {
      return false;
    }

    return getComputedStyle(node).containerName === 'offer-card';
  }

  function offerCardFromLink(link) {
    let node = link.parentElement;

    while (node) {
      if (isOfferCard(node)) {
        return node;
      }

      node = node.parentElement;
    }

    return link.closest('a[href*="/job-offer/"]') || link;
  }

  function collectOfferTiles(root) {
    const scope = root || document;
    const tiles = new Set();

    scope.querySelectorAll('a[href*="/job-offer/"]').forEach((link) => {
      if (link.getAttribute('href')?.includes('/job-offers')) {
        return;
      }

      tiles.add(offerCardFromLink(link));
    });

    return [...tiles];
  }

  function employerFromLogoImg(tile) {
    const imgs = [...tile.querySelectorAll('img[alt]')];
    for (const img of imgs) {
      const alt = decodeHtml(img.getAttribute('alt'));
      if (alt && !looksLikeMetadata(alt) && alt.length > 1) {
        return alt;
      }
    }

    return '';
  }

  function getEmployerFromTile(tile) {
    const companyLink = tile.querySelector('a[href*="/companies/"], a[href*="/company/"]');
    if (companyLink?.textContent?.trim()) {
      const employer = decodeHtml(companyLink.textContent);
      if (!looksLikeMetadata(employer)) {
        return employer;
      }
    }

    const fromLogo = employerFromLogoImg(tile);
    if (fromLogo) {
      return fromLogo;
    }

    const texts = [...tile.querySelectorAll('span, p')]
      .map((node) => decodeHtml(node.textContent))
      .filter(Boolean);

    for (const text of texts) {
      if (looksLikeMetadata(text)) {
        continue;
      }

      if (text.length >= 2 && text.length <= 120) {
        return text;
      }
    }

    return '';
  }

  function getEmployerFromPageTitle() {
    const parts = (document.title || '')
      .split('|')
      .map((part) => decodeHtml(part))
      .filter(Boolean);

    if (parts.length >= 2 && /just join it/i.test(parts[parts.length - 1])) {
      if (parts.length >= 3) {
        return parts[parts.length - 2];
      }

      const lead = parts[0];
      const atSplit = lead.split(' @ ');
      if (atSplit.length >= 2) {
        return atSplit[atSplit.length - 1].trim();
      }

      const dashSplit = lead.split(' - ');
      if (dashSplit.length >= 2 && !/job offers/i.test(lead)) {
        return dashSplit[dashSplit.length - 1].trim();
      }
    }

    return '';
  }

  function getEmployerFromDetailView() {
    const fromTitle = getEmployerFromPageTitle();
    if (fromTitle && !/job offers/i.test(fromTitle)) {
      return fromTitle;
    }

    const main = document.querySelector('main') || document.body;
    const companyLink = main.querySelector('a[href*="/companies/"], a[href*="/company/"]');
    if (companyLink?.textContent?.trim()) {
      const employer = decodeHtml(companyLink.textContent);
      if (!looksLikeMetadata(employer)) {
        return employer;
      }
    }

    const fromLogo = employerFromLogoImg(main);
    if (fromLogo) {
      return fromLogo;
    }

    return '';
  }

  function detailContainers() {
    return [document.querySelector('main')].filter(Boolean);
  }

  global.BezposrednikowJustjoinDom = {
    collectOfferTiles,
    detailContainers,
    getEmployerFromDetailView,
    getEmployerFromPageTitle,
    getEmployerFromTile,
    offerCardFromLink,
  };
})(typeof window !== 'undefined' ? window : globalThis);