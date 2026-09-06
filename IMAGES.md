# Bilddateien in `public/`

## Namenskonvention (verbindlich)

> **Nur Kleinbuchstaben, Ziffern und Unterstriche. Endung ebenfalls klein.**

```
north_coast_500.jpg      ✅
amalfi_coast_road_1.jpg  ✅

North Coast 500.jpg      ❌ Leerzeichen
North_Coast_500.jpg      ❌ Grossbuchstaben
Gamle_Fjell.JPG          ❌ Endung gross
Nockalmstraße.jpg        ❌ Umlaut/ß
Col_d'Aubisque_&_X.jpeg  ❌ Apostroph, &
black-forest-b500.jpg    ❌ Bindestrich
```

Umlaute und Sonderzeichen werden ausgeschrieben bzw. ersetzt:

| Zeichen | wird zu | Beispiel |
| --- | --- | --- |
| `ä ö ü ß` | `ae oe ue ss` | `Nockalmstraße.jpg` → `nockalmstrasse.jpg` |
| `æ ø å` | `ae oe aa` | |
| Akzente (`é`, `ñ`, …) | Grundbuchstabe | `Café.jpg` → `cafe.jpg` |
| alles Übrige (Leerzeichen, `-`, `&`, `'`, `(`, `)`) | `_` | `Gran Sasso (Campo Imperatore).webp` → `gran_sasso_campo_imperatore.webp` |

Mehrere Unterstriche werden zu einem zusammengezogen, führende/abschließende
entfallen.

## Warum

Cloudflare Pages liefert die Seite von einem Linux-Dateisystem aus und ist damit
**gross-/kleinschreibungs-sensitiv**. Windows und macOS sind es standardmässig
nicht. Ein `<img src="/North Coast 500.jpg">` auf eine Datei
`North_Coast_500.jpg` lädt deshalb lokal (bzw. fällt lokal gar nicht auf) und
liefert live einen 404. Leerzeichen, `&`, Apostrophe und Umlaute kommen als
zweite Fehlerquelle dazu, weil sie in der URL encodiert werden müssen und je
nach Ursprung unterschiedlich normalisiert ankommen.

## Beim Hinzufügen neuer Bilder

1. Datei nach obiger Konvention benennen und in `public/` ablegen.
2. Prüfen, dass nichts abweicht:

   ```bash
   npm run images:check       # Dry-Run, listet alle Verstösse
   npm run images:normalize   # benennt via `git mv` um
   ```

   Das Skript (`scripts/normalize-image-names.mjs`) ist idempotent — ein
   sauberer Ordner erzeugt eine leere Ausgabe.
3. Referenzen im Code (`app/**/*.tsx`) mit exakt demselben Namen schreiben.
4. Werte in Supabase (`routes.image_url`, `routes.image1` … `routes.image5`)
   ebenfalls klein schreiben. Zum Nachprüfen bzw. Reparieren gibt es in der
   Datenbank die Funktion `public.normalize_image_path(text)`, die dieselbe
   Regel abbildet:

   ```sql
   -- alle Werte, die von der Konvention abweichen
   select id, title, image_url
   from public.routes
   where image_url is distinct from public.normalize_image_path(image_url);
   ```

## Fehlende Bilder

Für die Route *Grossglockner High Alpine Road* verweisen `image1`–`image3`
bislang auf Dateien, die nie im Repo lagen. Die Felder stehen jetzt auf `NULL`,
die Detailseite fällt damit auf `image_url` zurück. Sobald die drei Bilder
vorliegen, können sie als `grossglockner_high_alpine_road_1.jpg` … `_3.jpg`
abgelegt und die Spalten wieder gesetzt werden.
