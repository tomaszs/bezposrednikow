/* global window */
(function initBezposrednikowPracujDom(global) {
  function employerNameFromLogoTitle(title) {
    if (!title) {
      return '';
    }

    const profileMatch = title.match(/profil pracodawcy\s+(.+)/i);
    if (profileMatch) {
      return profileMatch[1].trim();
    }

    return '';
  }

  function getEmployerFromTile(tile) {
    const logoLink = tile.querySelector('[data-test="link-company-logo"]');
    const fromLogo = employerNameFromLogoTitle(logoLink?.title);
    if (fromLogo) {
      return fromLogo;
    }

    const profileLink = tile.querySelector('[data-test="link-company-profile"], [data-test="link-check-company-profile"]');
    if (profileLink?.textContent?.trim()) {
      return profileLink.textContent.trim();
    }

    const companyName = tile.querySelector('[data-test="text-company-name"]');
    if (companyName?.textContent?.trim()) {
      return companyName.textContent.trim();
    }

    const companySection = tile.querySelector('[data-test="section-company"]');
    if (companySection?.textContent?.trim()) {
      return companySection.textContent.trim();
    }

    const banner = tile.querySelector('[data-test="mobile-banner"]');
    const bannerAlt = banner?.getAttribute('alt') || '';
    const bannerMatch = bannerAlt.match(/^banner\s+(.+)/i);
    if (bannerMatch) {
      return bannerMatch[1].trim();
    }

    return '';
  }

  function getEmployerFromDetailPage() {
    const nameEl =
      document.querySelector('[data-test="text-employer-name"]') ||
      document.querySelector('[data-test="text-company-name"]');
    if (nameEl?.textContent?.trim()) {
      return nameEl.textContent.trim();
    }

    const logoLink = document.querySelector('[data-test="link-company-logo"]');
    const fromLogo = employerNameFromLogoTitle(logoLink?.title);
    if (fromLogo) {
      return fromLogo;
    }

    return '';
  }

  function resolveOfferTileRoot(node) {
    const positioned = node.closest('[data-test="positioned-offer"]');
    if (positioned) {
      return positioned;
    }

    const defaultOffer = node.closest('[data-test="default-offer"]');
    if (defaultOffer) {
      return defaultOffer;
    }

    let current = node.parentElement;
    while (current && current !== document.body) {
      if (current.querySelectorAll('[data-test="link-offer"]').length === 1 && current.querySelector('[data-test="mobile-banner"]')) {
        return current;
      }

      current = current.parentElement;
    }

    const inner = node.closest('[class*="offer-tile_"]');
    if (inner?.parentElement?.querySelector('[data-test="mobile-banner"]')) {
      return inner.parentElement;
    }

    return node.closest('[class*="offer-tile"]') || node.parentElement;
  }

  function collectOfferTiles(root) {
    const scope = root || document;
    const containers = new Set();

    scope.querySelectorAll('[data-test="positioned-offer"], [data-test="default-offer"]').forEach((offer) => {
      containers.add(offer);
    });

    scope.querySelectorAll('[data-test="link-company-logo"], [data-test="link-offer"]').forEach((node) => {
      const container = resolveOfferTileRoot(node);
      if (container) {
        containers.add(container);
      }
    });

    return [...containers];
  }

  global.BezposrednikowPracujDom = {
    collectOfferTiles,
    getEmployerFromDetailPage,
    getEmployerFromTile,
    resolveOfferTileRoot,
  };
})(typeof window !== 'undefined' ? window : globalThis);