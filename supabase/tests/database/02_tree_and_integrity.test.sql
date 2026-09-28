-- Tree queries, search and relationship integrity, on the sample family.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- Ancestors / descendants ------------------------------------------------------
select is(
  (select count(*)::integer from public.get_ancestors('a0000000-0000-4000-8000-000000000028', 10)),
  8, 'Kwame (1984) has 8 known ancestors');
select is(
  (select generation from public.get_ancestors('a0000000-0000-4000-8000-000000000028', 10)
   where person_id = 'a0000000-0000-4000-8000-000000000001'),
  4, 'Nana Kwaku is 4 generations above Kwame (1984)');
select is(
  (select count(*)::integer from public.get_ancestors('a0000000-0000-4000-8000-000000000028', 2)),
  4, 'the generation limit is respected');
select ok(
  exists (select 1 from public.get_descendants('a0000000-0000-4000-8000-000000000003', 10)
          where person_id = 'a0000000-0000-4000-8000-000000000039'),
  'Kwabena (2020) descends from Opanyin Kwame');
select ok(
  exists (select 1 from public.get_descendants('a0000000-0000-4000-8000-000000000011', 1)
          where person_id = 'a0000000-0000-4000-8000-000000000023'),
  'an adopted child counts as a descendant');
select ok(
  not exists (select 1 from public.get_descendants('a0000000-0000-4000-8000-000000000027', 1)
              where person_id = 'a0000000-0000-4000-8000-000000000030'),
  'a step-child does not count as a descendant');

-- Tree window: paternal (the default) ------------------------------------------
create temp table w as
select public.get_tree_window('a0000000-0000-4000-8000-000000000028', 3, 2, 'paternal') as j;

create temp view wn as
select (n ->> 'id')::uuid as id, (n ->> 'onLine')::boolean as on_line, n
from w, jsonb_array_elements(w.j -> 'nodes') n;

select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000003' and on_line),
  'paternal: great-grandfather Kwame is on the line');
select ok(not exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000001'),
  'paternal: 4th generation up is outside a 3-generation window');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000003'
                  and (n ->> 'hasMoreParents')::boolean),
  'paternal: the top of the window can be expanded');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000024' and not on_line),
  'paternal: the mother is shown but not on the line');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000011'),
  'paternal: a half-sibling of a line ancestor is included');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000029'),
  'paternal: a sibling of the focus is included');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000035'),
  'paternal: the spouse of the focus is included');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000036' and on_line),
  'paternal: the focus''s children are on the line');
select is(
  (select count(*)::integer from w, jsonb_array_elements(w.j -> 'unions') u
   where u ->> 'id' = 'e0000000-0000-4000-8000-000000000003'),
  1, 'paternal: Kwame''s second marriage is included');

-- Paternal going down stops at daughters
drop view wn;
drop table w;
create temp table w as
select public.get_tree_window('a0000000-0000-4000-8000-000000000017', 1, 2, 'paternal') as j;
create temp view wn as
select (n ->> 'id')::uuid as id, (n ->> 'onLine')::boolean as on_line, n
from w, jsonb_array_elements(w.j -> 'nodes') n;

select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000029' and on_line),
  'paternal down: a daughter is on the line');
select ok(not exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000038'),
  'paternal down: a daughter''s child is collapsed');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000029'
                  and (n ->> 'hasMoreChildren')::boolean),
  'paternal down: the daughter shows an expand button');
select ok(exists (select 1 from wn where id = 'a0000000-0000-4000-8000-000000000036'),
  'paternal down: a son''s child is included');

-- Both lines include the daughter's child
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.get_tree_window('a0000000-0000-4000-8000-000000000017', 1, 2, 'both') -> 'nodes') n
    where n ->> 'id' = 'a0000000-0000-4000-8000-000000000038'
  ),
  'both: a daughter''s child is included');

-- Maternal follows mothers
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.get_tree_window('a0000000-0000-4000-8000-000000000011', 2, 0, 'maternal') -> 'nodes') n
    where n ->> 'id' = 'a0000000-0000-4000-8000-000000000005' and (n ->> 'onLine')::boolean
  ),
  'maternal: the mother is on the line');
select ok(
  exists (
    select 1
    from jsonb_array_elements(public.get_tree_window('a0000000-0000-4000-8000-000000000011', 2, 0, 'maternal') -> 'nodes') n
    where n ->> 'id' = 'a0000000-0000-4000-8000-000000000003' and not (n ->> 'onLine')::boolean
  ),
  'maternal: the father is shown but not on the line');

-- Step links are returned with their type (drawn dashed)
select is(
  (select e ->> 'type'
   from jsonb_array_elements(public.get_tree_window('a0000000-0000-4000-8000-000000000030', 1, 0, 'both') -> 'edges') e
   where e ->> 'parentId' = 'a0000000-0000-4000-8000-000000000027'
     and e ->> 'childId' = 'a0000000-0000-4000-8000-000000000030'),
  'step', 'step-parent links keep their type');

-- Search -----------------------------------------------------------------------
select ok(
  exists (select 1 from public.search_people('Kwabenna') where id = 'a0000000-0000-4000-8000-000000000008'),
  'search tolerates a misspelling');
select ok(
  exists (select 1 from public.search_people('Victoria') where id = 'a0000000-0000-4000-8000-000000000005'),
  'search matches a baptismal name');

-- Integrity --------------------------------------------------------------------
select throws_ok(
  $$insert into public.parent_child (parent_id, child_id)
    values ('a0000000-0000-4000-8000-000000000036', 'a0000000-0000-4000-8000-000000000001')$$,
  '23514', 'A person cannot be their own ancestor', 'cycles are rejected');
select throws_ok(
  $$insert into public.parent_child (parent_id, child_id)
    values ('a0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000028')$$,
  '23514', 'A person can have at most 2 biological parents', 'a third biological parent is rejected');
select lives_ok(
  $$insert into public.parent_child (parent_id, child_id, relationship_type)
    values ('a0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000028', 'guardian')$$,
  'a guardian can be added alongside two biological parents');

select * from finish();
rollback;
