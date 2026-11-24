import { DEFAULT_BLOCKLIST, STORAGE_KEYS } from '../shared/defaults.js';

const { companyToFilterKey } = BezposrednikowNormalize;

function formatBlocklistEntry(raw) {
  const key = companyToFilterKey(raw);
  if (!key) {
    return raw.trim();
  }

  return key
    .split(' ')
    .map((part) => (part.length <= 4 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}

const enabledInput = document.getElementById('enabled');
const blocklistEl = document.getElementById('blocklist');
const listFilterInput = document.getElementById('blocklist-filter');
const addForm = document.getElementById('add-form');
const newEntryInput = document.getElementById('new-entry');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');
const ioStatusEl = document.getElementById('io-status');

const EXPORT_FORMAT = 'bezposrednikow-blocklist';
const EXPORT_FORMAT_VERSION = 1;

let currentBlocklist = [];
let listFilterQuery = '';
let ioStatusTimer = null;

function sortKeys(keys) {
  return [...keys].sort((a, b) => a.localeCompare(b, 'pl'));
}

function entryMatchesFilter(entry, query) {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }

  const needle = trimmed.toLocaleLowerCase('pl');
  const display = entry.toLocaleLowerCase('pl');
  const filterKey = (companyToFilterKey(entry) || entry).toLocaleLowerCase('pl');

  return display.includes(needle) || filterKey.includes(needle);
}

function renderBlocklist(blocklist) {
  currentBlocklist = blocklist;
  blocklistEl.innerHTML = '';

  const visible = sortKeys(blocklist).filter((entry) => entryMatchesFilter(entry, listFilterQuery));

  if (!blocklist.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Lista jest pusta. Dodaj agencję lub pośrednika.';
    blocklistEl.appendChild(empty);

    return;
  }

  if (!visible.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Brak dopasowań do wyszukiwania.';
    blocklistEl.appendChild(empty);

    return;
  }

  visible.forEach((entry) => {
    const li = document.createElement('li');
    const label = document.createElement('div');
    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = entry;

    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `filtr: ${companyToFilterKey(entry) || entry}`;

    label.appendChild(keySpan);
    label.appendChild(meta);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Usuń';
    removeBtn.dataset.entry = entry;
    removeBtn.addEventListener('click', () => removeEntry(entry));

    li.appendChild(label);
    li.appendChild(removeBtn);
    blocklistEl.appendChild(li);
  });
}

async function readState() {
  return chrome.storage.sync.get([STORAGE_KEYS.blocklist, STORAGE_KEYS.enabled]);
}

async function saveBlocklist(blocklist) {
  await chrome.storage.sync.set({ [STORAGE_KEYS.blocklist]: blocklist });
}

function showIoStatus(message, isError = false) {
  if (ioStatusTimer) {
    clearTimeout(ioStatusTimer);
  }

  ioStatusEl.textContent = message;
  ioStatusEl.hidden = !message;
  ioStatusEl.classList.toggle('error', isError);

  if (message) {
    ioStatusTimer = setTimeout(() => {
      ioStatusEl.hidden = true;
      ioStatusEl.textContent = '';
      ioStatusEl.classList.remove('error');
    }, 4000);
  }
}

function buildExportPayload(blocklist) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    blocklist: sortKeys(blocklist),
  };
}

function parseImportedBlocklist(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Nieprawidłowy plik JSON.');
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && parsed.format === EXPORT_FORMAT && Array.isArray(parsed.blocklist)) {
    return parsed.blocklist;
  }

  if (parsed && Array.isArray(parsed.blocklist)) {
    return parsed.blocklist;
  }

  throw new Error('Brak tablicy filtrów w pliku.');
}

function mergeImportedEntries(existing, imported) {
  const result = [...existing];
  let added = 0;
  let skipped = 0;

  imported.forEach((raw) => {
    if (typeof raw !== 'string' || !raw.trim()) {
      skipped += 1;

      return;
    }

    const entry = formatBlocklistEntry(raw);
    const exists = result.some((item) => companyToFilterKey(item) === companyToFilterKey(entry));
    if (exists) {
      skipped += 1;

      return;
    }

    result.push(entry);
    added += 1;
  });

  return { blocklist: result, added, skipped };
}

function exportBlocklist() {
  const payload = buildExportPayload(currentBlocklist);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bezposrednikow-filtry-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showIoStatus(`Wyeksportowano ${payload.blocklist.length} pozycji.`);
}

async function importBlocklistFromFile(file) {
  const text = await file.text();
  const imported = parseImportedBlocklist(text);
  const data = await readState();
  const existing = data[STORAGE_KEYS.blocklist] || [];
  const { blocklist, added, skipped } = mergeImportedEntries(existing, imported);

  if (!added) {
    showIoStatus(
      skipped ? 'Import zakończony: brak nowych pozycji (duplikaty lub puste wpisy).' : 'Plik nie zawiera filtrów.',
      !skipped,
    );

    return;
  }

  await saveBlocklist(blocklist);
  renderBlocklist(blocklist);
  showIoStatus(`Import OK: dodano ${added} pozycji${skipped ? `, pominięto ${skipped}` : ''}.`);
}

async function removeEntry(entry) {
  const data = await readState();
  const blocklist = (data[STORAGE_KEYS.blocklist] || []).filter((item) => item !== entry);
  await saveBlocklist(blocklist);
  renderBlocklist(blocklist);
}

addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = newEntryInput.value.trim();
  if (!raw) {
    return;
  }

  const entry = formatBlocklistEntry(raw);

  const data = await readState();
  const blocklist = data[STORAGE_KEYS.blocklist] || [];
  const exists = blocklist.some((item) => companyToFilterKey(item) === companyToFilterKey(entry));
  if (!exists) {
    blocklist.push(entry);
    await saveBlocklist(blocklist);
    renderBlocklist(blocklist);
  }

  newEntryInput.value = '';
});

listFilterInput.addEventListener('input', () => {
  listFilterQuery = listFilterInput.value;
  renderBlocklist(currentBlocklist);
});

enabledInput.addEventListener('change', async () => {
  await chrome.storage.sync.set({ [STORAGE_KEYS.enabled]: enabledInput.checked });
});

exportBtn.addEventListener('click', () => {
  exportBlocklist();
});

importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', async () => {
  const file = importFileInput.files?.[0];
  importFileInput.value = '';
  if (!file) {
    return;
  }

  try {
    await importBlocklistFromFile(file);
  } catch (error) {
    showIoStatus(error instanceof Error ? error.message : 'Import nie powiódł się.', true);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') {
    return;
  }

  if (changes[STORAGE_KEYS.blocklist]) {
    renderBlocklist(changes[STORAGE_KEYS.blocklist].newValue || []);
  }

  if (changes[STORAGE_KEYS.enabled]) {
    enabledInput.checked = changes[STORAGE_KEYS.enabled].newValue !== false;
  }
});

readState().then((data) => {
  enabledInput.checked = data[STORAGE_KEYS.enabled] !== false;
  renderBlocklist(data[STORAGE_KEYS.blocklist] || DEFAULT_BLOCKLIST);
});