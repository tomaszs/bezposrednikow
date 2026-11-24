import { DEFAULT_BLOCKLIST, DEFAULT_BLOCKLIST_VERSION, STORAGE_KEYS } from './shared/defaults.js';

async function seedDefaultsIfNeeded() {
  const existing = await chrome.storage.sync.get([
    STORAGE_KEYS.blocklist,
    STORAGE_KEYS.enabled,
    'blocklistVersion',
  ]);
  const updates = {};

  const needsBlocklist =
    !Array.isArray(existing[STORAGE_KEYS.blocklist]) ||
    existing[STORAGE_KEYS.blocklist].length === 0 ||
    (existing.blocklistVersion || 0) < DEFAULT_BLOCKLIST_VERSION;

  if (needsBlocklist) {
    updates[STORAGE_KEYS.blocklist] = DEFAULT_BLOCKLIST;
    updates.blocklistVersion = DEFAULT_BLOCKLIST_VERSION;
  }

  if (existing[STORAGE_KEYS.enabled] === undefined) {
    updates[STORAGE_KEYS.enabled] = true;
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  seedDefaultsIfNeeded();
});

chrome.runtime.onStartup.addListener(() => {
  seedDefaultsIfNeeded();
});