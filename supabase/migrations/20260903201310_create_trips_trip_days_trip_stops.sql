-- Route Planner + Trip Builder — Teil 1: Datenbank
-- Tabellen: trips, trip_days, trip_stops (+ RLS analog zu saved_routes)
--
-- Diese Migration ist bereits auf das Supabase-Projekt angewendet
-- (Version 20260903201310). Die Datei dient als versionierte Referenz.

create table if not exists public.trips (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  start_location text,
  end_location   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.trip_days (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day_number int  not null,
  label      text
);

create table if not exists public.trip_stops (
  id           uuid primary key default gen_random_uuid(),
  trip_day_id  uuid not null references public.trip_days(id) on delete cascade,
  route_id     uuid not null references public.routes(id) on delete cascade,
  position     int  not null
);

create index if not exists trips_user_id_idx      on public.trips (user_id);
create index if not exists trip_days_trip_id_idx  on public.trip_days (trip_id);
create index if not exists trip_stops_day_id_idx  on public.trip_stops (trip_day_id);
create index if not exists trip_stops_route_id_idx on public.trip_stops (route_id);

-- updated_at bei jedem Update automatisch aktualisieren
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- RLS
alter table public.trips      enable row level security;
alter table public.trip_days  enable row level security;
alter table public.trip_stops enable row level security;

-- trips: Nutzer sieht/ändert ausschließlich eigene Trips
drop policy if exists "Users can view own trips"   on public.trips;
drop policy if exists "Users can insert own trips" on public.trips;
drop policy if exists "Users can update own trips" on public.trips;
drop policy if exists "Users can delete own trips" on public.trips;

create policy "Users can view own trips"   on public.trips for select using (auth.uid() = user_id);
create policy "Users can insert own trips" on public.trips for insert with check (auth.uid() = user_id);
create policy "Users can update own trips" on public.trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trips" on public.trips for delete using (auth.uid() = user_id);

-- trip_days: Zugriff über den user_id-Bezug des zugehörigen Trips
drop policy if exists "Users can view own trip days"   on public.trip_days;
drop policy if exists "Users can insert own trip days" on public.trip_days;
drop policy if exists "Users can update own trip days" on public.trip_days;
drop policy if exists "Users can delete own trip days" on public.trip_days;

create policy "Users can view own trip days" on public.trip_days for select
  using (exists (select 1 from public.trips t where t.id = trip_days.trip_id and t.user_id = auth.uid()));
create policy "Users can insert own trip days" on public.trip_days for insert
  with check (exists (select 1 from public.trips t where t.id = trip_days.trip_id and t.user_id = auth.uid()));
create policy "Users can update own trip days" on public.trip_days for update
  using (exists (select 1 from public.trips t where t.id = trip_days.trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_days.trip_id and t.user_id = auth.uid()));
create policy "Users can delete own trip days" on public.trip_days for delete
  using (exists (select 1 from public.trips t where t.id = trip_days.trip_id and t.user_id = auth.uid()));

-- trip_stops: Zugriff über trip_days -> trips -> user_id
drop policy if exists "Users can view own trip stops"   on public.trip_stops;
drop policy if exists "Users can insert own trip stops" on public.trip_stops;
drop policy if exists "Users can update own trip stops" on public.trip_stops;
drop policy if exists "Users can delete own trip stops" on public.trip_stops;

create policy "Users can view own trip stops" on public.trip_stops for select
  using (exists (
    select 1 from public.trip_days d
    join public.trips t on t.id = d.trip_id
    where d.id = trip_stops.trip_day_id and t.user_id = auth.uid()));
create policy "Users can insert own trip stops" on public.trip_stops for insert
  with check (exists (
    select 1 from public.trip_days d
    join public.trips t on t.id = d.trip_id
    where d.id = trip_stops.trip_day_id and t.user_id = auth.uid()));
create policy "Users can update own trip stops" on public.trip_stops for update
  using (exists (
    select 1 from public.trip_days d
    join public.trips t on t.id = d.trip_id
    where d.id = trip_stops.trip_day_id and t.user_id = auth.uid()))
  with check (exists (
    select 1 from public.trip_days d
    join public.trips t on t.id = d.trip_id
    where d.id = trip_stops.trip_day_id and t.user_id = auth.uid()));
create policy "Users can delete own trip stops" on public.trip_stops for delete
  using (exists (
    select 1 from public.trip_days d
    join public.trips t on t.id = d.trip_id
    where d.id = trip_stops.trip_day_id and t.user_id = auth.uid()));
