# Repozytorium publiczne: co commitujemy

Kod jest publicznie dostępny do wglądu, ale **użytkowanie podlega restrykcyjnej licencji** w pliku `LICENSE` (brak zgody na forkowanie do własnego użytku, trenowanie AI itd.). Pull requesty są możliwe technicznie na GitHubie; merge oznacza przeniesienie praw do autora projektu na warunkach `LICENSE`.

## W repozytorium

- `extension/` – kod wtyczki (MV3), ikony, lista firm `curated-blocklist.js`
- `scripts/` – testy, budowanie listy, eksploracja stron (narzędzia maintainera)
- `test-scripts/` – skrypty analizy DOM (bez wygenerowanych `.html`)
- `README.md`, `package.json`, `package-lock.json`

## Nigdy nie commituj

- `przyklady/*.txt` / `*.html` – zrzuty stron z przeglądarki (patrz `przyklady/README.md`)
- `dist/` – build zip (`npm run build:extension`)
- `node_modules/`
- pliki `.env` z kluczami API
- `scripts/debug-page.html`, `discover-output.json`, `blocklist-candidates.json` – artefakty crawla

## Martwy kod

Usunięte z wtyczki (nie pakujemy w `build:extension`):

- głębokie skanowanie opisów / stron www,
- `offer-description.js` (usunięty),
- `website-fetch.mjs` – tylko w `scripts/lib/` dla `build:blocklist` (opcjonalnie).