-- Writes through the RPCs as real roles: editors can, members cannot,
-- and every change lands in the audit log grouped by change_group.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Start from no users (rolled back at the end), whatever the local data.
delete from auth.users;

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'admin@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'member@example.com');
update public.user_profiles set status = 'active' where user_id = '33333333-3333-4333-8333-333333333333';

-- Admin (an editor) --------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$select public.save_person(
      null,
      '{"sex": "female", "birth_date": "1950-01-01", "birth_precision": "year", "birth_qualifier": "about"}',
      '[{"name_type": "birth", "given_names": "Serwaa", "surname": "Test"},
        {"name_type": "day", "given_names": "Akosua"}]')$$,
  'an editor can create a person with several names');

select is(
  (select display_name from public.persons where display_name = 'Serwaa Test'),
  'Serwaa Test', 'display_name comes from the first (primary) name');

create temp table added on commit drop as
select public.add_relative(
  'a0000000-0000-4000-8000-000000000003', 'child', null,
  '{"sex": "female"}',
  '[{"given_names": "Ama Pokua", "surname": "Mensah"}]',
  '{"other_parent_id": "a0000000-0000-4000-8000-000000000005"}') as r;
grant select on added to authenticated;

select ok((select r ->> 'slug' from added) like 'ama-pokua-mensah-%', 'add_relative creates the child with a slug');
select is(
  (select count(*)::integer from public.parent_child where child_id = (select (r ->> 'id')::uuid from added)),
  2, 'the child is linked to both parents');

select lives_ok(
  $$select public.add_relative('a0000000-0000-4000-8000-000000000038', 'father',
      'a0000000-0000-4000-8000-000000000025', null, null, '{}')$$,
  'an editor can link an existing person as father');

select throws_ok(
  $$select public.add_relative('a0000000-0000-4000-8000-000000000001', 'father',
      'a0000000-0000-4000-8000-000000000036', null, null, '{}')$$,
  '23514', 'A person cannot be their own ancestor', 'linking a descendant as an ancestor is refused');

select throws_ok(
  $$select public.add_relative('a0000000-0000-4000-8000-000000000026', 'sibling', null,
      '{}', '[{"given_names": "X"}]', '{}')$$,
  '22023', null, 'a sibling needs a shared parent first');

select lives_ok(
  $$select public.add_relative('a0000000-0000-4000-8000-000000000030', 'spouse', null,
      '{"sex": "female"}', '[{"given_names": "Second", "surname": "Wife"}]',
      '{"union": {"union_type": "customary", "start_date": "2024-01-01", "start_precision": "year", "start_qualifier": "exact"}}')$$,
  'an editor can add a second spouse');
select is(
  (select max(partner_a_order) from public.unions where partner_a_id = 'a0000000-0000-4000-8000-000000000030'),
  2, 'the second spouse is numbered 2 for this person');

select ok(
  (select public.add_relative(
     'a0000000-0000-4000-8000-000000000036', 'child', null,
     '{"sex": "male", "birth_date": "1990-01-01", "birth_precision": "year", "birth_qualifier": "exact"}',
     '[{"given_names": "Too", "surname": "Early"}]', '{}') -> 'warnings') @> '[{"code": "child_before_parent"}]',
  'odd dates come back as warnings but are not blocked');
reset role;

-- Audit log ----------------------------------------------------------------
select ok(
  exists (
    select 1 from public.audit_log
    where actor_id = '11111111-1111-4111-8111-111111111111' and table_name = 'persons' and action = 'insert'
  ),
  'changes are logged with the editor as actor');
select ok(
  (
    with new_id as (select (r ->> 'id') as id from added),
    rows as (
      select a.change_group
      from public.audit_log a, new_id
      where (a.table_name = 'persons' and a.after ->> 'id' = new_id.id)
         or (a.table_name = 'person_names' and a.after ->> 'person_id' = new_id.id)
         or (a.table_name = 'parent_child' and a.after ->> 'child_id' = new_id.id)
    )
    select count(*) >= 4 and count(distinct change_group) = 1 and bool_and(change_group is not null)
    from rows
  ),
  'add_relative logs the person, the name and both links in one change group');

-- Member (not an editor) ----------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}';
select throws_ok(
  $$select public.save_person(null, '{}', '[{"given_names": "Nope"}]')$$,
  '42501', null, 'a member cannot create people');
select throws_ok(
  $$select public.add_relative('a0000000-0000-4000-8000-000000000003', 'child', null, '{}', '[{"given_names": "Nope"}]', '{}')$$,
  '42501', null, 'a member cannot add relatives');
reset role;

select * from finish();
rollback;
