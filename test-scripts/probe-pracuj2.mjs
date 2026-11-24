import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const html = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../przyklady/pracuj2.txt'), 'utf8');

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'domcontentloaded' });

const result = await page.evaluate(() => {
  function getTileContainerOld(linkOffer) {
    const inner = linkOffer.closest('[class*="offer-tile_cnf6am"]');
    if (!inner?.parentElement) return linkOffer.closest('[class*="offer-tile"]');
    const parent = inner.parentElement;
    if (parent.querySelector('[data-test="mobile-banner"]')) return parent;
    return inner.parentElement.closest('[class*="offer-tile"]') || inner.parentElement;
  }

  function getTileContainerNew(linkOffer) {
    let node = linkOffer;
    let best = linkOffer.closest('[class*="offer-tile"]');
    while (node) {
      const banner = node.querySelector(':scope > [data-test="mobile-banner"], :scope[data-test="mobile-banner"]');
      const offers = node.querySelectorAll('[data-test="link-offer"]');
      if (offers.length === 1 && (banner || node.matches('[data-test="mobile-banner"]'))) {
        best = node;
      }
      if (offers.length === 1 && node.querySelector('[data-test="mobile-banner"]')) {
        best = node;
      }
      node = node.parentElement;
    }

    return best;
  }

  function getTileContainerBannerParent(linkOffer) {
    const banner = linkOffer.closest('[class*="offer-tile"]')?.parentElement?.querySelector('[data-test="mobile-banner"]');
    if (banner) {
      return banner.closest('[class*="offer-tile"]')?.parentElement || banner.parentElement;
    }

    let node = linkOffer.parentElement;
    while (node) {
      const prev = node.previousElementSibling;
      if (prev?.matches?.('[data-test="mobile-banner"]')) {
        return node.parentElement || node;
      }

      if (node.querySelector('[data-test="mobile-banner"]') && node.querySelectorAll('[data-test="link-offer"]').length === 1) {
        const bannerEl = node.querySelector('[data-test="mobile-banner"]');
        const root = bannerEl?.parentElement === node ? node : node.closest('[class*="offer-tile"]')?.parentElement;
        if (root) return root;
      }

      node = node.parentElement;
    }

    return linkOffer.closest('[class*="offer-tile"]');
  }

  const links = [...document.querySelectorAll('[data-test="link-offer"]')].slice(0, 5);

  const altenLink = [...document.querySelectorAll('[data-test="link-company-logo"]')].find((a) =>
    /alten/i.test(a.title || ''),
  );

  function employer(tile) {
    const logo = tile?.querySelector('[data-test="link-company-logo"]');
    const m = logo?.title?.match(/profil pracodawcy\s+(.+)/i);
    return m?.[1] || '';
  }

  const tests = [...new Set([...document.querySelectorAll('[data-test]')].map((el) => el.getAttribute('data-test')))].filter(
    (t) => /offer|position|default|tile/i.test(t),
  );

  return {
    offerTests: tests,
    positioned: document.querySelectorAll('[data-test="positioned-offer"]').length,
    defaultOffer: document.querySelectorAll('[data-test="default-offer"]').length,
    bannerTiles: document.querySelectorAll('[data-test="mobile-banner"]').length,
    linkCount: document.querySelectorAll('[data-test="link-offer"]').length,
    samples: links.map((link) => ({
      old: employer(getTileContainerOld(link)),
      new: employer(getTileContainerNew(link)),
      bannerParent: employer(getTileContainerBannerParent(link)),
    })),
    alten: altenLink
      ? {
          title: altenLink.title,
          logoEmployer: altenLink.title.match(/profil pracodawcy\s+(.+)/i)?.[1],
          ancestors: (() => {
            const chain = [];
            let n = altenLink;
            for (let i = 0; i < 8 && n; i += 1) {
              chain.push({
                tag: n.tagName,
                class: n.className?.slice?.(0, 80),
                test: n.getAttribute('data-test'),
                offers: n.querySelectorAll?.('[data-test="link-offer"]')?.length,
                banner: Boolean(n.querySelector?.('[data-test="mobile-banner"]')),
              });
              n = n.parentElement;
            }
            return chain;
          })(),
        }
      : null,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();