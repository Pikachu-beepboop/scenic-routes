# Routing & Prefetching auf Cloudflare Pages

## Symptom

Auf `/explore` (und ueberall sonst, wo Route-Karten stehen) tauchten in der
Browser-Konsole 404er auf:

```
GET https://scenic-routes-a4j.pages.dev/routedetail/{uuid}?_rsc=2dl82 404
```

Ein echter Klick auf "VIEW ROUTE" lud die Seite dagegen einwandfrei.

## Ursache

`app/routedetail/[id]/page.tsx` ist die **einzige dynamisch gerenderte Route** der
App. Alle anderen Seiten (`/`, `/explore`, `/my-trips`, `/about`, …) liegen unter
statischen Segmenten und werden beim Build vorgerendert — auch wenn sie
`"use client"` sind. Fuer sie existieren die RSC-Payloads als echte Dateien im
Deployment.

`/routedetail/[id]` dagegen:

* hat ein dynamisches Segment `[id]`,
* hat **kein** `generateStaticParams()` (kann es auch nicht haben — die Datei ist
  ein Client-Component, und die IDs kommen ohnehin erst zur Laufzeit aus Supabase),
* traegt deshalb `export const runtime = 'edge'` (Commit `0facdd9`), weil der
  Cloudflare-Build sonst fehlschlaegt.

Damit wird die Seite pro Request gerendert und es gibt **keine vorgerenderte
Payload-Datei** fuer irgendeine `/routedetail/<uuid>`.

Entscheidend ist jetzt, dass der Next.js-Router zwei *verschiedene* Arten von
RSC-Requests schickt:

| Request | Header | Ziel im Build-Output | Ergebnis |
| --- | --- | --- | --- |
| echter Klick / Navigation | `RSC: 1` | dynamische Edge-Function | 200 |
| Hintergrund-Prefetch | `RSC: 1` **+ `Next-Router-Prefetch: 1`** | separates, vorgerendertes Prefetch-Artefakt | **404** |

Das Prefetch-Artefakt entsteht nur fuer vorgerenderte Routen. Fuer eine rein
dynamische Route existiert es nicht, und Cloudflare Pages liefert fuer den nicht
vorhandenen Pfad einen 404 — genau die Requests mit dem `_rsc=`-Cache-Buster.
Die echte Navigation nutzt den anderen Pfad und funktioniert deshalb weiter.

Ausgeschlossen wurden:

* **Routen-Daten**: alle 90 Zeilen in `routes` haben saubere UUIDs (36 Zeichen,
  kein Sonderzeichen), die 404er betreffen also alle IDs gleichermassen.
* **PR #21 ("einheitliche Bilddateinamen")**: dieser Commit (`5d4bbfb`) hat weder
  `app/routedetail/[id]/page.tsx` noch `app/explore/page.tsx` angefasst.
* **`_routes.json`**: existiert im Repo nicht, wird vom Cloudflare-Adapter
  generiert.

## Loesung: `prefetch={false}`

Ein "echter" Fix muesste die Detailseite vorrenderbar machen — das ginge nur mit
`generateStaticParams()` ueber alle Routen-IDs, also Build-Zeit-Zugriff auf
Supabase plus Rebuild bei jeder neuen Route. Das ist fuer diese Seite reine
Verschwendung, denn:

> Die Detailseite laedt **alle** Inhalte erst im Browser ueber Supabase
> (`useParams()` + `useEffect`). Die RSC-Payload enthaelt keinerlei
> routenspezifische Daten und ist fuer jede UUID identisch.

Prefetching bringt hier also selbst im Erfolgsfall nichts — es wuerde auf
`/explore` nur ~12 nutzlose Requests pro Seitenansicht erzeugen. Deshalb ist der
bewusste Kompromiss: **Prefetching fuer diese Links abschalten.**

```tsx
<Link href={`/routedetail/${route.id}`} prefetch={false}>…</Link>
```

Betroffene Stellen:

* `app/explore/page.tsx` — Kartenbild, Titel, "VIEW ROUTE"-Button
* `app/page.tsx` — "Popular routes"-Karte
* `app/my-trips/page.tsx` — Desktop- und Mobile-Liste (je Thumb, Titel, Open-Button)

`app/components/WorldMap.tsx` nutzt `router.push()` statt `<Link>` und prefetcht
daher ohnehin nicht.

## Regel fuer neue Links

Jeder neue `<Link href={"/routedetail/…"}>` bekommt `prefetch={false}`. Sonst
kommen die Konsolen-404er zurueck.

Sollte die Detailseite spaeter serverseitig gerendert werden (echte
Server-Component mit Datenladen zur Build- oder Request-Zeit), kann diese Regel
wieder entfallen.
