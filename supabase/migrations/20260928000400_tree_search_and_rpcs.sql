-- OurFamilyTree: tree queries, search, research dashboard and write RPCs.
-- Read functions are SECURITY INVOKER and read only the redacting v_* views,
-- so the same privacy rules apply to them automatically.

-- Reuse the transaction's change group if one was already started.
create or replace function public.begin_change_group()
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  existing text := nullif(current_setting('app.change_group', true), '');
  g uuid;
begin
  if existing is not null then
    return existing::uuid;
  end if;
  g := gen_random_uuid();
  perform set_config('app.change_group', g::text, true);
  return g;
end;
$$;

-- ---------------------------------------------------------------------------
-- A compact JSON card for one person (what lists, search and the tree show)
-- ---------------------------------------------------------------------------
create function public.person_card_json(p public.v_persons)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'name', p.display_name,
    'sex', p.sex,
    'isLiving', p.is_living,
    'canViewDetails', p.can_view_details,
    'photoId', p.profile_photo_id,
    'birthYear', p.birth_year,
    'birthQualifier', p.birth_qualifier,
    'birthYearEnd', extract(year from p.birth_date_end)::integer,
    'deathYear', p.death_year,
    'deathQualifier', p.death_qualifier,
    'deathYearEnd', extract(year from p.death_date_end)::integer,
    'deathText', p.death_text
  )
$$;

-- ---------------------------------------------------------------------------
-- Ancestors and descendants (biological and adoptive links by default)
-- ---------------------------------------------------------------------------
create function public.get_ancestors(
  p_person_id uuid,
  p_generations integer default 5,
  p_types public.parent_relationship[] default array['biological', 'adoptive']::public.parent_relationship[]
)
returns table (person_id uuid, generation integer)
language sql
stable
set search_path = ''
as $$
  with recursive up(id, generation) as (
    select pc.parent_id, 1
    from public.v_parent_child pc
    where pc.child_id = p_person_id and pc.relationship_type = any(p_types)
    union
    select pc.parent_id, up.generation + 1
    from up
    join public.v_parent_child pc on pc.child_id = up.id
    where up.generation < least(greatest(p_generations, 1), 25)
      and pc.relationship_type = any(p_types)
  )
  select id, min(generation) from up group by id
$$;

create function public.get_descendants(
  p_person_id uuid,
  p_generations integer default 5,
  p_types public.parent_relationship[] default array['biological', 'adoptive']::public.parent_relationship[]
)
returns table (person_id uuid, generation integer)
language sql
stable
set search_path = ''
as $$
  with recursive down(id, generation) as (
    select pc.child_id, 1
    from public.v_parent_child pc
    where pc.parent_id = p_person_id and pc.relationship_type = any(p_types)
    union
    select pc.child_id, down.generation + 1
    from down
    join public.v_parent_child pc on pc.parent_id = down.id
    where down.generation < least(greatest(p_generations, 1), 25)
      and pc.relationship_type = any(p_types)
  )
  select id, min(generation) from down group by id
$$;

-- ---------------------------------------------------------------------------
-- The tree window: exactly the people and links the tree view needs.
--
-- The "line" is followed up through fathers (paternal), mothers (maternal)
-- or both parents, using biological and adoptive links only. Going down,
-- all children of a line person are on the line, but the line only
-- continues through sons (paternal) or daughters (maternal).
--
-- Also included, but not on the line: every parent of a line person
-- (mothers, step-parents, the other parent of a descendant), spouses of
-- line people, siblings and half-siblings of line ancestors, and
-- step/foster children of line descendants.
-- ---------------------------------------------------------------------------
create function public.get_tree_window(
  p_focus uuid,
  p_up integer default 3,
  p_down integer default 2,
  p_lineage text default 'paternal'
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_up integer := least(greatest(coalesce(p_up, 3), 0), 10);
  v_down integer := least(greatest(coalesce(p_down, 2), 0), 10);
  v_lineage text := coalesce(p_lineage, 'paternal');
  v_line_up uuid[];
  v_up_expandable uuid[];
  v_line_down uuid[];
  v_continuing uuid[];
  v_line uuid[];
  v_line_parents uuid[];
  v_up_parents uuid[];
  v_nodes uuid[];
  v_max_nodes constant integer := 800;
begin
  if v_lineage not in ('both', 'paternal', 'maternal') then
    raise exception 'Unknown lineage: %', v_lineage using errcode = '22023';
  end if;

  if not exists (select 1 from public.v_persons where id = p_focus) then
    return null;
  end if;

  with recursive up(id, depth) as (
    select p_focus, 0
    union
    select pc.parent_id, up.depth + 1
    from up
    join public.v_parent_child pc on pc.child_id = up.id
    join public.v_persons par on par.id = pc.parent_id
    where up.depth < v_up
      and pc.relationship_type in ('biological', 'adoptive')
      and (
        v_lineage = 'both'
        or (v_lineage = 'paternal' and par.sex = 'male')
        or (v_lineage = 'maternal' and par.sex = 'female')
      )
  )
  select array_agg(distinct id), array_agg(distinct id) filter (where depth < v_up)
  into v_line_up, v_up_expandable
  from up;

  with recursive down(id, depth, continues) as (
    select p_focus, 0, true
    union
    select pc.child_id, down.depth + 1,
      (
        v_lineage = 'both'
        or (v_lineage = 'paternal' and ch.sex = 'male')
        or (v_lineage = 'maternal' and ch.sex = 'female')
      )
    from down
    join public.v_parent_child pc on pc.parent_id = down.id
    join public.v_persons ch on ch.id = pc.child_id
    where down.continues
      and down.depth < v_down
      and pc.relationship_type in ('biological', 'adoptive')
  )
  select array_agg(distinct id), array_agg(distinct id) filter (where continues and depth < v_down)
  into v_line_down, v_continuing
  from down;

  v_line := array(select distinct x from unnest(v_line_up || v_line_down) x);

  -- Parents of line people, except above the top of the window.
  v_line_parents := array(
    select distinct pc.parent_id
    from public.v_parent_child pc
    where pc.child_id = any(v_up_expandable || v_line_down)
  );
  v_up_parents := array(
    select distinct pc.parent_id
    from public.v_parent_child pc
    where pc.child_id = any(v_up_expandable)
  );

  v_nodes := v_line
    || v_line_parents
    -- spouses of line people
    || array(
      select case when u.partner_a_id = any(v_line) then u.partner_b_id else u.partner_a_id end
      from public.v_unions u
      where u.partner_a_id = any(v_line) or u.partner_b_id = any(v_line)
    )
    -- siblings and half-siblings of line ancestors (and of the focus)
    || array(
      select pc.child_id from public.v_parent_child pc where pc.parent_id = any(v_up_parents)
    )
    -- every child (any link type) of descendants the line continues through
    || array(
      select pc.child_id from public.v_parent_child pc where pc.parent_id = any(v_continuing)
    );

  -- De-duplicate, keeping line people first, and cap the window.
  v_nodes := array(
    select x
    from (
      select x, min(ord) as ord
      from unnest(v_nodes) with ordinality as t(x, ord)
      where x is not null
      group by x
    ) d
    order by ord
    limit v_max_nodes
  );

  return jsonb_build_object(
    'focusId', p_focus,
    'lineage', v_lineage,
    'up', v_up,
    'down', v_down,
    'truncated', coalesce(array_length(v_nodes, 1), 0) >= v_max_nodes,
    'nodes', coalesce((
      select jsonb_agg(
        public.person_card_json(p) || jsonb_build_object(
          'onLine', p.id = any(v_line),
          'hasMoreParents', exists (
            select 1 from public.v_parent_child pc
            where pc.child_id = p.id and not (pc.parent_id = any(v_nodes))
          ),
          'hasMoreChildren', exists (
            select 1 from public.v_parent_child pc
            where pc.parent_id = p.id and not (pc.child_id = any(v_nodes))
          ),
          'hasFather', exists (
            select 1 from public.v_parent_child pc
            join public.v_persons f on f.id = pc.parent_id
            where pc.child_id = p.id and f.sex = 'male'
              and pc.relationship_type in ('biological', 'adoptive')
          ),
          'hasMother', exists (
            select 1 from public.v_parent_child pc
            join public.v_persons m on m.id = pc.parent_id
            where pc.child_id = p.id and m.sex = 'female'
              and pc.relationship_type in ('biological', 'adoptive')
          )
        )
        order by p.id
      )
      from public.v_persons p
      where p.id = any(v_nodes)
    ), '[]'::jsonb),
    'edges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pc.id,
        'parentId', pc.parent_id,
        'childId', pc.child_id,
        'type', pc.relationship_type
      ) order by pc.id)
      from public.v_parent_child pc
      where pc.parent_id = any(v_nodes) and pc.child_id = any(v_nodes)
    ), '[]'::jsonb),
    'unions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'partnerAId', u.partner_a_id,
        'partnerBId', u.partner_b_id,
        'type', u.union_type,
        'partnerAOrder', u.partner_a_order,
        'partnerBOrder', u.partner_b_order,
        'ended', u.end_reason is not null or u.end_date is not null
      ) order by u.partner_a_order, u.id)
      from public.v_unions u
      where u.partner_a_id = any(v_nodes) and u.partner_b_id = any(v_nodes)
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Family of one person, for the profile page
-- ---------------------------------------------------------------------------
create function public.get_person_family(p_person_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with
  my_parents as (
    select pc.id as link_id, pc.parent_id, pc.relationship_type, pc.confidence
    from public.v_parent_child pc
    where pc.child_id = p_person_id
  ),
  sibling_links as (
    select pc.child_id as sibling_id, pc.parent_id, pc.relationship_type
    from public.v_parent_child pc
    join my_parents mp on mp.parent_id = pc.parent_id
    where pc.child_id <> p_person_id
  ),
  siblings as (
    select sibling_id,
           array_agg(distinct parent_id) as shared_parent_ids,
           bool_and(relationship_type in ('biological', 'adoptive')) as by_birth_or_adoption
    from sibling_links
    group by sibling_id
  ),
  my_bio_parent_count as (
    select count(*) as n from my_parents where relationship_type in ('biological', 'adoptive')
  ),
  children as (
    select pc.id as link_id, pc.child_id, pc.relationship_type, pc.confidence,
      coalesce((
        select array_agg(o.parent_id)
        from public.v_parent_child o
        where o.child_id = pc.child_id and o.parent_id <> p_person_id
      ), '{}') as other_parent_ids
    from public.v_parent_child pc
    where pc.parent_id = p_person_id
  )
  select jsonb_build_object(
    'parents', coalesce((
      select jsonb_agg(public.person_card_json(p) || jsonb_build_object(
        'linkId', mp.link_id, 'relationshipType', mp.relationship_type, 'confidence', mp.confidence
      ) order by p.sex desc, p.birth_year nulls last)
      from my_parents mp join public.v_persons p on p.id = mp.parent_id
    ), '[]'::jsonb),
    'unions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', u.id,
        'type', u.union_type,
        'order', case when u.partner_a_id = p_person_id then u.partner_a_order else u.partner_b_order end,
        'canViewDetails', u.can_view_details,
        'startDate', u.start_date, 'startPrecision', u.start_precision,
        'startQualifier', u.start_qualifier, 'startDateEnd', u.start_date_end, 'startText', u.start_text,
        'endDate', u.end_date, 'endPrecision', u.end_precision,
        'endQualifier', u.end_qualifier, 'endDateEnd', u.end_date_end, 'endText', u.end_text,
        'endReason', u.end_reason,
        'partner', public.person_card_json(p)
      ) order by case when u.partner_a_id = p_person_id then u.partner_a_order else u.partner_b_order end, u.id)
      from public.v_unions u
      join public.v_persons p on p.id = case when u.partner_a_id = p_person_id then u.partner_b_id else u.partner_a_id end
      where p_person_id in (u.partner_a_id, u.partner_b_id)
    ), '[]'::jsonb),
    'children', coalesce((
      select jsonb_agg(public.person_card_json(p) || jsonb_build_object(
        'linkId', c.link_id, 'relationshipType', c.relationship_type,
        'confidence', c.confidence, 'otherParentIds', to_jsonb(c.other_parent_ids)
      ) order by p.birth_year nulls last, p.display_name)
      from children c join public.v_persons p on p.id = c.child_id
    ), '[]'::jsonb),
    'siblings', coalesce((
      select jsonb_agg(public.person_card_json(p) || jsonb_build_object(
        'sharedParentIds', to_jsonb(s.shared_parent_ids),
        'kind', case
          when not s.by_birth_or_adoption then 'step'
          when cardinality(s.shared_parent_ids) >= 2 then 'full'
          when (select n from my_bio_parent_count) >= 2
               or (select count(*) from public.v_parent_child o
                   where o.child_id = s.sibling_id and o.relationship_type in ('biological', 'adoptive')) >= 2
            then 'half'
          else 'unknown'
        end
      ) order by p.birth_year nulls last, p.display_name)
      from siblings s join public.v_persons p on p.id = s.sibling_id
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Search across all names (full text + trigram, so misspellings match)
-- ---------------------------------------------------------------------------
create function public.search_people(q text, max_results integer default 20, skip integer default 0)
returns table (
  id uuid,
  slug text,
  display_name text,
  matched_name text,
  card jsonb,
  parent_names text[],
  score real,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with qn as (
    select public.normalize_name(btrim(q)) as t
  ),
  scored as (
    select
      n.person_id,
      public.format_person_name(n.title, n.given_names, n.surname) as matched_name,
      (
        greatest(
          extensions.similarity(n.search_text, qn.t),
          extensions.word_similarity(qn.t, n.search_text)
        )
        + case when n.search_tsv @@ plainto_tsquery('simple'::regconfig, qn.t) then 0.5 else 0 end
        + case when n.search_text like qn.t || '%' then 0.25 else 0 end
      )::real as score
    from public.v_person_names n, qn
    where length(qn.t) >= 2
      and (
        n.search_tsv @@ plainto_tsquery('simple'::regconfig, qn.t)
        or extensions.word_similarity(qn.t, n.search_text) >= 0.45
        or extensions.similarity(n.search_text, qn.t) >= 0.3
      )
  ),
  best as (
    select distinct on (person_id) person_id, matched_name, score
    from scored
    order by person_id, score desc
  )
  select
    p.id,
    p.slug,
    p.display_name,
    case when b.matched_name <> p.display_name then b.matched_name end,
    public.person_card_json(p),
    coalesce((
      select array_agg(pp.display_name order by pp.sex desc, pp.display_name)
      from public.v_parent_child pc
      join public.v_persons pp on pp.id = pc.parent_id
      where pc.child_id = p.id and pc.relationship_type in ('biological', 'adoptive')
    ), '{}'),
    b.score,
    count(*) over ()
  from best b
  join public.v_persons p on p.id = b.person_id
  order by b.score desc, p.display_name
  limit least(greatest(max_results, 1), 100)
  offset greatest(skip, 0)
$$;

-- Possible duplicates for the "create person" warning.
create function public.find_possible_duplicates(
  p_given_names text,
  p_surname text,
  p_birth_year integer default null,
  p_exclude uuid default null
)
returns table (id uuid, slug text, card jsonb, score real)
language sql
stable
set search_path = ''
as $$
  with qn as (
    select public.normalize_name(coalesce(p_given_names, '') || ' ' || coalesce(p_surname, '')) as t
  ),
  matches as (
    select n.person_id, max(extensions.similarity(n.search_text, qn.t))::real as score
    from public.v_person_names n, qn
    where public.is_editor()
      and length(btrim(qn.t)) >= 2
      and extensions.similarity(n.search_text, qn.t) >= 0.45
      and n.person_id is distinct from p_exclude
    group by n.person_id
  )
  select p.id, p.slug, public.person_card_json(p), m.score
  from matches m
  join public.v_persons p on p.id = m.person_id
  where p_birth_year is null or p.birth_year is null or abs(p.birth_year - p_birth_year) <= 5
  order by m.score desc
  limit 5
$$;

-- ---------------------------------------------------------------------------
-- Home page stats
-- ---------------------------------------------------------------------------
create function public.get_site_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with recursive
  links as (
    select parent_id, child_id
    from public.v_parent_child
    where relationship_type in ('biological', 'adoptive')
  ),
  roots as (
    select p.id from public.v_persons p
    where not exists (select 1 from links l where l.child_id = p.id)
  ),
  depth(id, d) as (
    select id, 1 from roots
    union
    select l.child_id, depth.d + 1
    from depth join links l on l.parent_id = depth.id
    where depth.d < 50
  )
  select jsonb_build_object(
    'people', (select count(*) from public.v_persons),
    'generations', coalesce((select max(d) from depth), 0),
    'photos', (select count(*) from public.v_media where media_type = 'photo'),
    'documents', (select count(*) from public.v_media where media_type = 'document')
  )
$$;

-- ---------------------------------------------------------------------------
-- Research dashboard (editors and admins): gaps worth researching next
-- ---------------------------------------------------------------------------
create function public.research_gaps(
  p_filter text default 'any',
  p_sort text default 'gaps',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  card jsonb,
  missing_father boolean,
  missing_mother boolean,
  missing_birth boolean,
  missing_death boolean,
  unsourced_facts integer,
  unsourced_vitals boolean,
  gap_count integer,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with base as (
    select
      p,
      not exists (
        select 1 from public.v_parent_child pc join public.v_persons f on f.id = pc.parent_id
        where pc.child_id = p.id and f.sex = 'male' and pc.relationship_type in ('biological', 'adoptive')
      ) as missing_father,
      not exists (
        select 1 from public.v_parent_child pc join public.v_persons m on m.id = pc.parent_id
        where pc.child_id = p.id and m.sex = 'female' and pc.relationship_type in ('biological', 'adoptive')
      ) as missing_mother,
      p.birth_date is null and coalesce(btrim(p.birth_text), '') = '' as missing_birth,
      not p.is_living and p.death_date is null and coalesce(btrim(p.death_text), '') = '' as missing_death,
      (
        select count(*)::integer from public.v_facts f
        where f.person_id = p.id
          and not exists (select 1 from public.v_citations c where c.fact_id = f.id)
      ) as unsourced_facts,
      (
        (p.birth_date is not null and not exists (
          select 1 from public.v_citations c where c.person_id = p.id and c.person_field = 'birth'))
        or (p.death_date is not null and not exists (
          select 1 from public.v_citations c where c.person_id = p.id and c.person_field = 'death'))
      ) as unsourced_vitals
    from public.v_persons p
    where public.is_editor()
  ),
  scored as (
    select b.*,
      (b.missing_father::integer + b.missing_mother::integer + b.missing_birth::integer
       + b.missing_death::integer + (b.unsourced_facts > 0)::integer + b.unsourced_vitals::integer) as gap_count
    from base b
  ),
  filtered as (
    select * from scored s
    where case p_filter
      when 'missing_parents' then s.missing_father or s.missing_mother
      when 'missing_father' then s.missing_father
      when 'missing_mother' then s.missing_mother
      when 'missing_dates' then s.missing_birth or s.missing_death
      when 'unsourced' then s.unsourced_facts > 0 or s.unsourced_vitals
      else s.gap_count > 0
    end
  )
  select
    public.person_card_json(f.p),
    f.missing_father, f.missing_mother, f.missing_birth, f.missing_death,
    f.unsourced_facts, f.unsourced_vitals, f.gap_count,
    count(*) over ()
  from filtered f
  order by
    case when p_sort = 'name' then (f.p).display_name end asc,
    case when p_sort = 'birth' then (f.p).birth_year end asc nulls last,
    case when p_sort = 'recent' then (f.p).created_at end desc,
    f.gap_count desc,
    (f.p).display_name
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0)
$$;

-- ---------------------------------------------------------------------------
-- Writes: create/update a person with all their names in one step
-- p_person holds persons columns (birth_date, clan, ...); p_names is an
-- array of {id?, name_type, title, given_names, surname, is_primary}.
-- ---------------------------------------------------------------------------
create function public.save_person(p_id uuid, p_person jsonb, p_names jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  r public.persons;
  v_id uuid;
  v_slug text;
  v_name jsonb;
  v_name_id uuid;
  v_keep uuid[] := '{}';
  v_primary_idx integer;
  v_idx integer := 0;
  v_first_name text;
begin
  if not public.is_editor() then
    raise exception 'Only editors can change people' using errcode = '42501';
  end if;
  if p_names is null or jsonb_typeof(p_names) <> 'array' or jsonb_array_length(p_names) = 0 then
    raise exception 'At least one name is required' using errcode = '22023';
  end if;

  perform public.begin_change_group();
  r := jsonb_populate_record(null::public.persons, coalesce(p_person, '{}'::jsonb));

  -- Which name is primary? The first one flagged, else the first one.
  select coalesce(min(ord) filter (where (n ->> 'is_primary')::boolean), 1)
  into v_primary_idx
  from jsonb_array_elements(p_names) with ordinality as t(n, ord);

  select public.format_person_name(n ->> 'title', n ->> 'given_names', n ->> 'surname')
  into v_first_name
  from jsonb_array_elements(p_names) with ordinality as t(n, ord)
  where ord = v_primary_idx;

  if p_id is null then
    insert into public.persons (
      slug, sex, is_living_override,
      birth_date, birth_precision, birth_qualifier, birth_date_end, birth_text, birth_place_id, birth_confidence,
      death_date, death_precision, death_qualifier, death_date_end, death_text, death_place_id, death_confidence,
      hometown_place_id, clan, totem, occupation, bio
    ) values (
      public.generate_person_slug(v_first_name), coalesce(r.sex, 'unknown'), r.is_living_override,
      r.birth_date, r.birth_precision, r.birth_qualifier, r.birth_date_end, nullif(btrim(r.birth_text), ''), r.birth_place_id, r.birth_confidence,
      r.death_date, r.death_precision, r.death_qualifier, r.death_date_end, nullif(btrim(r.death_text), ''), r.death_place_id, r.death_confidence,
      r.hometown_place_id, nullif(btrim(r.clan), ''), nullif(btrim(r.totem), ''), nullif(btrim(r.occupation), ''), nullif(btrim(r.bio), '')
    )
    returning id, slug into v_id, v_slug;
  else
    update public.persons set
      sex = coalesce(r.sex, 'unknown'),
      is_living_override = r.is_living_override,
      birth_date = r.birth_date, birth_precision = r.birth_precision, birth_qualifier = r.birth_qualifier,
      birth_date_end = r.birth_date_end, birth_text = nullif(btrim(r.birth_text), ''),
      birth_place_id = r.birth_place_id, birth_confidence = r.birth_confidence,
      death_date = r.death_date, death_precision = r.death_precision, death_qualifier = r.death_qualifier,
      death_date_end = r.death_date_end, death_text = nullif(btrim(r.death_text), ''),
      death_place_id = r.death_place_id, death_confidence = r.death_confidence,
      hometown_place_id = r.hometown_place_id,
      clan = nullif(btrim(r.clan), ''), totem = nullif(btrim(r.totem), ''),
      occupation = nullif(btrim(r.occupation), ''), bio = nullif(btrim(r.bio), '')
    where id = p_id and deleted_at is null
    returning id, slug into v_id, v_slug;

    if v_id is null then
      raise exception 'Person not found' using errcode = 'P0002';
    end if;
  end if;

  for v_name in select value from jsonb_array_elements(p_names)
  loop
    v_idx := v_idx + 1;
    v_name_id := nullif(v_name ->> 'id', '')::uuid;

    if v_name_id is not null and exists (
      select 1 from public.person_names where id = v_name_id and person_id = v_id
    ) then
      update public.person_names set
        name_type = coalesce((v_name ->> 'name_type')::public.name_type, 'birth'),
        title = nullif(btrim(v_name ->> 'title'), ''),
        given_names = nullif(btrim(v_name ->> 'given_names'), ''),
        surname = nullif(btrim(v_name ->> 'surname'), ''),
        is_primary = (v_idx = v_primary_idx),
        sort_order = v_idx
      where id = v_name_id;
    else
      insert into public.person_names (person_id, name_type, title, given_names, surname, is_primary, sort_order)
      values (
        v_id,
        coalesce((v_name ->> 'name_type')::public.name_type, 'birth'),
        nullif(btrim(v_name ->> 'title'), ''),
        nullif(btrim(v_name ->> 'given_names'), ''),
        nullif(btrim(v_name ->> 'surname'), ''),
        (v_idx = v_primary_idx),
        v_idx
      )
      returning id into v_name_id;
    end if;
    v_keep := v_keep || v_name_id;
  end loop;

  delete from public.person_names where person_id = v_id and not (id = any(v_keep));

  return jsonb_build_object('id', v_id, 'slug', v_slug);
end;
$$;

-- ---------------------------------------------------------------------------
-- Quick-add relative: create (or link) a person and the relationship in
-- one step. p_relation is father | mother | spouse | child | sibling.
-- p_options: relationship_type, confidence, other_parent_id (child),
--            shared_parent_ids (sibling), union {union_type, start_*, ...}.
-- ---------------------------------------------------------------------------
create function public.add_relative(
  p_anchor uuid,
  p_relation text,
  p_existing_id uuid default null,
  p_person jsonb default null,
  p_names jsonb default null,
  p_options jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_target uuid;
  v_slug text;
  v_type public.parent_relationship :=
    coalesce((p_options ->> 'relationship_type')::public.parent_relationship, 'biological');
  v_conf public.confidence_level :=
    coalesce((p_options ->> 'confidence')::public.confidence_level, 'confirmed');
  v_other uuid := nullif(p_options ->> 'other_parent_id', '')::uuid;
  v_shared uuid[];
  v_union jsonb := coalesce(p_options -> 'union', '{}'::jsonb);
  u public.unions;
  v_person jsonb := coalesce(p_person, '{}'::jsonb);
  v_saved jsonb;
  v_parent uuid;
begin
  if not public.is_editor() then
    raise exception 'Only editors can add relatives' using errcode = '42501';
  end if;
  if p_relation not in ('father', 'mother', 'spouse', 'child', 'sibling') then
    raise exception 'Unknown relation: %', p_relation using errcode = '22023';
  end if;
  if not exists (select 1 from public.persons where id = p_anchor and deleted_at is null) then
    raise exception 'Person not found' using errcode = 'P0002';
  end if;

  perform public.begin_change_group();

  if p_relation = 'sibling' then
    if p_options ? 'shared_parent_ids' then
      select array_agg(value::uuid) into v_shared
      from jsonb_array_elements_text(p_options -> 'shared_parent_ids');
    else
      select array_agg(parent_id) into v_shared
      from public.parent_child
      where child_id = p_anchor and relationship_type in ('biological', 'adoptive');
    end if;
    if v_shared is null or cardinality(v_shared) = 0 then
      raise exception 'Add a parent first, then add siblings through them'
        using errcode = '22023', hint = 'sibling_needs_parent';
    end if;
    if exists (
      select 1 from unnest(v_shared) s
      where not exists (select 1 from public.parent_child where child_id = p_anchor and parent_id = s)
    ) then
      raise exception 'Siblings must share a parent with this person' using errcode = '22023';
    end if;
  end if;

  if p_existing_id is not null then
    if p_existing_id = p_anchor then
      raise exception 'A person cannot be related to themselves this way' using errcode = '22023';
    end if;
    select id, slug into v_target, v_slug
    from public.persons where id = p_existing_id and deleted_at is null;
    if v_target is null then
      raise exception 'Person not found' using errcode = 'P0002';
    end if;
  else
    if p_relation = 'father' then
      v_person := v_person || '{"sex": "male"}'::jsonb;
    elsif p_relation = 'mother' then
      v_person := v_person || '{"sex": "female"}'::jsonb;
    end if;
    v_saved := public.save_person(null, v_person, p_names);
    v_target := (v_saved ->> 'id')::uuid;
    v_slug := v_saved ->> 'slug';
  end if;

  if p_relation in ('father', 'mother') then
    insert into public.parent_child (parent_id, child_id, relationship_type, confidence)
    values (v_target, p_anchor, v_type, v_conf)
    on conflict (parent_id, child_id) do nothing;

  elsif p_relation = 'child' then
    insert into public.parent_child (parent_id, child_id, relationship_type, confidence)
    values (p_anchor, v_target, v_type, v_conf)
    on conflict (parent_id, child_id) do nothing;
    if v_other is not null and v_other <> v_target then
      insert into public.parent_child (parent_id, child_id, relationship_type, confidence)
      values (v_other, v_target, v_type, v_conf)
      on conflict (parent_id, child_id) do nothing;
    end if;

  elsif p_relation = 'sibling' then
    foreach v_parent in array v_shared
    loop
      insert into public.parent_child (parent_id, child_id, relationship_type, confidence)
      values (
        v_parent, v_target,
        coalesce((
          select relationship_type from public.parent_child
          where parent_id = v_parent and child_id = p_anchor
        ), 'biological'),
        v_conf
      )
      on conflict (parent_id, child_id) do nothing;
    end loop;

  elsif p_relation = 'spouse' then
    u := jsonb_populate_record(null::public.unions, v_union);
    insert into public.unions (
      partner_a_id, partner_b_id, union_type,
      start_date, start_precision, start_qualifier, start_date_end, start_text,
      end_date, end_precision, end_qualifier, end_date_end, end_text, end_reason,
      partner_a_order, partner_b_order, confidence, notes
    ) values (
      p_anchor, v_target, coalesce(u.union_type, 'unknown'),
      u.start_date, u.start_precision, u.start_qualifier, u.start_date_end, nullif(btrim(u.start_text), ''),
      u.end_date, u.end_precision, u.end_qualifier, u.end_date_end, nullif(btrim(u.end_text), ''), u.end_reason,
      1 + (select count(*) from public.unions x where p_anchor in (x.partner_a_id, x.partner_b_id)),
      1 + (select count(*) from public.unions x where v_target in (x.partner_a_id, x.partner_b_id)),
      v_conf, nullif(btrim(u.notes), '')
    );
  end if;

  return jsonb_build_object(
    'id', v_target,
    'slug', v_slug,
    'warnings', coalesce((
      select jsonb_agg(jsonb_build_object('code', w.code, 'message', w.message))
      from public.relationship_warnings(v_target) w
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function
  public.person_card_json(public.v_persons),
  public.get_ancestors(uuid, integer, public.parent_relationship[]),
  public.get_descendants(uuid, integer, public.parent_relationship[]),
  public.get_tree_window(uuid, integer, integer, text),
  public.get_person_family(uuid),
  public.search_people(text, integer, integer),
  public.get_site_stats()
to authenticated, visitor;

grant execute on function
  public.find_possible_duplicates(text, text, integer, uuid),
  public.research_gaps(text, text, integer, integer),
  public.save_person(uuid, jsonb, jsonb),
  public.add_relative(uuid, text, uuid, jsonb, jsonb, jsonb)
to authenticated;

-- begin_change_group was re-created; restate its grant.
grant execute on function public.begin_change_group() to authenticated;
