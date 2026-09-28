-- Privacy: what anon, visitors, pending users and members can see.
-- Runs against the seeded sample family (supabase db reset).
begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

-- Two users: the first becomes an active admin, the second is pending.
-- Start from no users (rolled back at the end), whatever the local data.
delete from auth.users;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'admin@example.com', '{"full_name": "Admin"}'),
  ('22222222-2222-4222-8222-222222222222', 'relative@example.com', '{}');

select is(
  (select role::text || '/' || status::text from public.user_profiles where user_id = '11111111-1111-4111-8111-111111111111'),
  'admin/active', 'the first user becomes an active admin');
select is(
  (select role::text || '/' || status::text from public.user_profiles where user_id = '22222222-2222-4222-8222-222222222222'),
  'member/pending', 'later users are pending members');

-- Media covering each visitor rule.
insert into public.media (id, storage_path, media_type, mime_type) values
  ('f0000000-0000-4000-8000-000000000001', 'm1/original.jpg', 'photo', 'image/jpeg'),
  ('f0000000-0000-4000-8000-000000000002', 'm2/original.jpg', 'photo', 'image/jpeg'),
  ('f0000000-0000-4000-8000-000000000003', 'm3/original.jpg', 'photo', 'image/jpeg'),
  ('f0000000-0000-4000-8000-000000000004', 'm4/original.pdf', 'document', 'application/pdf'),
  ('f0000000-0000-4000-8000-000000000005', 'm5/original.jpg', 'photo', 'image/jpeg');
insert into public.media_people (media_id, person_id) values
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012'), -- living only
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003'), -- deceased only
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003'), -- mixed
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000012'),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000012');
update public.persons set profile_photo_id = 'f0000000-0000-4000-8000-000000000005'
  where id = 'a0000000-0000-4000-8000-000000000012';

-- Living status rules -------------------------------------------------------
select is(public.person_is_living_by_id('a0000000-0000-4000-8000-000000000012'), true, 'born 1941, no death: living');
select is(public.person_is_living_by_id('a0000000-0000-4000-8000-000000000003'), false, 'has a death date: deceased');
select is(public.person_is_living_by_id('a0000000-0000-4000-8000-000000000007'), false, 'free-text death: deceased');
select is(public.person_is_living_by_id('a0000000-0000-4000-8000-000000000002'), false, 'no dates but a child born > 100 years ago: deceased');
select is(public.person_is_living_by_id('a0000000-0000-4000-8000-000000000026'), true, 'no dates at all: living (safe default)');
select is(public.person_is_living_by_id('a0000000-0000-4000-8000-000000000015'), false, 'admin override wins');

-- anon gets nothing -----------------------------------------------------------
set local role anon;
select throws_ok('select * from public.v_persons', '42501', null, 'anon cannot read the views');
select throws_ok('select * from public.persons', '42501', null, 'anon cannot read base tables');
select throws_ok($$select public.search_people('Mensah')$$, '42501', null, 'anon cannot search');
reset role;

-- Visitor ---------------------------------------------------------------------
set local role visitor;
set local request.jwt.claims = '{"role": "visitor"}';

select throws_ok('select * from public.persons', '42501', null, 'visitor cannot read base tables');
select is((select display_name from public.v_persons where id = 'a0000000-0000-4000-8000-000000000012'),
  'Abena Mensah', 'visitor sees a living person''s name');
select is((select birth_year from public.v_persons where id = 'a0000000-0000-4000-8000-000000000012'),
  null, 'visitor does not see a living person''s birth year');
select is((select bio from public.v_persons where id = 'a0000000-0000-4000-8000-000000000012'),
  null, 'visitor does not see a living person''s bio');
select is((select clan from public.v_persons where id = 'a0000000-0000-4000-8000-000000000012'),
  null, 'visitor does not see a living person''s clan');
select is((select birth_year from public.v_persons where id = 'a0000000-0000-4000-8000-000000000003'),
  1898, 'visitor sees a deceased person''s birth year');
select is((select count(*)::integer from public.v_person_names where person_id = 'a0000000-0000-4000-8000-000000000012'),
  1, 'visitor sees only the primary name of a living person');
select is((select count(*)::integer from public.v_person_names where person_id = 'a0000000-0000-4000-8000-000000000003'),
  3, 'visitor sees all names of a deceased person');
select is((select count(*)::integer from public.v_facts where person_id = 'a0000000-0000-4000-8000-000000000029'),
  0, 'visitor does not see a living person''s facts');
select ok((select count(*) from public.v_facts where person_id = 'a0000000-0000-4000-8000-000000000008') > 0,
  'visitor sees a deceased person''s facts');
select ok((select count(*) from public.v_parent_child where child_id = 'a0000000-0000-4000-8000-000000000036') = 2,
  'visitor sees relationships of living people');
select is((select start_date from public.v_unions where id = 'e0000000-0000-4000-8000-000000000011'),
  null, 'visitor does not see the wedding date of living partners');
select is((select count(*)::integer from public.search_people('Grandma')),
  0, 'visitor cannot find a living person by nickname');
select ok((select count(*) from public.search_people('Abena Mensah')) >= 1,
  'visitor can find a living person by display name');
select is((select count(*)::integer from public.v_places where id = 'b0000000-0000-4000-8000-000000000006'),
  0, 'visitor does not see a place only used by a living person''s facts');
select is((select count(*)::integer from public.v_media where id = 'f0000000-0000-4000-8000-000000000001'),
  0, 'visitor cannot see a photo of a living person');
select is((select count(*)::integer from public.v_media where id = 'f0000000-0000-4000-8000-000000000002'),
  1, 'visitor can see a photo of a deceased person');
select is((select count(*)::integer from public.v_media where id = 'f0000000-0000-4000-8000-000000000003'),
  0, 'visitor cannot see a photo with living and deceased people');
select is((select count(*)::integer from public.v_media where id = 'f0000000-0000-4000-8000-000000000004'),
  0, 'visitor cannot see untagged media');
select is((select count(*)::integer from public.v_media where id = 'f0000000-0000-4000-8000-000000000005'),
  1, 'visitor can see a living person''s own profile photo');
reset role;

-- Pending user sees nothing -----------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}';
select is((select count(*)::integer from public.v_persons), 0, 'pending user sees no people');
select is((select count(*)::integer from public.persons), 0, 'pending user cannot read base tables through RLS');
reset role;

-- Active member sees everything --------------------------------------------------
update public.user_profiles set status = 'active' where user_id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-4222-8222-222222222222", "role": "authenticated"}';
select is((select birth_year from public.v_persons where id = 'a0000000-0000-4000-8000-000000000012'),
  1941, 'member sees a living person''s birth year');
select is((select count(*)::integer from public.v_person_names where person_id = 'a0000000-0000-4000-8000-000000000012'),
  3, 'member sees all names of a living person');
select is_empty(
  $$update public.persons set clan = 'x' where id = 'a0000000-0000-4000-8000-000000000012' returning id$$,
  'member cannot edit people');
select ok((select count(*) from public.search_people('Grandma')) >= 1,
  'member can find a living person by nickname');
reset role;

select * from finish();
rollback;
