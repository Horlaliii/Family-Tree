-- OurFamilyTree sample family: the (fictional) Mensah family.
-- 40 people over 6 generations. It includes:
--   * Opanyin Kwame Mensah (p03) with two concurrent wives and children by each
--   * half-siblings (p08-p10 vs p11-p13; p30 vs p31-p32)
--   * an adopted child (p23), a step-mother (p27) and a guardian (p12)
--   * day names, baptismal names, married names and nicknames
--   * unknown dates (p02, p26), "about" dates, a "between" date (p07) and a
--     free-text death ("during the Second World War")
--   * missing parents (p34 has no mother, p38 has no father)
--   * living and deceased people, including one deceased only because a
--     child was born more than 100 years ago (p02) and one marked deceased
--     by the admin (p15)
--
-- Family passcode for local development: family-tree  (change it in Admin → Settings)

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------
insert into public.places (id, name, town, region, country, lat, lng) values
  ('b0000000-0000-4000-8000-000000000001', 'Kumasi', 'Kumasi', 'Ashanti', 'Ghana', 6.6885, -1.6244),
  ('b0000000-0000-4000-8000-000000000002', 'Accra', 'Accra', 'Greater Accra', 'Ghana', 5.6037, -0.1870),
  ('b0000000-0000-4000-8000-000000000003', 'Cape Coast', 'Cape Coast', 'Central', 'Ghana', 5.1053, -1.2466),
  ('b0000000-0000-4000-8000-000000000004', 'Kibi', 'Kibi', 'Eastern', 'Ghana', 6.1667, -0.5500),
  ('b0000000-0000-4000-8000-000000000005', 'Mampong', 'Mampong', 'Ashanti', 'Ghana', 7.0627, -1.4001),
  ('b0000000-0000-4000-8000-000000000006', 'London', 'London', 'England', 'United Kingdom', 51.5072, -0.1276),
  ('b0000000-0000-4000-8000-000000000007', 'Wesley Methodist Church', 'Kumasi', 'Ashanti', 'Ghana', null, null),
  ('b0000000-0000-4000-8000-000000000008', 'Mensah family cemetery', 'Mampong', 'Ashanti', 'Ghana', null, null);

-- ---------------------------------------------------------------------------
-- People (dates first; extra details are filled in below)
-- ---------------------------------------------------------------------------
insert into public.persons
  (id, slug, sex, birth_date, birth_precision, birth_qualifier, death_date, death_precision, death_qualifier)
values
  -- Generation 1
  ('a0000000-0000-4000-8000-000000000001', 'nana-kwaku-boateng-mensah', 'male',   '1868-01-01', 'year', 'about', '1941-03-14', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000002', 'akosua-afriyie',            'female', null,         null,   null,    null,         null,   null),
  -- Generation 2
  ('a0000000-0000-4000-8000-000000000003', 'kwame-mensah-1898',         'male',   '1898-01-01', 'year', 'exact', '1972-08-02', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000004', 'ama-serwaa',                'female', '1902-01-01', 'year', 'about', '1960-01-01', 'year', 'exact'),
  ('a0000000-0000-4000-8000-000000000005', 'yaa-asantewaa-owusu',       'female', '1915-05-20', 'day',  'exact', '1995-11-03', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000006', 'kofi-mensah-1900',          'male',   '1900-01-01', 'year', 'exact', '1930-01-01', 'year', 'exact'),
  ('a0000000-0000-4000-8000-000000000007', 'adwoa-mensah-1903',         'female', '1903-01-01', 'year', 'exact',   null,       null,   null),
  -- Generation 3: Kwame + Ama Serwaa
  ('a0000000-0000-4000-8000-000000000008', 'kwabena-mensah-1925',       'male',   '1925-02-10', 'day',  'exact', '2001-06-30', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000009', 'efua-mensah',               'female', '1928-01-01', 'year', 'exact', '2010-01-15', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000010', 'kwesi-mensah',              'male',   '1931-01-01', 'year', 'about', '1989-01-01', 'year', 'exact'),
  -- Generation 3: Kwame + Yaa Asantewaa
  ('a0000000-0000-4000-8000-000000000011', 'akwasi-mensah',             'male',   '1938-07-04', 'day',  'exact', '2019-12-01', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000012', 'abena-mensah',              'female', '1941-10-12', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000013', 'kojo-mensah',               'male',   '1944-01-01', 'year', 'exact', '2020-04-22', 'day',  'exact'),
  -- Generation 3: spouses
  ('a0000000-0000-4000-8000-000000000014', 'comfort-adjei',             'female', '1930-01-01', 'year', 'exact', '2015-09-09', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000015', 'charles-ofori',             'male',   '1925-01-01', 'year', 'about', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000016', 'akua-donkor',               'female', '1942-03-03', 'day',  'exact', null,         null,   null),
  -- Generation 4
  ('a0000000-0000-4000-8000-000000000017', 'samuel-kwadwo-mensah',      'male',   '1952-04-21', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000018', 'rebecca-mensah',            'female', '1955-12-25', 'day',  'exact', '2018-02-14', 'day',  'exact'),
  ('a0000000-0000-4000-8000-000000000019', 'daniel-mensah',             'male',   '1958-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000020', 'esi-ofori',                 'female', '1950-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000021', 'yaw-mensah',                'male',   '1965-01-07', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000022', 'adjoa-mensah',              'female', '1968-06-17', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000023', 'kofi-asante',               'male',   '1970-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000024', 'grace-amponsah',            'female', '1956-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000025', 'michael-asare',             'male',   '1966-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000026', 'mercy-boakye',              'female', null,         null,   null,    null,         null,   null),
  ('a0000000-0000-4000-8000-000000000027', 'linda-owusu',               'female', '1972-01-01', 'year', 'exact', null,         null,   null),
  -- Generation 5
  ('a0000000-0000-4000-8000-000000000028', 'kwame-mensah-1984',         'male',   '1984-09-02', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000029', 'akosua-mensah',             'female', '1988-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000030', 'kwadwo-mensah',             'male',   '1990-03-12', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000031', 'ama-mensah',                'female', '1998-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000032', 'kwaku-mensah',              'male',   '2001-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000033', 'nana-yaw-asare',            'male',   '1994-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000034', 'esi-mensah',                'female', '1990-01-01', 'year', 'about', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000035', 'abigail-tetteh',            'female', '1987-01-01', 'year', 'exact', null,         null,   null),
  -- Generation 6
  ('a0000000-0000-4000-8000-000000000036', 'kofi-mensah-2015',          'male',   '2015-06-19', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000037', 'adwoa-mensah-2018',         'female', '2018-11-02', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000038', 'yaa-boateng',               'female', '2012-01-01', 'year', 'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000039', 'kwabena-mensah-2020',       'male',   '2020-08-08', 'day',  'exact', null,         null,   null),
  ('a0000000-0000-4000-8000-000000000040', 'efua-nkansah',              'female', '1992-01-01', 'year', 'exact', null,         null,   null);

-- "Between 1903 and 1906"; died "during the Second World War" (no date)
update public.persons set birth_qualifier = 'between', birth_date_end = '1906-01-01', death_text = 'during the Second World War'
  where id = 'a0000000-0000-4000-8000-000000000007';
-- No death date recorded, but known to have died: admin override
update public.persons set is_living_override = false
  where id = 'a0000000-0000-4000-8000-000000000015';

-- Places, clan and totem (the abusua passes through the mother), work, bios
update public.persons set
  birth_place_id = 'b0000000-0000-4000-8000-000000000005',
  death_place_id = 'b0000000-0000-4000-8000-000000000005',
  hometown_place_id = 'b0000000-0000-4000-8000-000000000005',
  clan = 'Oyoko', totem = 'Falcon',
  occupation = 'Odikro (village chief) and cocoa farmer',
  birth_confidence = 'family_account', death_confidence = 'confirmed',
  bio = E'Nana Kwaku Boateng Mensah is the earliest ancestor the family remembers by name.\n\nHe was **Odikro of the village** for about thirty years and planted some of the first cocoa farms around Mampong. Stories about him are still told at every funeral.'
  where id = 'a0000000-0000-4000-8000-000000000001';

update public.persons set clan = 'Asona', totem = 'Crow', hometown_place_id = 'b0000000-0000-4000-8000-000000000005'
  where id in ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003',
               'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007');

update public.persons set
  birth_place_id = 'b0000000-0000-4000-8000-000000000005',
  death_place_id = 'b0000000-0000-4000-8000-000000000001',
  occupation = 'Cocoa farmer and trader',
  birth_confidence = 'family_account', death_confidence = 'confirmed',
  bio = E'Opanyin Kwame Mensah married twice under customary law and had children with both wives, Ama Serwaa and Yaa Asantewaa. He moved the family''s trade to Kumasi in the 1930s.'
  where id = 'a0000000-0000-4000-8000-000000000003';

update public.persons set clan = 'Bretuo', totem = 'Leopard'
  where id in ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008',
               'a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000010');

update public.persons set clan = 'Aduana', totem = 'Dog'
  where id in ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000011',
               'a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000013');

update public.persons set
  birth_place_id = 'b0000000-0000-4000-8000-000000000004',
  death_place_id = 'b0000000-0000-4000-8000-000000000001',
  occupation = 'Trader',
  bio = 'Known to everyone at Kejetia market as Maame Yaa.'
  where id = 'a0000000-0000-4000-8000-000000000005';

update public.persons set
  birth_place_id = 'b0000000-0000-4000-8000-000000000005',
  death_place_id = 'b0000000-0000-4000-8000-000000000001',
  occupation = 'Headmaster', birth_confidence = 'confirmed', death_confidence = 'confirmed',
  bio = 'Taught at the Methodist school in Kumasi for over thirty years.'
  where id = 'a0000000-0000-4000-8000-000000000008';

update public.persons set
  birth_place_id = 'b0000000-0000-4000-8000-000000000001',
  death_place_id = 'b0000000-0000-4000-8000-000000000002',
  occupation = 'Civil servant'
  where id = 'a0000000-0000-4000-8000-000000000011';

update public.persons set
  birth_place_id = 'b0000000-0000-4000-8000-000000000001',
  hometown_place_id = 'b0000000-0000-4000-8000-000000000005',
  occupation = 'Retired seamstress',
  bio = 'Grandma Abena is the family''s keeper of stories. Much of what we know about the early generations comes from her.'
  where id = 'a0000000-0000-4000-8000-000000000012';

update public.persons set birth_place_id = 'b0000000-0000-4000-8000-000000000002', occupation = 'Engineer'
  where id = 'a0000000-0000-4000-8000-000000000021';
update public.persons set birth_place_id = 'b0000000-0000-4000-8000-000000000001', occupation = 'Accountant'
  where id = 'a0000000-0000-4000-8000-000000000017';
update public.persons set birth_place_id = 'b0000000-0000-4000-8000-000000000002', occupation = 'Doctor'
  where id = 'a0000000-0000-4000-8000-000000000029';

-- ---------------------------------------------------------------------------
-- Names
-- ---------------------------------------------------------------------------
insert into public.person_names (person_id, name_type, title, given_names, surname, is_primary, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'birth',     'Nana',    'Kwaku Boateng', 'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000001', 'day',       null,      'Kwaku',         null,      false, 2),
  ('a0000000-0000-4000-8000-000000000002', 'birth',     null,      'Akosua',        'Afriyie', true,  1),
  ('a0000000-0000-4000-8000-000000000003', 'birth',     'Opanyin', 'Kwame',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000003', 'baptismal', null,      'Joseph',        'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000003', 'nickname',  null,      'Agya Kwame',    null,      false, 3),
  ('a0000000-0000-4000-8000-000000000004', 'birth',     null,      'Ama',           'Serwaa',  true,  1),
  ('a0000000-0000-4000-8000-000000000004', 'married',   null,      'Ama',           'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000005', 'birth',     null,      'Yaa Asantewaa', 'Owusu',   true,  1),
  ('a0000000-0000-4000-8000-000000000005', 'baptismal', null,      'Victoria',      'Owusu',   false, 2),
  ('a0000000-0000-4000-8000-000000000005', 'nickname',  null,      'Maame Yaa',     null,      false, 3),
  ('a0000000-0000-4000-8000-000000000006', 'birth',     null,      'Kofi',          'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000007', 'birth',     null,      'Adwoa',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000008', 'birth',     null,      'Kwabena',       'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000008', 'baptismal', null,      'Joseph Kwabena','Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000009', 'birth',     null,      'Efua',          'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000009', 'married',   null,      'Efua',          'Ofori',   false, 2),
  ('a0000000-0000-4000-8000-000000000010', 'birth',     null,      'Kwesi',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000010', 'nickname',  null,      'Paa Kwesi',     null,      false, 2),
  ('a0000000-0000-4000-8000-000000000011', 'birth',     null,      'Akwasi',        'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000011', 'baptismal', null,      'Emmanuel',      'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000012', 'birth',     null,      'Abena',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000012', 'baptismal', null,      'Grace Abena',   'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000012', 'nickname',  null,      'Grandma Abena', null,      false, 3),
  ('a0000000-0000-4000-8000-000000000013', 'birth',     null,      'Kojo',          'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000014', 'birth',     null,      'Comfort',       'Adjei',   true,  1),
  ('a0000000-0000-4000-8000-000000000014', 'married',   null,      'Comfort',       'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000015', 'birth',     null,      'Charles',       'Ofori',   true,  1),
  ('a0000000-0000-4000-8000-000000000016', 'birth',     null,      'Akua',          'Donkor',  true,  1),
  ('a0000000-0000-4000-8000-000000000017', 'birth',     null,      'Samuel Kwadwo', 'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000017', 'day',       null,      'Kwadwo',        null,      false, 2),
  ('a0000000-0000-4000-8000-000000000018', 'birth',     null,      'Rebecca',       'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000019', 'birth',     null,      'Daniel',        'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000020', 'birth',     null,      'Esi',           'Ofori',   true,  1),
  ('a0000000-0000-4000-8000-000000000021', 'birth',     null,      'Yaw',           'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000022', 'birth',     null,      'Adjoa',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000022', 'married',   null,      'Adjoa',         'Asare',   false, 2),
  ('a0000000-0000-4000-8000-000000000023', 'birth',     null,      'Kofi',          'Asante',  true,  1),
  ('a0000000-0000-4000-8000-000000000023', 'other',     null,      'Kofi',          'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000024', 'birth',     null,      'Grace',         'Amponsah',true,  1),
  ('a0000000-0000-4000-8000-000000000025', 'birth',     null,      'Michael',       'Asare',   true,  1),
  ('a0000000-0000-4000-8000-000000000026', 'birth',     null,      'Mercy',         'Boakye',  true,  1),
  ('a0000000-0000-4000-8000-000000000027', 'birth',     null,      'Linda',         'Owusu',   true,  1),
  ('a0000000-0000-4000-8000-000000000028', 'birth',     null,      'Kwame',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000028', 'nickname',  null,      'Kay',           null,      false, 2),
  ('a0000000-0000-4000-8000-000000000029', 'birth',     null,      'Akosua',        'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000030', 'birth',     null,      'Kwadwo',        'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000031', 'birth',     null,      'Ama',           'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000032', 'birth',     null,      'Kwaku',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000033', 'birth',     'Nana',    'Yaw',           'Asare',   true,  1),
  ('a0000000-0000-4000-8000-000000000034', 'birth',     null,      'Esi',           'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000035', 'birth',     null,      'Abigail',       'Tetteh',  true,  1),
  ('a0000000-0000-4000-8000-000000000035', 'married',   null,      'Abigail',       'Mensah',  false, 2),
  ('a0000000-0000-4000-8000-000000000036', 'birth',     null,      'Kofi',          'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000037', 'birth',     null,      'Adwoa',         'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000038', 'birth',     null,      'Yaa',           'Boateng', true,  1),
  ('a0000000-0000-4000-8000-000000000039', 'birth',     null,      'Kwabena',       'Mensah',  true,  1),
  ('a0000000-0000-4000-8000-000000000040', 'birth',     null,      'Efua',          'Nkansah', true,  1);

-- ---------------------------------------------------------------------------
-- Parents and children
-- ---------------------------------------------------------------------------
insert into public.parent_child (parent_id, child_id, relationship_type, confidence) values
  -- Nana Kwaku + Akosua Afriyie -> Kwame, Kofi, Adwoa
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'biological', 'family_account'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'biological', 'family_account'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', 'biological', 'family_account'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 'biological', 'family_account'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'biological', 'uncertain'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007', 'biological', 'uncertain'),
  -- Kwame + Ama Serwaa -> Kwabena, Efua, Kwesi
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000009', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000009', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000010', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000010', 'biological', 'confirmed'),
  -- Kwame + Yaa Asantewaa -> Akwasi, Abena, Kojo (half-siblings of the above)
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000011', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000011', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000012', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000012', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000013', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000013', 'biological', 'confirmed'),
  -- Kwabena + Comfort -> Samuel, Rebecca, Daniel
  ('a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000017', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000017', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000018', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000018', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000019', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000019', 'biological', 'confirmed'),
  -- Efua + Charles -> Esi Ofori
  ('a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000020', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000020', 'biological', 'confirmed'),
  -- Akwasi + Akua -> Yaw, Adjoa; Kofi Asante adopted
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000021', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000021', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000022', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000022', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000023', 'adoptive',   'confirmed'),
  ('a0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000023', 'adoptive',   'confirmed'),
  -- Samuel + Grace -> Kwame (1984), Akosua
  ('a0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000028', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000028', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000029', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000029', 'biological', 'confirmed'),
  -- Yaw + Mercy -> Kwadwo; Yaw + Linda -> Ama, Kwaku; Linda is Kwadwo's step-mother
  ('a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000030', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-000000000030', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000030', 'step',       'confirmed'),
  ('a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000031', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000031', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000032', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000032', 'biological', 'confirmed'),
  -- Adjoa + Michael -> Nana Yaw Asare
  ('a0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000033', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000033', 'biological', 'confirmed'),
  -- Daniel -> Esi Mensah (mother unknown); Grandma Abena is her guardian
  ('a0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000034', 'biological', 'family_account'),
  ('a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000034', 'guardian',   'confirmed'),
  -- Kwame (1984) + Abigail -> Kofi (2015), Adwoa (2018)
  ('a0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000036', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000035', 'a0000000-0000-4000-8000-000000000036', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000037', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000035', 'a0000000-0000-4000-8000-000000000037', 'biological', 'confirmed'),
  -- Akosua -> Yaa Boateng (father unknown)
  ('a0000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-000000000038', 'biological', 'confirmed'),
  -- Kwadwo + Efua Nkansah -> Kwabena (2020)
  ('a0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000039', 'biological', 'confirmed'),
  ('a0000000-0000-4000-8000-000000000040', 'a0000000-0000-4000-8000-000000000039', 'biological', 'confirmed');

-- ---------------------------------------------------------------------------
-- Unions (partner_a_order / partner_b_order: which spouse this is for each)
-- ---------------------------------------------------------------------------
insert into public.unions
  (id, partner_a_id, partner_b_id, union_type, start_date, start_precision, start_qualifier,
   end_date, end_precision, end_qualifier, end_reason, partner_a_order, partner_b_order, confidence)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'customary', '1895-01-01', 'year', 'about', '1941-03-14', 'day', 'exact', 'death', 1, 1, 'family_account'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'customary', '1924-01-01', 'year', 'exact', '1960-01-01', 'year', 'exact', 'death', 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005', 'customary', '1936-01-01', 'year', 'exact', '1972-08-02', 'day', 'exact', 'death', 2, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000014', 'church',    '1950-12-16', 'day',  'exact', null, null, null, null, 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000009', 'church',    '1948-01-01', 'year', 'about', null, null, null, null, 1, 1, 'family_account'),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000016', 'customary', '1963-01-01', 'year', 'exact', null, null, null, null, 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000024', 'church',    '1982-08-14', 'day',  'exact', null, null, null, null, 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000022', 'church',    '1992-01-01', 'year', 'exact', null, null, null, null, 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000026', 'customary', '1989-01-01', 'year', 'exact', '1995-01-01', 'year', 'exact', 'divorce', 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000027', 'civil',     '1997-05-10', 'day',  'exact', null, null, null, null, 2, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000035', 'church',    '2013-04-06', 'day',  'exact', null, null, null, null, 1, 1, 'confirmed'),
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000040', 'customary', '2018-01-01', 'year', 'exact', null, null, null, null, 1, 1, 'confirmed');

-- ---------------------------------------------------------------------------
-- Facts
-- ---------------------------------------------------------------------------
insert into public.facts
  (id, person_id, fact_type, custom_label, fact_date, fact_precision, fact_qualifier, place_id, description, confidence)
values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'custom', 'Enstoolment', '1910-01-01', 'year', 'about', 'b0000000-0000-4000-8000-000000000005', 'Enstooled as Odikro (village chief).', 'family_account'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'occupation', null, null, null, null, 'b0000000-0000-4000-8000-000000000005', 'Planted cocoa farms around Mampong.', 'family_account'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'burial', null, '1972-08-12', 'day', 'exact', 'b0000000-0000-4000-8000-000000000008', 'Buried in the family cemetery at Mampong.', 'confirmed'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008', 'baptism', null, '1926-01-01', 'year', 'exact', 'b0000000-0000-4000-8000-000000000007', 'Baptised Joseph at Wesley Methodist Church.', 'confirmed'),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000008', 'education', null, '1945-01-01', 'year', 'exact', 'b0000000-0000-4000-8000-000000000003', 'Trained as a teacher in Cape Coast.', 'confirmed'),
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000011', 'migration', null, '1960-01-01', 'year', 'exact', 'b0000000-0000-4000-8000-000000000002', 'Moved to Accra to join the civil service.', 'family_account'),
  ('d0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000029', 'migration', null, '2012-01-01', 'year', 'exact', 'b0000000-0000-4000-8000-000000000006', 'Moved to London for graduate study.', 'confirmed'),
  ('d0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000005', 'occupation', null, '1950-01-01', 'year', 'about', 'b0000000-0000-4000-8000-000000000001', 'Traded cloth at Kejetia market.', 'uncertain'),
  ('d0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000018', 'education', null, '1977-01-01', 'year', 'exact', 'b0000000-0000-4000-8000-000000000002', 'Qualified as a nurse.', 'uncertain');

-- ---------------------------------------------------------------------------
-- Sources and citations (several facts are deliberately left unsourced so
-- the research dashboard has something to show)
-- ---------------------------------------------------------------------------
insert into public.sources (id, title, source_type, informant, recorded_on, notes) values
  ('c0000000-0000-4000-8000-000000000001', 'Family history as told by Grandma Abena', 'oral_account', 'Abena Mensah (Grandma Abena)', '2024-12-26', 'Recorded at the Christmas gathering in Kumasi.'),
  ('c0000000-0000-4000-8000-000000000002', 'Wesley Methodist Church baptism register, 1920–1930', 'church_record', null, null, 'Volume 3, held at the church office.'),
  ('c0000000-0000-4000-8000-000000000003', 'Death certificate of Kwame Mensah', 'certificate', null, '1972-08-05', null),
  ('c0000000-0000-4000-8000-000000000004', 'Letter from Akwasi to his mother, 1961', 'letter', null, '1961-03-01', 'Describes his first year working in Accra.');

insert into public.citations (source_id, fact_id, person_id, person_field, union_id, detail) values
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', null, null, null, null),
  ('c0000000-0000-4000-8000-000000000001', null, 'a0000000-0000-4000-8000-000000000001', 'birth', null, 'Born "around the time of the Yaa Asantewaa war stories" – estimated.'),
  ('c0000000-0000-4000-8000-000000000001', null, null, null, 'e0000000-0000-4000-8000-000000000002', null),
  ('c0000000-0000-4000-8000-000000000001', null, null, null, 'e0000000-0000-4000-8000-000000000003', null),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004', null, null, null, 'Page 41, entry 12'),
  ('c0000000-0000-4000-8000-000000000002', null, 'a0000000-0000-4000-8000-000000000008', 'birth', null, 'Birth date recorded with the baptism'),
  ('c0000000-0000-4000-8000-000000000003', null, 'a0000000-0000-4000-8000-000000000003', 'death', null, null),
  ('c0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', null, null, null, null),
  ('c0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000006', null, null, null, null);

insert into public.citations (source_id, parent_child_id, detail)
select 'c0000000-0000-4000-8000-000000000001', pc.id, 'Grandma Abena: "Kwame was Nana Kwaku''s first son."'
from public.parent_child pc
where pc.parent_id = 'a0000000-0000-4000-8000-000000000001'
  and pc.child_id = 'a0000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- Site settings. The local passcode is "family-tree".
-- ---------------------------------------------------------------------------
update public.site_settings set
  site_name = 'The Mensah Family',
  intro_md = E'Welcome to our family tree. It starts with **Nana Kwaku Boateng Mensah** of Mampong and grows with every story we collect.\n\nKnow something we don''t? Tell Ian.',
  featured_person_id = 'a0000000-0000-4000-8000-000000000001';

update public.site_secrets set
  passcode_hash = extensions.crypt('family-tree', extensions.gen_salt('bf', 10)),
  passcode_enabled = true,
  passcode_version = 1;
