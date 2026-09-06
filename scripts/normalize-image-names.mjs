/**
 * Normalisiert alle Bilddateinamen in `public/` auf die Repo-Konvention:
 *
 *   nur Kleinbuchstaben, Ziffern und Unterstriche, Endung klein
 *
 * Hintergrund: Cloudflare Pages (Linux) ist gross-/kleinschreibungs-sensitiv,
 * lokale Windows-/macOS-Umgebungen sind es nicht. Dateien, die lokal laden,
 * liefern deshalb live 404. Leerzeichen, Umlaute, `&`, Apostrophe und Klammern
 * kommen als zusaetzliche Fehlerquelle dazu (URL-Encoding).
 *
 * Aufruf:
 *   node scripts/normalize-image-names.mjs          # zeigt nur den Plan
 *   node scripts/normalize-image-names.mjs --apply  # benennt via `git mv` um
 *
 * Das Skript ist idempotent: bereits normalisierte Dateien werden uebersprungen.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
]);

/** Umlaute & Co. vor dem Entfernen der Sonderzeichen ausschreiben. */
const TRANSLITERATIONS = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
  [/æ/g, "ae"],
  [/ø/g, "oe"],
  [/å/g, "aa"],
];

/**
 * Baut aus einem beliebigen Bild-Dateinamen den kanonischen Namen.
 * Wird sowohl fuer die Dateien selbst als auch fuer Code-/DB-Referenzen benutzt,
 * damit beide Seiten garantiert dasselbe Ergebnis liefern.
 */
export function normalizeImageName(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  let base = fileName.slice(0, fileName.length - path.extname(fileName).length);

  // NFC zuerst: macOS legt Dateinamen zerlegt ab ("u" + Trema). Ohne diesen
  // Schritt griffe die ue-Regel dort nicht und derselbe Name ergaebe je nach
  // Betriebssystem ein anderes Ergebnis.
  base = base.normalize("NFC").toLowerCase();
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    base = base.replace(pattern, replacement);
  }
  // Akzente (é, ñ, ...) auf den Grundbuchstaben reduzieren.
  base = base.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Alles, was in einer URL Aerger macht, wird zu einem Unterstrich.
  base = base.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  return `${base}${ext}`;
}

function collectImages(dir) {
  return readdirSync(dir)
    .filter((name) => statSync(path.join(dir, name)).isFile())
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()));
}

function main() {
  const apply = process.argv.includes("--apply");
  const files = collectImages(PUBLIC_DIR);

  const taken = new Set(files.map((f) => normalizeImageName(f)));
  if (taken.size !== files.length) {
    const seen = new Map();
    for (const file of files) {
      const target = normalizeImageName(file);
      if (seen.has(target)) {
        throw new Error(
          `Namenskollision: "${file}" und "${seen.get(target)}" ergeben beide "${target}"`
        );
      }
      seen.set(target, file);
    }
  }

  const renames = files
    .map((file) => ({ from: file, to: normalizeImageName(file) }))
    .filter(({ from, to }) => from !== to);

  for (const { from, to } of renames) {
    console.log(`${from} -> ${to}`);
    if (!apply) continue;
    // Zwischenschritt ueber einen temporaeren Namen: auf case-insensitiven
    // Dateisystemen wuerde `git mv "Hero.jpg" "hero.jpg"` sonst fehlschlagen.
    const tmp = `__tmp__${to}`;
    execFileSync("git", ["mv", "-f", `public/${from}`, `public/${tmp}`]);
    execFileSync("git", ["mv", "-f", `public/${tmp}`, `public/${to}`]);
  }

  console.log(`\n${renames.length} von ${files.length} Dateien umbenannt${apply ? "" : " (Dry-Run)"}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
