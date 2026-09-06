<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Bilddateien

Alle Dateien in `public/` heissen ausschliesslich `kleinbuchstaben_mit_unterstrichen.ext`.
Cloudflare Pages ist gross-/kleinschreibungs-sensitiv, lokale Entwicklung meist
nicht — Abweichungen fallen erst nach dem Deploy als 404 auf. Regeln, Skript
(`npm run images:check`) und der Abgleich mit den Supabase-Spalten
`routes.image_url` / `routes.image1`–`image5` stehen in [IMAGES.md](IMAGES.md).

# Links auf Route-Detailseiten

Jeder `<Link href={"/routedetail/…"}>` bekommt `prefetch={false}`.
`app/routedetail/[id]/page.tsx` ist die einzige dynamisch gerenderte Route
(Edge-Runtime, kein `generateStaticParams`), deshalb existiert kein
Prefetch-Payload und Next.js' Hintergrund-Prefetch laeuft auf Cloudflare Pages in
einen 404. Details in [ROUTING.md](ROUTING.md).
