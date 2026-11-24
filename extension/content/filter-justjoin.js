(function initBezposrednikowJustjoinFilter() {
  const { companyToFilterKey } = BezposrednikowNormalize;
  const { employerMatchesBlocklist } = BezposrednikowMatch;
  const { collectOfferTiles, detailContainers, getEmployerFromDetailView, getEmployerFromTile } =
    BezposrednikowJustjoinDom;

  const STORAGE_KEYS = {
    blocklist: 'blocklist',
    enabled: 'enabled',
  };

  const HIDDEN_ATTR = 'data-bezposrednikow-hidden';
  const PROCESSED_ATTR = 'data-bezposrednikow-processed';
  const DETAIL_NOTICE_ID = 'bezposrednikow-justjoin-detail-notice';

  let settings = { blocklist: [], enabled: true };
  let observer = null;
  let filterScheduled = false;

  function isJobsPage() {
    const path = location.pathname;

    return path.startsWith('/job-offers') || path.startsWith('/job-offer/');
  }

  function isOfferDetailPage() {
    return location.pathname.startsWith('/job-offer/') && !location.pathname.startsWith('/job-offers');
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.blocklist, STORAGE_KEYS.enabled], (data) => {
        settings = {
          blocklist: Array.isArray(data[STORAGE_KEYS.blocklist]) ? data[STORAGE_KEYS.blocklist] : [],
          enabled: data[STORAGE_KEYS.enabled] !== false,
        };

        resolve(settings);
      });
    });
  }

  function shouldHideEmployer(employerName) {
    if (!settings.enabled) {
      return false;
    }

    return employerMatchesBlocklist(employerName, settings.blocklist);
  }

  function setHidden(element, hidden, reason) {
    if (!element) {
      return;
    }

    if (hidden) {
      element.setAttribute(HIDDEN_ATTR, 'true');
      element.setAttribute('data-bezposrednikow-reason', reason || 'blocked');
    } else {
      element.removeAttribute(HIDDEN_ATTR);
      element.removeAttribute('data-bezposrednikow-reason');
    }

    element.setAttribute(PROCESSED_ATTR, 'true');
  }

  function showDetailNotice(employer) {
    let notice = document.getElementById(DETAIL_NOTICE_ID);
    if (!notice) {
      notice = document.createElement('div');
      notice.id = DETAIL_NOTICE_ID;
      notice.className = 'bezposrednikow-detail-notice';
      const main = document.querySelector('main');
      (main || document.body).prepend(notice);
    }

    const key = companyToFilterKey(employer);

    notice.textContent = key
      ? `Oferta ukryta: pracodawca „${employer}” jest na Twojej liście (filtr „${key}”).`
      : `Oferta ukryta: pracodawca jest na Twojej liście.`;
  }

  function clearDetailNotice() {
    document.getElementById(DETAIL_NOTICE_ID)?.remove();
  }

  function processListingPage() {
    const tiles = collectOfferTiles();
    let hiddenCount = 0;

    tiles.forEach((tile) => {
      const employer = getEmployerFromTile(tile);
      const hide = shouldHideEmployer(employer);

      setHidden(tile, hide, hide ? companyToFilterKey(employer) || 'blocklist' : '');
      if (hide) {
        hiddenCount += 1;
      }
    });

    return { total: tiles.length, hidden: hiddenCount };
  }

  function processDetailPage() {
    if (!isOfferDetailPage()) {
      clearDetailNotice();

      return null;
    }

    const employer = getEmployerFromDetailView();
    if (!employer) {
      clearDetailNotice();

      return null;
    }

    const hide = shouldHideEmployer(employer);

    detailContainers().forEach((container) => {
      setHidden(container, hide, hide ? companyToFilterKey(employer) || 'blocklist' : '');
    });

    if (hide) {
      showDetailNotice(employer);
    } else {
      clearDetailNotice();
    }

    return { employer, hidden: hide };
  }

  function runFilter() {
    if (!isJobsPage()) {
      return null;
    }

    const listing = isOfferDetailPage() ? null : processListingPage();
    const detail = processDetailPage();

    return { listing, detail };
  }

  function scheduleFilter() {
    if (filterScheduled) {
      return;
    }

    filterScheduled = true;
    requestAnimationFrame(() => {
      filterScheduled = false;
      runFilter();
    });
  }

  function startObserver() {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      scheduleFilter();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function resetDomState() {
    document.querySelectorAll(`[${HIDDEN_ATTR}], [${PROCESSED_ATTR}]`).forEach((el) => {
      el.removeAttribute(HIDDEN_ATTR);
      el.removeAttribute(PROCESSED_ATTR);
      el.removeAttribute('data-bezposrednikow-reason');
    });

    clearDetailNotice();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') {
      return;
    }

    if (changes[STORAGE_KEYS.blocklist]) {
      settings.blocklist = changes[STORAGE_KEYS.blocklist].newValue || [];
    }

    if (changes[STORAGE_KEYS.enabled]) {
      settings.enabled = changes[STORAGE_KEYS.enabled].newValue !== false;
    }

    resetDomState();
    runFilter();
  });

  if (!isJobsPage()) {
    return;
  }

  loadSettings().then(() => {
    runFilter();
    startObserver();
  });
})();