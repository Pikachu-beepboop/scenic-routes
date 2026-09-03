-- Teil 1 (Nachtrag): getrennte Start-/End-Koordinaten fuer die Matching-Logik in Teil 2.
-- Die routes-Tabelle hatte bisher nur ein einziges Koordinatenpaar (latitude/longitude)
-- sowie start_point/end_point als Freitext. Die neuen Spalten werden einmalig durch
-- scripts/geocode-routes.ts aus start_point/end_point befuellt.
alter table public.routes
  add column if not exists start_lat numeric,
  add column if not exists start_lng numeric,
  add column if not exists end_lat   numeric,
  add column if not exists end_lng   numeric;

comment on column public.routes.start_lat is 'Breitengrad des Startpunkts, geokodiert aus start_point';
comment on column public.routes.start_lng is 'Laengengrad des Startpunkts, geokodiert aus start_point';
comment on column public.routes.end_lat   is 'Breitengrad des Endpunkts, geokodiert aus end_point';
comment on column public.routes.end_lng   is 'Laengengrad des Endpunkts, geokodiert aus end_point';
