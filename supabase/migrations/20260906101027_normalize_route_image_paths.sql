-- Vereinheitlicht alle Bildpfade der routes-Tabelle auf die Repo-Konvention:
-- nur Kleinbuchstaben, Ziffern und Unterstriche, Endung klein, fuehrender "/".
--
-- Hintergrund: Cloudflare Pages ist gross-/kleinschreibungs-sensitiv. Werte wie
-- "/Ring_Road_Route 1.jpg" oder "Pacific_Route_Highway.jpg" (ohne fuehrenden
-- Slash) liefern live 404, lokal aber nicht. Siehe IMAGES.md.
--
-- Die Migration ist idempotent und kann gefahrlos erneut laufen.

create or replace function public.normalize_image_path(path text)
returns text
language sql
immutable
as $$
  with cleaned as (
    select btrim(path) as p
  ), parts as (
    select
      regexp_replace(regexp_replace(p, '^.*/', ''), '\.[^.]*$', '') as base,
      lower(substring(p from '\.([^.]*)$')) as ext
    from cleaned
  ), translit as (
    select
      replace(replace(replace(replace(replace(replace(replace(
        lower(normalize(base, NFC)),
        'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
        'æ', 'ae'), 'ø', 'oe'), 'å', 'aa') as base,
      ext
    from parts
  ), stripped as (
    select
      regexp_replace(normalize(base, NFD), E'[̀-ͯ]', '', 'g') as base,
      ext
    from translit
  )
  select case
           when btrim(coalesce(path, '')) = '' or ext is null then null
           else '/'
                || regexp_replace(
                     regexp_replace(base, '[^a-z0-9]+', '_', 'g'),
                     '^_+|_+$', '', 'g')
                || '.' || ext
         end
  from stripped;
$$;

comment on function public.normalize_image_path(text) is
  'Kanonischer Bilddateiname fuer public/. Spiegelt scripts/normalize-image-names.mjs.';

update public.routes
set image_url = public.normalize_image_path(image_url),
    image1    = public.normalize_image_path(image1),
    image2    = public.normalize_image_path(image2),
    image3    = public.normalize_image_path(image3),
    image4    = public.normalize_image_path(image4),
    image5    = public.normalize_image_path(image5)
where image_url is distinct from public.normalize_image_path(image_url)
   or image1    is distinct from public.normalize_image_path(image1)
   or image2    is distinct from public.normalize_image_path(image2)
   or image3    is distinct from public.normalize_image_path(image3)
   or image4    is distinct from public.normalize_image_path(image4)
   or image5    is distinct from public.normalize_image_path(image5);

-- Tippfehler in den Daten: die Datei heisst hardknott_pass.jpg (zwei "t").
update public.routes
set image_url = '/hardknott_pass.jpg'
where image_url = '/hardknot_pass.jpg';

-- Fuer diese drei Galerie-Bilder existiert keine Datei in public/ (auch vor der
-- Umbenennung nicht). Auf NULL setzen, damit die Route-Detail-Seite auf
-- image_url zurueckfaellt statt drei 404 zu laden. Sobald die Bilder hochgeladen
-- sind, koennen die Felder wieder gesetzt werden.
update public.routes
set image1 = nullif(image1, '/grossglockner_high_alpine_road_1.jpg'),
    image2 = nullif(image2, '/grossglockner_high_alpine_road_2.jpg'),
    image3 = nullif(image3, '/grossglockner_high_alpine_road_3.jpg')
where image1 = '/grossglockner_high_alpine_road_1.jpg'
   or image2 = '/grossglockner_high_alpine_road_2.jpg'
   or image3 = '/grossglockner_high_alpine_road_3.jpg';
