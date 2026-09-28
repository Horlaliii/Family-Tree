-- OurFamilyTree: core schema
-- Tables, enums, indexes and the helper columns kept up to date by triggers.
-- Privacy (RLS, views, roles) lives in a later migration.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.sex_type as enum ('male', 'female', 'unknown');
create type public.date_precision as enum ('year', 'month', 'day');
create type public.date_qualifier as enum ('exact', 'about', 'before', 'after', 'between');
create type public.name_type as enum ('birth', 'day', 'baptismal', 'married', 'nickname', 'other');
create type public.parent_relationship as enum ('biological', 'adoptive', 'step', 'foster', 'guardian');
create type public.confidence_level as enum ('confirmed', 'family_account', 'uncertain');
create type public.union_type as enum ('customary', 'church', 'civil', 'partnership', 'unknown');
create type public.union_end_reason as enum ('divorce', 'death', 'other');
create type public.fact_type as enum ('baptism', 'education', 'migration', 'burial', 'occupation', 'custom');
create type public.source_type as enum ('certificate', 'church_record', 'oral_account', 'letter', 'photo', 'other');
create type public.citation_person_field as enum ('birth', 'death');
create type public.media_type as enum ('photo', 'document');
create type public.user_role as enum ('member', 'editor', 'admin');
create type public.user_status as enum ('active', 'pending', 'disabled');

-- ---------------------------------------------------------------------------
-- Name normalisation (used by generated search columns)
-- unaccent() is only STABLE, so wrap it with a fixed dictionary to get an
-- IMMUTABLE function that generated columns and indexes can use.
-- ---------------------------------------------------------------------------
create function public.normalize_name(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(
    regexp_replace(
      extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(value, '')),
      '\s+', ' ', 'g'
    )
  )
$$;

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  town text,
  region text,
  country text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  search_text text generated always as (
    public.normalize_name(name || ' ' || coalesce(town, '') || ' ' || coalesce(region, '') || ' ' || coalesce(country, ''))
  ) stored,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index places_search_trgm on public.places using gin (search_text extensions.gin_trgm_ops);
create index places_created_by_idx on public.places (created_by);

-- ---------------------------------------------------------------------------
-- Persons
-- Fuzzy dates are stored as grouped columns: <x>_date, <x>_precision,
-- <x>_qualifier, <x>_date_end (for "between") and <x>_text (free-form).
-- ---------------------------------------------------------------------------
create table public.persons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sex public.sex_type not null default 'unknown',
  -- Copied from the primary name by a trigger on person_names.
  display_name text not null default '',
  -- null = decide automatically; true = living; false = deceased.
  is_living_override boolean,

  birth_date date,
  birth_precision public.date_precision,
  birth_qualifier public.date_qualifier,
  birth_date_end date,
  birth_text text,
  birth_year integer generated always as (extract(year from birth_date)::integer) stored,
  birth_place_id uuid references public.places (id) on delete set null,
  birth_confidence public.confidence_level,

  death_date date,
  death_precision public.date_precision,
  death_qualifier public.date_qualifier,
  death_date_end date,
  death_text text,
  death_year integer generated always as (extract(year from death_date)::integer) stored,
  death_place_id uuid references public.places (id) on delete set null,
  death_confidence public.confidence_level,

  hometown_place_id uuid references public.places (id) on delete set null,
  clan text,
  totem text,
  occupation text,
  bio text,
  profile_photo_id uuid, -- FK added after media exists

  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint persons_birth_precision_chk check (birth_date is null or birth_precision is not null),
  constraint persons_birth_between_chk check (birth_qualifier is distinct from 'between' or birth_date_end is not null),
  constraint persons_birth_order_chk check (birth_date_end is null or birth_date_end >= birth_date),
  constraint persons_death_precision_chk check (death_date is null or death_precision is not null),
  constraint persons_death_between_chk check (death_qualifier is distinct from 'between' or death_date_end is not null),
  constraint persons_death_order_chk check (death_date_end is null or death_date_end >= death_date)
);
create index persons_birth_place_idx on public.persons (birth_place_id);
create index persons_death_place_idx on public.persons (death_place_id);
create index persons_hometown_idx on public.persons (hometown_place_id);
create index persons_profile_photo_idx on public.persons (profile_photo_id);
create index persons_created_by_idx on public.persons (created_by);
create index persons_birth_year_idx on public.persons (birth_year);
create index persons_created_at_idx on public.persons (created_at desc) where deleted_at is null;
create index persons_display_name_trgm on public.persons using gin (public.normalize_name(display_name) extensions.gin_trgm_ops);
create index persons_clan_idx on public.persons (clan);

-- ---------------------------------------------------------------------------
-- Names (a person can have many; exactly one should be primary)
-- ---------------------------------------------------------------------------
create table public.person_names (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id) on delete cascade,
  name_type public.name_type not null default 'birth',
  title text,
  given_names text,
  surname text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  search_text text generated always as (
    public.normalize_name(coalesce(given_names, '') || ' ' || coalesce(surname, ''))
  ) stored,
  search_tsv tsvector generated always as (
    to_tsvector('simple'::regconfig, public.normalize_name(coalesce(given_names, '') || ' ' || coalesce(surname, '')))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_names_not_empty check (
    length(btrim(coalesce(given_names, ''))) > 0 or length(btrim(coalesce(surname, ''))) > 0
  )
);
create index person_names_person_idx on public.person_names (person_id);
create unique index person_names_one_primary on public.person_names (person_id) where is_primary;
create index person_names_search_trgm on public.person_names using gin (search_text extensions.gin_trgm_ops);
create index person_names_search_tsv on public.person_names using gin (search_tsv);

-- ---------------------------------------------------------------------------
-- Parent / child links
-- ---------------------------------------------------------------------------
create table public.parent_child (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.persons (id) on delete cascade,
  child_id uuid not null references public.persons (id) on delete cascade,
  relationship_type public.parent_relationship not null default 'biological',
  confidence public.confidence_level not null default 'confirmed',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_child_not_self check (parent_id <> child_id),
  constraint parent_child_unique unique (parent_id, child_id)
);
create index parent_child_child_idx on public.parent_child (child_id);
create index parent_child_parent_idx on public.parent_child (parent_id);
create index parent_child_created_by_idx on public.parent_child (created_by);

-- ---------------------------------------------------------------------------
-- Unions (marriages and partnerships). Each partner has their own ordering:
-- she may be his 2nd wife while he is her 1st husband.
-- ---------------------------------------------------------------------------
create table public.unions (
  id uuid primary key default gen_random_uuid(),
  partner_a_id uuid not null references public.persons (id) on delete cascade,
  partner_b_id uuid not null references public.persons (id) on delete cascade,
  union_type public.union_type not null default 'unknown',

  start_date date,
  start_precision public.date_precision,
  start_qualifier public.date_qualifier,
  start_date_end date,
  start_text text,

  end_date date,
  end_precision public.date_precision,
  end_qualifier public.date_qualifier,
  end_date_end date,
  end_text text,
  end_reason public.union_end_reason,

  partner_a_order integer not null default 1,
  partner_b_order integer not null default 1,
  confidence public.confidence_level not null default 'confirmed',
  notes text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unions_not_self check (partner_a_id <> partner_b_id),
  constraint unions_start_precision_chk check (start_date is null or start_precision is not null),
  constraint unions_start_between_chk check (start_qualifier is distinct from 'between' or start_date_end is not null),
  constraint unions_end_precision_chk check (end_date is null or end_precision is not null),
  constraint unions_end_between_chk check (end_qualifier is distinct from 'between' or end_date_end is not null)
);
create index unions_partner_a_idx on public.unions (partner_a_id);
create index unions_partner_b_idx on public.unions (partner_b_id);
create index unions_created_by_idx on public.unions (created_by);

-- ---------------------------------------------------------------------------
-- Media (photos and scanned documents). Files live in the private "media"
-- storage bucket; these rows describe them.
-- ---------------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  thumbnail_path text,
  media_type public.media_type not null,
  mime_type text not null,
  width integer,
  height integer,
  bytes bigint,
  original_filename text,
  caption text,

  media_date date,
  media_precision public.date_precision,
  media_qualifier public.date_qualifier,
  media_date_end date,
  media_text text,

  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint media_precision_chk check (media_date is null or media_precision is not null),
  constraint media_between_chk check (media_qualifier is distinct from 'between' or media_date_end is not null)
);
create index media_uploaded_by_idx on public.media (uploaded_by);
create index media_created_at_idx on public.media (created_at desc) where deleted_at is null;

create table public.media_people (
  media_id uuid not null references public.media (id) on delete cascade,
  person_id uuid not null references public.persons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (media_id, person_id)
);
create index media_people_person_idx on public.media_people (person_id);

alter table public.persons
  add constraint persons_profile_photo_fk
  foreign key (profile_photo_id) references public.media (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Facts (life events other than birth, death and marriage, which live on
-- persons and unions)
-- ---------------------------------------------------------------------------
create table public.facts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.persons (id) on delete cascade,
  fact_type public.fact_type not null,
  custom_label text,

  fact_date date,
  fact_precision public.date_precision,
  fact_qualifier public.date_qualifier,
  fact_date_end date,
  fact_text text,

  place_id uuid references public.places (id) on delete set null,
  description text,
  confidence public.confidence_level not null default 'family_account',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint facts_custom_label_chk check (fact_type <> 'custom' or length(btrim(coalesce(custom_label, ''))) > 0),
  constraint facts_precision_chk check (fact_date is null or fact_precision is not null),
  constraint facts_between_chk check (fact_qualifier is distinct from 'between' or fact_date_end is not null)
);
create index facts_person_idx on public.facts (person_id);
create index facts_place_idx on public.facts (place_id);
create index facts_created_by_idx on public.facts (created_by);

-- ---------------------------------------------------------------------------
-- Sources and citations. A citation links a source to exactly one thing:
-- a fact, a person's birth or death, a name, a parent-child link or a union.
-- ---------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  source_type public.source_type not null default 'other',
  informant text,
  recorded_on date,
  notes text,
  media_id uuid references public.media (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index sources_media_idx on public.sources (media_id);
create index sources_created_by_idx on public.sources (created_by);
create index sources_title_trgm on public.sources using gin (public.normalize_name(title) extensions.gin_trgm_ops);

create table public.citations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  fact_id uuid references public.facts (id) on delete cascade,
  person_id uuid references public.persons (id) on delete cascade,
  person_field public.citation_person_field,
  name_id uuid references public.person_names (id) on delete cascade,
  parent_child_id uuid references public.parent_child (id) on delete cascade,
  union_id uuid references public.unions (id) on delete cascade,
  detail text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint citations_one_target check (num_nonnulls(fact_id, person_id, name_id, parent_child_id, union_id) = 1),
  constraint citations_person_field check ((person_id is null) = (person_field is null))
);
create index citations_source_idx on public.citations (source_id);
create index citations_fact_idx on public.citations (fact_id);
create index citations_person_idx on public.citations (person_id);
create index citations_name_idx on public.citations (name_id);
create index citations_parent_child_idx on public.citations (parent_child_id);
create index citations_union_idx on public.citations (union_id);
create index citations_created_by_idx on public.citations (created_by);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role public.user_role not null default 'member',
  status public.user_status not null default 'pending',
  linked_person_id uuid references public.persons (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_profiles_linked_person_idx on public.user_profiles (linked_person_id);

-- ---------------------------------------------------------------------------
-- Audit log (written only by triggers)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  before jsonb,
  after jsonb,
  change_group uuid,
  created_at timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_group_idx on public.audit_log (change_group);

-- ---------------------------------------------------------------------------
-- Site settings (public-safe) and secrets (server-only)
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'Our Family Tree',
  intro_md text,
  featured_person_id uuid references public.persons (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index site_settings_featured_idx on public.site_settings (featured_person_id);
insert into public.site_settings (id) values (true);

-- The passcode hash is kept apart from site_settings so no client role can
-- ever select it, and so it never lands in the audit log.
create table public.site_secrets (
  id boolean primary key default true check (id),
  passcode_hash text,
  passcode_version integer not null default 1,
  passcode_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.site_secrets (id) values (true);

-- Fixed-window rate limiting shared by all server instances.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);
