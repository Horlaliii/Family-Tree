-- OurFamilyTree: helper functions, integrity rules, cached columns and audit.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'places', 'persons', 'person_names', 'parent_child', 'unions', 'media',
    'facts', 'sources', 'citations', 'user_profiles', 'site_settings', 'site_secrets'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who is asking?
-- ---------------------------------------------------------------------------

-- The role of the logged-in user, or null when not an active user.
create function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select up.role
  from public.user_profiles up
  where up.user_id = auth.uid() and up.status = 'active'
$$;

create function public.is_member()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.current_app_role() is not null $$;

create function public.is_editor()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.current_app_role() in ('editor', 'admin'), false) $$;

create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(public.current_app_role() = 'admin', false) $$;

-- Full, unredacted read access: active members and above, plus server-side
-- maintenance roles. current_user is the calling role (these functions are
-- not SECURITY DEFINER), so it is "visitor" for passcode-only visitors.
create function public.has_full_access()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin') or public.is_member()
$$;

-- May browse the tree at all: full access, or a passcode visitor.
create function public.can_browse()
returns boolean
language sql
stable
set search_path = ''
as $$ select public.has_full_access() or current_user = 'visitor' $$;

-- ---------------------------------------------------------------------------
-- Living status
-- ---------------------------------------------------------------------------

-- The latest year a fuzzy birth date could fall in, or null if unbounded.
create function public.latest_possible_year(
  d date,
  q public.date_qualifier,
  d_end date
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when d is null then null
    when q = 'after' then null
    when q = 'between' then extract(year from d_end)::integer
    else extract(year from d)::integer
  end
$$;

-- A person is deceased when:
--   * the admin has set an override (used first), or
--   * they have any death record (date or free text), or
--   * they were born more than 110 years ago, or
--   * any of their children was born more than 100 years ago.
-- Otherwise (including when nothing is known) they are treated as living.
-- SECURITY DEFINER so passcode visitors, who cannot read parent_child, can
-- still use it; it only ever returns a boolean.
create function public.person_is_living(p public.persons)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.is_living_override is not null then p.is_living_override
    when p.death_date is not null or length(btrim(coalesce(p.death_text, ''))) > 0 then false
    when public.latest_possible_year(p.birth_date, p.birth_qualifier, p.birth_date_end)
         <= extract(year from now())::integer - 110 then false
    when exists (
      select 1
      from public.parent_child pc
      join public.persons c on c.id = pc.child_id
      where pc.parent_id = p.id
        and c.deleted_at is null
        and public.latest_possible_year(c.birth_date, c.birth_qualifier, c.birth_date_end)
            <= extract(year from now())::integer - 100
    ) then false
    else true
  end
$$;

create function public.person_is_living_by_id(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.person_is_living(p) from public.persons p where p.id = p_id
$$;

-- May the current viewer see this person's private details?
create function public.can_view_person_details(p public.persons)
returns boolean
language sql
stable
set search_path = ''
as $$ select public.has_full_access() or not public.person_is_living(p) $$;

create function public.can_view_person_details_by_id(p_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select public.has_full_access() or not coalesce(public.person_is_living_by_id(p_id), true) $$;

-- ---------------------------------------------------------------------------
-- Fuzzy dates: display text (mirrors src/lib/dates/fuzzy-date.ts)
-- ---------------------------------------------------------------------------
create function public.format_fuzzy_date(
  d date,
  p public.date_precision,
  q public.date_qualifier,
  d_end date,
  t text
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  base text;
  end_text text;
begin
  if d is null then
    return coalesce(nullif(btrim(t), ''), 'Unknown');
  end if;

  base := case coalesce(p, 'day')
    when 'year' then to_char(d, 'FMYYYY')
    when 'month' then to_char(d, 'FMMon YYYY')
    else to_char(d, 'FMDD Mon YYYY')
  end;

  if d_end is not null then
    end_text := case coalesce(p, 'day')
      when 'year' then to_char(d_end, 'FMYYYY')
      when 'month' then to_char(d_end, 'FMMon YYYY')
      else to_char(d_end, 'FMDD Mon YYYY')
    end;
  end if;

  return case coalesce(q, 'exact')
    when 'about' then 'c. ' || base
    when 'before' then 'before ' || base
    when 'after' then 'after ' || base
    when 'between' then 'between ' || base || ' and ' || coalesce(end_text, '?')
    else base
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Slugs
-- ---------------------------------------------------------------------------
create function public.generate_person_slug(p_name text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text;
  candidate text;
begin
  base := btrim(regexp_replace(public.normalize_name(p_name), '[^a-z0-9]+', '-', 'g'), '-');
  if base = '' then
    base := 'person';
  end if;
  base := left(base, 60);
  loop
    candidate := base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
    exit when not exists (select 1 from public.persons where slug = candidate);
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Names: one primary name per person, and the cached display_name
-- ---------------------------------------------------------------------------
create function public.format_person_name(title text, given_names text, surname text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    coalesce(title, '') || ' ' || coalesce(given_names, '') || ' ' || coalesce(surname, ''),
    '\s+', ' ', 'g'
  ))
$$;

create function public.person_names_demote_other_primaries()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_primary then
    update public.person_names
      set is_primary = false
      where person_id = new.person_id and id <> new.id and is_primary;
  end if;
  return new;
end;
$$;

create trigger person_names_demote_other_primaries
  before insert or update of is_primary on public.person_names
  for each row when (new.is_primary)
  execute function public.person_names_demote_other_primaries();

create function public.refresh_display_name(p_person_id uuid)
returns void
language sql
set search_path = ''
as $$
  with best as (
    select coalesce((
      select public.format_person_name(n.title, n.given_names, n.surname)
      from public.person_names n
      where n.person_id = p_person_id
      order by n.is_primary desc, n.sort_order, n.created_at
      limit 1
    ), 'Unknown') as name
  )
  update public.persons p
    set display_name = best.name
  from best
  where p.id = p_person_id
    and p.display_name is distinct from best.name;
$$;

create function public.person_names_refresh_display_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_display_name(old.person_id);
  else
    perform public.refresh_display_name(new.person_id);
    if tg_op = 'UPDATE' and old.person_id <> new.person_id then
      perform public.refresh_display_name(old.person_id);
    end if;
  end if;
  return null;
end;
$$;

create trigger person_names_refresh_display_name
  after insert or update or delete on public.person_names
  for each row execute function public.person_names_refresh_display_name();

-- ---------------------------------------------------------------------------
-- Relationship integrity
--   * a person cannot be their own ancestor (no cycles, whatever the type)
--   * a person has at most 2 biological parents
-- ---------------------------------------------------------------------------
create function public.parent_child_check_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  bio_count integer;
begin
  -- Serialise changes to the same child so the parent count stays correct.
  perform pg_advisory_xact_lock(hashtextextended('parent_child:' || new.child_id::text, 0));

  -- Cycle: is the new child already an ancestor of the new parent?
  if exists (
    with recursive ancestors(id, depth) as (
      select pc.parent_id, 1
      from public.parent_child pc
      where pc.child_id = new.parent_id and pc.id <> new.id
      union
      select pc.parent_id, a.depth + 1
      from public.parent_child pc
      join ancestors a on pc.child_id = a.id
      where pc.id <> new.id and a.depth < 200
    )
    select 1 from ancestors where id = new.child_id
  ) then
    raise exception 'A person cannot be their own ancestor'
      using errcode = 'check_violation', hint = 'relationship_cycle';
  end if;

  if new.relationship_type = 'biological' then
    select count(*) into bio_count
    from public.parent_child
    where child_id = new.child_id
      and relationship_type = 'biological'
      and id <> new.id;
    if bio_count >= 2 then
      raise exception 'A person can have at most 2 biological parents'
        using errcode = 'check_violation', hint = 'too_many_biological_parents';
    end if;
  end if;

  return new;
end;
$$;

create trigger parent_child_check_integrity
  before insert or update of parent_id, child_id, relationship_type on public.parent_child
  for each row execute function public.parent_child_check_integrity();

-- Warnings that should not block a save (odd dates and similar).
create function public.relationship_warnings(p_person_id uuid)
returns table (code text, message text, other_person_id uuid)
language sql
stable
set search_path = ''
as $$
  -- Child born before (or too soon after) a parent's birth
  select 'child_before_parent', format('%s was born before their parent %s', c.display_name, p.display_name), p.id
  from public.parent_child pc
  join public.persons p on p.id = pc.parent_id
  join public.persons c on c.id = pc.child_id
  where (pc.child_id = p_person_id or pc.parent_id = p_person_id)
    and pc.relationship_type = 'biological'
    and p.birth_year is not null and c.birth_year is not null
    and c.birth_year <= p.birth_year
  union all
  select 'young_parent', format('%s would have been %s when %s was born', p.display_name, c.birth_year - p.birth_year, c.display_name), p.id
  from public.parent_child pc
  join public.persons p on p.id = pc.parent_id
  join public.persons c on c.id = pc.child_id
  where (pc.child_id = p_person_id or pc.parent_id = p_person_id)
    and pc.relationship_type = 'biological'
    and p.birth_year is not null and c.birth_year is not null
    and c.birth_year - p.birth_year between 1 and 11
  union all
  select 'old_parent', format('%s would have been %s when %s was born', p.display_name, c.birth_year - p.birth_year, c.display_name), p.id
  from public.parent_child pc
  join public.persons p on p.id = pc.parent_id
  join public.persons c on c.id = pc.child_id
  where (pc.child_id = p_person_id or pc.parent_id = p_person_id)
    and pc.relationship_type = 'biological'
    and p.birth_year is not null and c.birth_year is not null
    and c.birth_year - p.birth_year > case when p.sex = 'female' then 55 else 80 end
  union all
  -- Born long after a parent died (a father may die before the birth)
  select 'born_after_parent_death', format('%s was born after %s died', c.display_name, p.display_name), p.id
  from public.parent_child pc
  join public.persons p on p.id = pc.parent_id
  join public.persons c on c.id = pc.child_id
  where (pc.child_id = p_person_id or pc.parent_id = p_person_id)
    and pc.relationship_type = 'biological'
    and p.death_year is not null and c.birth_year is not null
    and c.birth_year > p.death_year + case when p.sex = 'male' then 1 else 0 end
  union all
  select 'same_sex_biological_parents', format('%s has two biological parents recorded with the same sex', c.display_name), c.id
  from public.persons c
  where c.id = p_person_id
    and exists (
      select 1
      from public.parent_child a
      join public.parent_child b on b.child_id = a.child_id and b.id > a.id
      join public.persons pa on pa.id = a.parent_id
      join public.persons pb on pb.id = b.parent_id
      where a.child_id = c.id
        and a.relationship_type = 'biological' and b.relationship_type = 'biological'
        and pa.sex = pb.sex and pa.sex <> 'unknown'
    )
  union all
  select 'death_before_birth', format('%s has a death date before their birth date', p.display_name), p.id
  from public.persons p
  where p.id = p_person_id and p.death_year is not null and p.birth_year is not null and p.death_year < p.birth_year
  union all
  select 'union_before_birth', format('The union with %s starts before one partner was born', o.display_name), o.id
  from public.unions u
  join public.persons a on a.id = u.partner_a_id
  join public.persons b on b.id = u.partner_b_id
  join public.persons o on o.id = case when u.partner_a_id = p_person_id then u.partner_b_id else u.partner_a_id end
  where p_person_id in (u.partner_a_id, u.partner_b_id)
    and u.start_date is not null
    and (extract(year from u.start_date) < a.birth_year or extract(year from u.start_date) < b.birth_year)
$$;

-- ---------------------------------------------------------------------------
-- Audit log: every change to content tables, written by triggers.
-- Multi-step operations set app.change_group so they can be grouped.
-- ---------------------------------------------------------------------------
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_record uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_before := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_after := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' and (v_before - 'updated_at') = (v_after - 'updated_at') then
    return null;
  end if;

  v_record := coalesce(
    v_after ->> 'id', v_before ->> 'id',
    v_after ->> 'user_id', v_before ->> 'user_id',
    v_after ->> 'media_id', v_before ->> 'media_id'
  )::uuid;

  insert into public.audit_log (actor_id, table_name, record_id, action, before, after, change_group)
  values (
    auth.uid(),
    tg_table_name,
    v_record,
    lower(tg_op),
    v_before,
    v_after,
    nullif(current_setting('app.change_group', true), '')::uuid
  );
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'places', 'persons', 'person_names', 'parent_child', 'unions', 'media',
    'media_people', 'facts', 'sources', 'citations', 'user_profiles'
  ]
  loop
    execute format(
      'create trigger audit_row_change after insert or update or delete on public.%I '
      || 'for each row execute function public.audit_row_change()',
      t
    );
  end loop;
end;
$$;

-- site_settings has a boolean id, so audit it with a small variant.
create function public.audit_site_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, table_name, record_id, action, before, after, change_group)
  values (auth.uid(), 'site_settings', null, lower(tg_op), to_jsonb(old), to_jsonb(new),
          nullif(current_setting('app.change_group', true), '')::uuid);
  return null;
end;
$$;

create trigger audit_site_settings
  after update on public.site_settings
  for each row execute function public.audit_site_settings();

-- Start a change group for the current transaction (used by RPCs).
create function public.begin_change_group()
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  g uuid := gen_random_uuid();
begin
  perform set_config('app.change_group', g::text, true);
  return g;
end;
$$;

-- ---------------------------------------------------------------------------
-- New users: the very first user becomes an active admin; later sign-ins are
-- "pending" and see nothing until the admin activates them (Phase 2 invites).
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_admin boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('first_admin', 0));
  select exists (select 1 from public.user_profiles where role = 'admin') into has_admin;

  insert into public.user_profiles (user_id, email, display_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    case when has_admin then 'member'::public.user_role else 'admin'::public.user_role end,
    case when has_admin then 'pending'::public.user_status else 'active'::public.user_status end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- An admin cannot demote or disable themselves (avoids locking everyone out).
create function public.user_profiles_protect_self()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.user_id = auth.uid() and old.role = 'admin'
     and (new.role <> 'admin' or new.status <> 'active') then
    raise exception 'You cannot remove your own admin access'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger user_profiles_protect_self
  before update on public.user_profiles
  for each row execute function public.user_profiles_protect_self();

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window). Returns true when the attempt is allowed.
-- ---------------------------------------------------------------------------
create function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end,
    window_start = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end
  returning count into v_count;

  -- Opportunistic clean-up of stale keys.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_max;
end;
$$;
