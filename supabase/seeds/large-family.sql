-- OPTIONAL load-test data: adds ~3,500 synthetic people over ~10 generations
-- on top of the sample family, to check the tree and search stay fast.
-- Local development only:
--   psql "$DB_URL" -f supabase/seeds/large-family.sql
-- Remove again with: supabase db reset
do $$
declare
  given_m text[] := array['Kwame','Kofi','Kwaku','Yaw','Kwabena','Kwadwo','Kwasi','Kojo','Kwesi','Akwasi','Samuel','Daniel','Joseph','Emmanuel','Isaac'];
  given_f text[] := array['Ama','Akosua','Abena','Adwoa','Afua','Yaa','Akua','Esi','Efua','Adjoa','Grace','Comfort','Mercy','Victoria','Linda'];
  surnames text[] := array['Boateng','Owusu','Asante','Appiah','Osei','Agyeman','Darko','Ofori','Nkansah','Amponsah','Tetteh','Adjei','Frimpong','Opoku','Sarpong'];
  generation uuid[];
  next_gen uuid[];
  parent uuid;
  spouse uuid;
  child uuid;
  g integer;
  i integer;
  kids integer;
  total integer := 0;
  born integer;
begin
  create temp table if not exists _people (id uuid primary key, sex public.sex_type, birth_year integer) on commit drop;

  generation := array[]::uuid[];
  for i in 1..6 loop
    parent := gen_random_uuid();
    insert into public.persons (id, slug, sex, birth_date, birth_precision, birth_qualifier)
    values (parent, 'load-root-' || i || '-' || substr(parent::text, 1, 6), 'male',
            make_date(1760 + i, 1, 1), 'year', 'about');
    insert into public.person_names (person_id, given_names, surname, is_primary)
    values (parent, given_m[1 + (i % 15)], surnames[1 + (i % 15)], true);
    insert into _people values (parent, 'male', 1760 + i);
    generation := generation || parent;
    total := total + 1;
  end loop;

  for g in 1..10 loop
    exit when total >= 3500;
    next_gen := array[]::uuid[];
    foreach parent in array generation loop
      exit when total >= 3500;
      select birth_year into born from _people where id = parent;

      -- a spouse
      spouse := gen_random_uuid();
      insert into public.persons (id, slug, sex, birth_date, birth_precision, birth_qualifier)
      values (spouse, 'load-' || substr(spouse::text, 1, 12),
              (case when (select sex from _people where id = parent) = 'male' then 'female' else 'male' end)::public.sex_type,
              make_date(born + 2, 1, 1), 'year', 'exact');
      insert into public.person_names (person_id, given_names, surname, is_primary)
      values (spouse,
              given_f[1 + floor(random() * 15)::int],
              surnames[1 + floor(random() * 15)::int], true);
      insert into _people select spouse, sex, born + 2 from public.persons where id = spouse;
      insert into public.unions (partner_a_id, partner_b_id, union_type) values (parent, spouse, 'customary');
      total := total + 1;

      kids := 2 + floor(random() * 3)::int;
      for i in 1..kids loop
        child := gen_random_uuid();
        insert into public.persons (id, slug, sex, birth_date, birth_precision, birth_qualifier)
        values (child, 'load-' || substr(child::text, 1, 12),
                case when random() < 0.5 then 'male' else 'female' end::public.sex_type,
                make_date(born + 25 + i * 2, 1, 1), 'year', 'exact');
        insert into public.person_names (person_id, given_names, surname, is_primary)
        values (child, given_m[1 + floor(random() * 15)::int], surnames[1 + floor(random() * 15)::int], true);
        insert into _people select child, sex, born + 25 + i * 2 from public.persons where id = child;
        insert into public.parent_child (parent_id, child_id) values (parent, child), (spouse, child);
        next_gen := next_gen || child;
        total := total + 1;
      end loop;
    end loop;
    generation := next_gen;
  end loop;

  raise notice 'Added % load-test people', total;
end;
$$;
