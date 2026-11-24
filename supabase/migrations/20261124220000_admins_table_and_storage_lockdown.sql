-- =============================================================================
-- NEU: Admin-Rechte über eine eigene Tabelle statt über E-Mail-Adressen,
--      und Avatar-Speicher (Storage) abgesichert.
-- Datum: 24.11.2026
--
-- Ausführen: Supabase → SQL Editor → alles einfügen → Run.
-- Das Skript läuft komplett oder gar nicht (Transaktion). Mehrfaches Ausführen
-- schadet nicht.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Tabelle "admins": wer hier mit seiner User-ID steht, ist Admin.
--    Niemand kann sich selbst eintragen – es gibt bewusst KEINE Policy für
--    Insert/Update/Delete. Änderungen nur hier im SQL Editor.
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Jeder eingeloggte Nutzer darf nur prüfen, ob ER SELBST drinsteht.
drop policy if exists "Users can see own admin row" on public.admins;
create policy "Users can see own admin row" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- Die bisherigen Admins übernehmen (aus den alten routes-Policies).
-- Steht eine Adresse (noch) nicht in auth.users, wird sie einfach übersprungen.
insert into public.admins (user_id)
select id from auth.users
where lower(email) in ('lavr.anichin@gmx.de', 'mirza0681@gmail.com')
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Funktion is_admin(): true, wenn der aktuell eingeloggte Nutzer Admin ist.
--    security definer + fester search_path = sicher und schnell in Policies.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3) routes: Lesen für alle (unverändert), Schreiben nur für Admins.
--    Ersetzt die drei Policies mit fest eingetragenen E-Mail-Adressen.
-- -----------------------------------------------------------------------------
drop policy if exists "Only admin can insert routes" on public.routes;
drop policy if exists "Only admin can update routes" on public.routes;
drop policy if exists "Only admin can delete routes" on public.routes;

create policy "Only admin can insert routes" on public.routes
  for insert to authenticated
  with check (public.is_admin());

create policy "Only admin can update routes" on public.routes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admin can delete routes" on public.routes
  for delete to authenticated
  using (public.is_admin());

-- "Anyone can read routes" bleibt wie es ist.

-- -----------------------------------------------------------------------------
-- 4) Storage: Die alten Policies erlaubten JEDEM (auch ohne Login) in den
--    Avatar-Buckets Dateien hochzuladen, zu überschreiben und zu löschen.
--    Seit es nur noch Avatar-Vorlagen gibt (public/avatars/*.svg), braucht
--    niemand mehr Upload-Rechte. Übrig bleibt:
--    - Lesen für alle (alte Profilbilder von Bestandsnutzern bleiben sichtbar)
--    - Löschen der EIGENEN alten Datei Avatars/<userId>.jpg (macht der
--      AvatarEditor beim Wechsel auf eine Vorlage)
-- -----------------------------------------------------------------------------
drop policy if exists "Allow all avatars" on storage.objects;
drop policy if exists "Public Access"     on storage.objects;

drop policy if exists "Avatars public read" on storage.objects;
create policy "Avatars public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('Avatars', 'avatars'));

drop policy if exists "Avatars delete own file" on storage.objects;
create policy "Avatars delete own file" on storage.objects
  for delete to authenticated
  using (bucket_id = 'Avatars' and name = auth.uid()::text || '.jpg');

commit;

-- -----------------------------------------------------------------------------
-- Kontrolle (danach einzeln ausführen):
--   select a.user_id, u.email from public.admins a join auth.users u on u.id = a.user_id;
-- Neuen Admin hinzufügen:
--   insert into public.admins (user_id) select id from auth.users where email = 'neu@beispiel.de';
-- Admin entfernen:
--   delete from public.admins where user_id = (select id from auth.users where email = 'alt@beispiel.de');
-- -----------------------------------------------------------------------------
