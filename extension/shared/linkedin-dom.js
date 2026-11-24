/* global window */
(function initBezposrednikowLinkedinDom(global) {
  const LOCATION_PATTERN =
    /\([^)]{2,}\)|,\s*(?:poland|portugal|germany|france|spain|italy|uk|united states|india|canada|netherlands|belgium|cyprus|remote|hybrid)/i;

  function decodeHtml(text) {
    return (text || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  }

  function looksLikeLocation(text) {
    const value = decodeHtml(text);
    if (!value) {
      return true;
    }

    if (/\b(remote|hybrid|on-site|onsite|reposted)\b/i.test(value)) {
      return true;
    }

    if (LOCATION_PATTERN.test(value)) {
      return true;
    }

    if (/^\d+\s+(?:applicant|alumni)/i.test(value)) {
      return true;
    }

    if (value.includes('·')) {
      return true;
    }

    return false;
  }

  function jobTitleFromDismiss(tile) {
    const dismiss = tile.querySelector('button[aria-label^="Dismiss "]')?.getAttribute('aria-label');
    if (!dismiss) {
      return '';
    }

    const match = dismiss.match(/^Dismiss\s+(.+?)\s+job$/i);
    if (!match) {
      return '';
    }

    return decodeHtml(match[1]);
  }

  function isDuplicateJobTitle(text, jobTitle) {
    if (!jobTitle || !text) {
      return false;
    }

    if (text === jobTitle) {
      return true;
    }

    if (text === `${jobTitle}${jobTitle}`) {
      return true;
    }

    return text.startsWith(jobTitle) && text.length <= jobTitle.length * 2 + 4;
  }

  function employerFromCompanyLink(link) {
    if (!link) {
      return '';
    }

    const text = decodeHtml(link.textContent);
    if (text && !looksLikeLocation(text)) {
      return text;
    }

    const aria = link.getAttribute('aria-label') || '';
    const atMatch = aria.match(/\bat\s+(.+?)(?:\s+logo|\s+company|$)/i);
    if (atMatch) {
      return decodeHtml(atMatch[1]);
    }

    const viewMatch = aria.match(/view\s+(.+?)\s+company/i);
    if (viewMatch) {
      return decodeHtml(viewMatch[1]);
    }

    return '';
  }

  function getEmployerFromTile(tile) {
    const companyLinks = tile.querySelectorAll('a[href*="/company/"]');
    for (const link of companyLinks) {
      const employer = employerFromCompanyLink(link);
      if (employer) {
        return employer;
      }
    }

    const ariaEmployer = tile.querySelector('[aria-label*=" at "]');
    if (ariaEmployer) {
      const label = ariaEmployer.getAttribute('aria-label') || '';
      const match = label.match(/\bat\s+(.+?)(?:\s+with|\s+logo|$)/i);
      if (match) {
        return decodeHtml(match[1]);
      }
    }

    const subtitle = tile.querySelector('.artdeco-entity-lockup__subtitle');
    if (subtitle?.textContent?.trim()) {
      const employer = decodeHtml(subtitle.textContent);
      if (!looksLikeLocation(employer)) {
        return employer;
      }
    }

    const jobTitle = jobTitleFromDismiss(tile);

    const companyParagraph = tile.querySelector(
      'p[class*="dr0ewa"], p.job-card-container__company-name, .artdeco-entity-lockup__subtitle',
    );
    if (companyParagraph?.textContent?.trim()) {
      const employer = decodeHtml(companyParagraph.textContent);
      if (!isDuplicateJobTitle(employer, jobTitle) && !looksLikeLocation(employer)) {
        return employer;
      }
    }

    const paragraphs = [...tile.querySelectorAll('p')]
      .filter((node) => !(node.className || '').includes('jww'))
      .map((node) => decodeHtml(node.textContent))
      .filter(Boolean);

    for (const text of paragraphs) {
      if (isDuplicateJobTitle(text, jobTitle)) {
        continue;
      }

      if (!looksLikeLocation(text)) {
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

    if (parts.length >= 3 && /linkedin/i.test(parts[parts.length - 1])) {
      return parts[parts.length - 2];
    }

    return '';
  }

  function getEmployerFromDetailView() {
    const fromTitle = getEmployerFromPageTitle();
    if (fromTitle) {
      return fromTitle;
    }

    const selectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name a',
      '.jobs-details-top-card__company-url',
      'a[href*="/company/"]',
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const employer = employerFromCompanyLink(node);
      if (employer) {
        return employer;
      }
    }

    return '';
  }

  function collectOfferTiles(root) {
    const scope = root || document;
    const containers = new Set();

    scope.querySelectorAll('div[role="button"][componentkey^="job-card-component-ref-"]').forEach((node) => {
      containers.add(node);
    });

    const legacySelectors = [
      '.job-card-container',
      'li[data-occludable-job-id]',
      'li.jobs-search-results__list-item',
      'div.job-search-card',
      'div.base-card',
    ];

    legacySelectors.forEach((selector) => {
      scope.querySelectorAll(selector).forEach((node) => containers.add(node));
    });

    return [...containers];
  }

  function detailContainers() {
    return [
      document.querySelector('.jobs-search__job-details--container'),
      document.querySelector('.jobs-search__job-details'),
      document.querySelector('.jobs-details'),
      document.querySelector('.job-view-layout'),
      document.querySelector('main .scaffold-layout__detail'),
    ].filter(Boolean);
  }

  global.BezposrednikowLinkedinDom = {
    collectOfferTiles,
    detailContainers,
    getEmployerFromDetailView,
    getEmployerFromPageTitle,
    getEmployerFromTile,
    looksLikeLocation,
  };
})(typeof window !== 'undefined' ? window : globalThis);