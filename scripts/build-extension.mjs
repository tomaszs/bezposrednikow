import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'extension');
const distDir = path.join(root, 'dist');

const manifest = JSON.parse(readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8'));
const version = manifest.version || '0.0.0';
const outName = `bezposrednikow-v${version}`;
const outDir = path.join(distDir, outName);
const zipPath = path.join(distDir, `${outName}.zip`);

const COPY_PATHS = [
  'manifest.json',
  'background.js',
  'content/filter.css',
  'content/filter.js',
  'content/filter-linkedin.js',
  'content/filter-justjoin.js',
  'popup/popup.css',
  'popup/popup.html',
  'popup/popup.js',
  'shared/normalize.js',
  'shared/match.js',
  'shared/defaults.js',
  'shared/curated-blocklist.js',
  'shared/pracuj-dom.js',
  'shared/linkedin-dom.js',
  'shared/justjoin-dom.js',
  'icons',
];

function copyTree() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  COPY_PATHS.forEach((relativePath) => {
    const source = path.join(extensionDir, relativePath);
    const target = path.join(outDir, relativePath);
    cpSync(source, target, { recursive: true });
  });
}

function writeZip() {
  rmSync(zipPath, { force: true });
  const escapedZip = zipPath.replace(/'/g, "''");
  const escapedOut = outDir.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${escapedOut}\\*' -DestinationPath '${escapedZip}' -Force"`,
    { stdio: 'inherit' },
  );
}

copyTree();
writeZip();

const installMd = `# Instalacja Bezpośredników v${version}

## Obsługiwane przeglądarki

Manifest V3, instalacja **Załaduj rozpakowane**:

- **Google Chrome** – \`chrome://extensions\`
- **Microsoft Edge** – \`edge://extensions\`
- **Brave** – \`brave://extensions\`
- **Opera**, **Vivaldi** i inne **Chromium** z obsługą MV3 – jak w Chrome

**Nieobsługiwane na razie:** Firefox, Safari.

## Kroki instalacji

1. Pobierz \`${outName}.zip\` z [Releases na GitHubie](https://github.com/tomaszs/bezposrednikow/releases/latest) (sekcja Assets) albo z folderu \`dist/\` po buildzie.
2. Rozpakuj zip do dowolnego folderu (np. \`bezposrednikow\`).
3. Otwórz stronę rozszerzeń swojej przeglądarki (np. \`chrome://extensions\`, \`edge://extensions\`).
4. Włącz **Tryb dewelopera**.
5. Kliknij **Załaduj rozpakowane** i wskaż rozpakowany folder (w środku musi być \`manifest.json\`).

Aktualizacja: pobierz nowy zip, rozpakuj **nad** stary folder (lub usuń stary i rozpakuj od nowa), potem na stronie rozszerzeń kliknij **Odśwież** przy wtyczce.
`;

writeFileSync(path.join(distDir, 'INSTALL.md'), installMd, 'utf8');

console.log(`Built: ${outDir}`);
console.log(`Zip:   ${zipPath}`);
console.log(`Docs:  ${path.join(distDir, 'INSTALL.md')}`);