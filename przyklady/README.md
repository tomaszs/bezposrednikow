# Lokalne zrzuty HTML (nie commituj)

Tutaj trzymasz **własne** zapisane strony do testów DOM (`linkedin.txt`, `justjoin.txt`, `pracuj2.txt`).

Pliki `*.txt` / `*.html` są w `.gitignore`, bo zawierają m.in.:

- identyfikatory śledzenia i parametry sesji w URL-ach,
- fragmenty UI z zalogowanej sesji (np. LinkedIn),
- pełny HTML (setki KB / MB), niepotrzebny w publicznym repo.

## Testy po zapisaniu pliku

```powershell
npm run test:linkedin-dom
npm run test:justjoin-dom
npm run test:pracuj2-dom
```