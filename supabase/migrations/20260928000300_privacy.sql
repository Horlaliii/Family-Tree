-- OurFamilyTree: access control and living-person privacy.
--
-- Three kinds of database caller:
--   anon          - the public anon key. Gets NOTHING, so nobody can skip the
--                   family passcode by calling the API directly.
--   visitor       - passcode visitors. The server signs a short-lived JWT
--                   with role=visitor after checking the passcode cookie.
--                   Can only read the v_* views, which redact living people.
--   authenticated - logged-in users. RLS on the base tables checks the role
--                   in user_profiles; pending/disabled users see nothing.
--
-- The v_* views are the single read path for the app, for visitors and
-- members alike. They run with the view owner's rights (that is how a
-- visitor can read them without any access to the base tables) and do the
-- redaction themselves, using can_browse() / has_full_access(), which look at
-- the *calling* role.

-- ---------------------------------------------------------------------------
-- The visitor role
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'visitor') then
    create role visitor nologin noinherit;
  end if;
end;
$$;
grant visitor to authenticator;
grant usage on schema public to visitor;
-- Search uses pg_trgm / unaccent, which live in the extensions schema.
grant usage on schema extensions to visitor;

-- ---------------------------------------------------------------------------
-- Lock everything down, then grant back deliberately.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated, visitor;
revoke all on all sequences in schema public from anon, authenticated, visitor;
revoke execute on all functions in schema public from public, anon, authenticated, visitor;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Base tables: members read, editors write. RLS below narrows further.
grant select, insert, update, delete on
  public.places, public.persons, public.person_names, public.parent_child,
  public.unions, public.media, public.media_people, public.facts,
  public.sources, public.citations
to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select on public.audit_log to authenticated;
grant select, update on public.site_settings to authenticated;
grant select on public.site_settings to visitor;
-- site_secrets and rate_limits: service_role only (no grants, no policies).

-- Helper functions every signed-in or visitor caller needs.
grant execute on function
  public.normalize_name(text),
  public.current_app_role(),
  public.is_member(),
  public.is_editor(),
  public.is_admin(),
  public.has_full_access(),
  public.can_browse(),
  public.latest_possible_year(date, public.date_qualifier, date),
  public.person_is_living(public.persons),
  public.person_is_living_by_id(uuid),
  public.can_view_person_details(public.persons),
  public.can_view_person_details_by_id(uuid),
  public.format_fuzzy_date(date, public.date_precision, public.date_qualifier, date, text),
  public.format_person_name(text, text, text)
to authenticated, visitor;

grant execute on function
  public.relationship_warnings(uuid),
  public.generate_person_slug(text),
  public.begin_change_group(),
  -- called from the person_names trigger while editors save names
  public.refresh_display_name(uuid)
to authenticated;

-- Trigger functions are called by the database itself and need no grants.
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security on every table
-- ---------------------------------------------------------------------------
alter table public.places enable row level security;
alter table public.persons enable row level security;
alter table public.person_names enable row level security;
alter table public.parent_child enable row level security;
alter table public.unions enable row level security;
alter table public.media enable row level security;
alter table public.media_people enable row level security;
alter table public.facts enable row level security;
alter table public.sources enable row level security;
alter table public.citations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.audit_log enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_secrets enable row level security;
alter table public.rate_limits enable row level security;

-- Content tables: active members read (admins also see soft-deleted rows),
-- editors and admins write, only admins hard-delete people.
do $$
declare
  t text;
begin
  foreach t in array array[
    'places', 'person_names', 'parent_child', 'unions', 'media_people', 'citations'
  ]
  loop
    execute format('create policy "members read" on public.%I for select to authenticated using ((select public.is_member()))', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check ((select public.is_editor()))', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using ((select public.is_editor()))', t);
  end loop;

  -- Soft-deletable tables
  foreach t in array array['persons', 'media', 'facts', 'sources']
  loop
    execute format('create policy "members read" on public.%I for select to authenticated using ((select public.is_member()) and (deleted_at is null or (select public.is_editor())))', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check ((select public.is_editor()))', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()))', t);
    execute format('create policy "admins delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end;
$$;

create policy "read own profile or admin" on public.user_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "admins update profiles" on public.user_profiles
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins read audit" on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

create policy "browsers read settings" on public.site_settings
  for select to authenticated, visitor
  using ((select public.can_browse()));
create policy "admins update settings" on public.site_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Redacting views: the app's read path
-- ---------------------------------------------------------------------------
create view public.v_persons as
select
  p.id,
  p.slug,
  p.sex,
  p.display_name,
  p.profile_photo_id,
  s.is_living,
  s.full as can_view_details,
  case when (select public.is_editor()) then p.is_living_override end as is_living_override,
  case when s.full then p.birth_date end as birth_date,
  case when s.full then p.birth_precision end as birth_precision,
  case when s.full then p.birth_qualifier end as birth_qualifier,
  case when s.full then p.birth_date_end end as birth_date_end,
  case when s.full then p.birth_text end as birth_text,
  case when s.full then p.birth_year end as birth_year,
  case when s.full then p.birth_place_id end as birth_place_id,
  case when s.full then p.birth_confidence end as birth_confidence,
  case when s.full then p.death_date end as death_date,
  case when s.full then p.death_precision end as death_precision,
  case when s.full then p.death_qualifier end as death_qualifier,
  case when s.full then p.death_date_end end as death_date_end,
  case when s.full then p.death_text end as death_text,
  case when s.full then p.death_year end as death_year,
  case when s.full then p.death_place_id end as death_place_id,
  case when s.full then p.death_confidence end as death_confidence,
  case when s.full then p.hometown_place_id end as hometown_place_id,
  case when s.full then p.clan end as clan,
  case when s.full then p.totem end as totem,
  case when s.full then p.occupation end as occupation,
  case when s.full then p.bio end as bio,
  p.created_at,
  p.updated_at
from public.persons p
cross join lateral (select public.person_is_living(p) as is_living) l
cross join lateral (select l.is_living, (select public.has_full_access()) or not l.is_living as full) s
where p.deleted_at is null
  and (select public.can_browse());

-- Visitors only see the primary name of a living person (so searching a
-- nickname cannot reveal who it belongs to).
create view public.v_person_names as
select n.id, n.person_id, n.name_type, n.title, n.given_names, n.surname,
       n.is_primary, n.sort_order, n.search_text, n.search_tsv
from public.person_names n
join public.v_persons p on p.id = n.person_id
where p.can_view_details or n.is_primary;

-- Relationships are visible to everyone who may browse.
create view public.v_parent_child as
select pc.id, pc.parent_id, pc.child_id, pc.relationship_type, pc.confidence
from public.parent_child pc
join public.persons a on a.id = pc.parent_id and a.deleted_at is null
join public.persons b on b.id = pc.child_id and b.deleted_at is null
where (select public.can_browse());

-- Union dates are private while either partner is living.
create view public.v_unions as
select
  u.id, u.partner_a_id, u.partner_b_id, u.union_type,
  u.partner_a_order, u.partner_b_order, u.confidence,
  case when s.full then u.start_date end as start_date,
  case when s.full then u.start_precision end as start_precision,
  case when s.full then u.start_qualifier end as start_qualifier,
  case when s.full then u.start_date_end end as start_date_end,
  case when s.full then u.start_text end as start_text,
  case when s.full then u.end_date end as end_date,
  case when s.full then u.end_precision end as end_precision,
  case when s.full then u.end_qualifier end as end_qualifier,
  case when s.full then u.end_date_end end as end_date_end,
  case when s.full then u.end_text end as end_text,
  case when s.full then u.end_reason end as end_reason,
  case when s.full then u.notes end as notes,
  s.full as can_view_details
from public.unions u
join public.persons a on a.id = u.partner_a_id and a.deleted_at is null
join public.persons b on b.id = u.partner_b_id and b.deleted_at is null
cross join lateral (
  select (select public.has_full_access())
      or (not public.person_is_living(a) and not public.person_is_living(b)) as full
) s
where (select public.can_browse());

create view public.v_facts as
select f.id, f.person_id, f.fact_type, f.custom_label,
       f.fact_date, f.fact_precision, f.fact_qualifier, f.fact_date_end, f.fact_text,
       f.place_id, f.description, f.confidence, f.created_at, f.updated_at
from public.facts f
join public.v_persons p on p.id = f.person_id
where f.deleted_at is null
  and p.can_view_details;

-- A citation is visible when the thing it supports is visible in full.
create view public.v_citations as
select c.id, c.source_id, c.fact_id, c.person_id, c.person_field, c.name_id,
       c.parent_child_id, c.union_id, c.detail
from public.citations c
join public.sources s on s.id = c.source_id and s.deleted_at is null
where (select public.can_browse())
  and (
    (select public.has_full_access())
    or (c.fact_id is not null and exists (select 1 from public.v_facts f where f.id = c.fact_id))
    or (c.person_id is not null and public.can_view_person_details_by_id(c.person_id))
    or (c.name_id is not null and exists (
          select 1 from public.person_names n
          where n.id = c.name_id and public.can_view_person_details_by_id(n.person_id)))
    or (c.parent_child_id is not null and exists (
          select 1 from public.parent_child pc
          where pc.id = c.parent_child_id
            and public.can_view_person_details_by_id(pc.parent_id)
            and public.can_view_person_details_by_id(pc.child_id)))
    or (c.union_id is not null and exists (
          select 1 from public.v_unions u where u.id = c.union_id and u.can_view_details))
  );

create view public.v_sources as
select s.id, s.title, s.source_type, s.informant, s.recorded_on, s.notes, s.media_id,
       s.created_at, s.updated_at
from public.sources s
where s.deleted_at is null
  and (select public.can_browse())
  and (
    (select public.has_full_access())
    or exists (select 1 from public.v_citations c where c.source_id = s.id)
  );

-- Media rules for visitors:
--   * a person's profile photo is always visible;
--   * anything tagged with a living person is hidden;
--   * untagged media is hidden, unless it backs a visible source.
create view public.v_media as
select m.id, m.storage_path, m.thumbnail_path, m.media_type, m.mime_type,
       m.width, m.height, m.bytes, m.original_filename, m.caption,
       m.media_date, m.media_precision, m.media_qualifier, m.media_date_end, m.media_text,
       m.created_at, m.updated_at
from public.media m
where m.deleted_at is null
  and (select public.can_browse())
  and (
    (select public.has_full_access())
    or exists (
      select 1 from public.persons p
      where p.profile_photo_id = m.id and p.deleted_at is null
    )
    or (
      not exists (
        select 1
        from public.media_people mp
        join public.persons p on p.id = mp.person_id and p.deleted_at is null
        where mp.media_id = m.id and public.person_is_living(p)
      )
      and (
        exists (
          select 1 from public.media_people mp
          join public.persons p on p.id = mp.person_id and p.deleted_at is null
          where mp.media_id = m.id
        )
        or exists (select 1 from public.v_sources s where s.media_id = m.id)
      )
    )
  );

create view public.v_media_people as
select mp.media_id, mp.person_id
from public.media_people mp
join public.v_media m on m.id = mp.media_id
join public.persons p on p.id = mp.person_id and p.deleted_at is null;

-- Visitors see only places that visible data refers to.
create view public.v_places as
select pl.id, pl.name, pl.town, pl.region, pl.country, pl.lat, pl.lng, pl.search_text
from public.places pl
where (select public.can_browse())
  and (
    (select public.has_full_access())
    or exists (
      select 1 from public.v_persons p
      where pl.id in (p.birth_place_id, p.death_place_id, p.hometown_place_id)
    )
    or exists (select 1 from public.v_facts f where f.place_id = pl.id)
  );

grant select on
  public.v_persons, public.v_person_names, public.v_parent_child, public.v_unions,
  public.v_facts, public.v_citations, public.v_sources, public.v_media,
  public.v_media_people, public.v_places
to authenticated, visitor;

-- ---------------------------------------------------------------------------
-- Storage: one private bucket. Browsers never read files directly; the
-- server checks v_media and hands out short-lived signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "editors upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_editor()));
create policy "editors update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_editor()))
  with check (bucket_id = 'media' and (select public.is_editor()));
create policy "editors delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_editor()));
create policy "editors read media" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_editor()));
