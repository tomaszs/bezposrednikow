# Bezpośredników

Czy masz problem znaleźć oferty pracy, ponieważ portale są zasypane ogłoszeniami pośredników? **Teraz już nie.**

**Bezpośredników** to rozszerzenie przeglądarki, które **ukrywa** oferty od pośredników (agencje rekrutacyjne, body leasing, konsulting IT). Domyślnie działa na podstawie wbudowanej listy firm; możesz też **dodać własne wpisy**, wyszukiwać listę oraz **eksportować i importować** ją (JSON).

**Obsługiwane portale**

- [LinkedIn Jobs](https://www.linkedin.com/jobs/)
- [Just Join IT](https://justjoin.it/)
- [Pracuj.pl](https://www.pracuj.pl/)

Wtyczka działa na stronach list i szczegółów ofert: filtruje po **nazwie pracodawcy**, bez skanowania treści ogłoszeń ani stron www firm.

---

## Instalacja w Chrome (najszybsza)

Dla użytkowników, którzy chcą tylko korzystać z wtyczki:

1. **Pobierz kod** (klon repozytorium albo zip z GitHub → **Code → Download ZIP**).
2. Rozpakuj, jeśli pobrałeś zip.
3. Otwórz w przeglądarce: `chrome://extensions`  
   (Edge: `edge://extensions`, Brave: `brave://extensions`).
4. Włącz **Tryb dewelopera** (przełącznik w prawym górnym rogu).
5. Kliknij **Załaduj rozpakowane** i wskaż folder **`extension`** wewnątrz repozytorium  
   (w folderze musi leżeć plik `manifest.json`).
6. Wejdź na LinkedIn Jobs, Just Join IT lub Pracuj.pl. Oferty od firm z listy znikną z widoku.

**Ikona wtyczki:** kliknij, aby włączyć lub wyłączyć filtrowanie, edytować listę firm lub import/eksport.

**Aktualizacja:** pobierz najnowszą wersję z repozytorium, podmień folder `extension` lub całe repo, potem na `chrome://extensions` kliknij **Odśwież** przy Bezpośredników.

---

## Instalacja z paczki zip (build)

Jeśli budujesz lub udostępniasz gotowy zip:

### Wymagania

- [Node.js](https://nodejs.org/) (LTS)
- npm (dołączony do Node)

### Kroki

```powershell
git clone https://github.com/tomaszs/bezposrednikow.git
cd bezposrednikow
npm install
npm run build:extension
```

Powstaną:

- `dist/bezposrednikow-v{wersja}/` – folder gotowy do załadowania
- `dist/bezposrednikow-v{wersja}.zip` – archiwum do wysłania innym
- `dist/INSTALL.md` – skrócona instrukcja instalacji z zipa

**Z zipa w Chrome:** rozpakuj archiwum → `chrome://extensions` → Tryb dewelopera → **Załaduj rozpakowane** → wybierz rozpakowany folder (z `manifest.json`).

---

## Jak to działa

- Wbudowana lista firm w `extension/shared/curated-blocklist.js` (ok. 98 pozycji, wersjonowana).
- W **popupie:** przełącznik włącz/wyłącz, dodawanie i usuwanie nazw, wyszukiwarka, eksport/import JSON.
- Na każdym portalu osobne skrypty content dopasowane do aktualnego układu strony.

---

## Dla maintainerów

Odświeżenie listy firm (opcjonalnie, wymaga Puppeteer):

```powershell
$env:BUILD_PAGES=6; $env:BUILD_DETAIL_LIMIT=150; npm run build:blocklist
npm run build:curated
```

Następnie commit `extension/shared/curated-blocklist.js` i ewentualna aktualizacja `DEFAULT_BLOCKLIST_VERSION` w `defaults.js`.

Testy lokalne:

```powershell
npm run test:match
npm run test:linkedin-dom
npm run test:justjoin-dom
npm run test:pracuj2-dom
```

Zrzuty HTML do testów DOM trzymaj lokalnie w `przyklady/` (pliki `*.txt` są w `.gitignore`). Szczegóły: `przyklady/README.md`.

---

## Licencja

Kod jest publicznie widoczny, ale **nie jest wolny do użytku**. Warunki, zakazy (w tym wobec trenowania AI) i kary umowne opisuje wyłącznie plik **[LICENSE](LICENSE)**. Korzystanie bez **pisemnej zgody** autora jest zabronione.

---

## Firefox

Obecna wersja jest pod Chromium (Manifest V3). Firefox wymaga osobnego pakietu.