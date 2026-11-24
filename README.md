# Bezpośredników

Czy masz problem znaleźć oferty pracy, ponieważ portale są zasypane ogłoszeniami pośredników? **Teraz już nie.**

**Bezpośredników** to rozszerzenie przeglądarki, które **ukrywa** oferty od pośredników (agencje rekrutacyjne, body leasing, konsulting IT). Domyślnie działa na podstawie wbudowanej listy firm; możesz też **dodać własne wpisy**, wyszukiwać listę oraz **eksportować i importować** ją (JSON).

**Obsługiwane portale**

- [LinkedIn Jobs](https://www.linkedin.com/jobs/)
- [Just Join IT](https://justjoin.it/)
- [Pracuj.pl](https://www.pracuj.pl/)

Wtyczka działa na stronach list i szczegółów ofert: filtruje po **nazwie pracodawcy**, bez skanowania treści ogłoszeń ani stron www firm.

---

## Instalacja w Chrome (zalecane)

1. Otwórz **[najnowszy Release](https://github.com/tomaszs/bezposrednikow/releases/latest)**.
2. Pobierz plik **`bezposrednikow-v*.zip`** z sekcji *Assets*.
3. Rozpakuj zip do dowolnego folderu (np. `bezposrednikow`).
4. Wejdź w przeglądarce na `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
5. Włącz **Tryb dewelopera**.
6. **Załaduj rozpakowane** → wskaż rozpakowany folder (w środku musi być `manifest.json`).
7. Odwiedź LinkedIn Jobs, Just Join IT lub Pracuj.pl.

**Popup wtyczki:** włącz/wyłącz filtrowanie, edycja listy, import/eksport.

**Aktualizacja:** pobierz nowy zip z Releases, rozpakuj nad stary folder (lub usuń stary i rozpakuj od nowa) → na `chrome://extensions` kliknij **Odśwież** przy Bezpośredników.

---

## Build z repozytorium (deweloperzy)

Wymaga [Node.js](https://nodejs.org/) (LTS).

```powershell
git clone https://github.com/tomaszs/bezposrednikow.git
cd bezposrednikow
npm install
npm run build:extension
```

Powstaje `dist/bezposrednikow-v{wersja}.zip` oraz `dist/INSTALL.md`. Instalacja w Chrome jak wyżej (rozpakowany folder lub zip z builda).

Alternatywa bez builda: folder `extension/` → **Załaduj rozpakowane** w Chrome (tylko do własnych testów zgodnie z [LICENSE](LICENSE)).

---

## Jak to działa

- Wbudowana lista firm w `extension/shared/curated-blocklist.js` (ok. 98 pozycji, wersjonowana).
- W **popupie:** przełącznik włącz/wyłącz, dodawanie i usuwanie nazw, wyszukiwarka, eksport/import JSON.
- Na każdym portalu osobne skrypty content dopasowane do aktualnego układu strony.

---

## Dla maintainerów

```powershell
$env:BUILD_PAGES=6; $env:BUILD_DETAIL_LIMIT=150; npm run build:blocklist
npm run build:curated
```

Testy: `npm run test:match`, `test:linkedin-dom`, `test:justjoin-dom`, `test:pracuj2-dom`.

Zrzuty HTML: `przyklady/` (lokalnie, `*.txt` w `.gitignore`). Więcej: `przyklady/README.md`, `CONTRIBUTING.md`.

---

## Licencja

[LICENSE](LICENSE)

---

## Firefox

Obecna wersja jest pod Chromium (Manifest V3). Firefox wymaga osobnego pakietu.