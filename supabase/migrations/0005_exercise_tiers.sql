-- Krug B: tier šema i default vežbe + 12 novih vežbi (2 po tieru po kategoriji).
-- Spec: 2026-07-15-krug-b-design.md §5, §7. Sve aditivno.
alter table exercises add column tier smallint;
alter table exercises add column is_default boolean not null default false;

-- Backfill tier-a postojećih 12 iz njihovog nivoa (Početnik=1, Srednji=2, Napredni=3)
update exercises e set tier = d.sort_order
from difficulty_levels d where e.difficulty_level_id = d.id;

alter table exercises alter column tier set not null;
alter table exercises add constraint exercises_tier_check check (tier between 1 and 3);

-- Postojećih 12 su defaulti svojih (kategorija, tier) kombinacija
update exercises set is_default = true;

-- 12 novih vežbi; difficulty_level_id po mapiranju tier→nivo (kolona je NOT NULL i ostaje)
insert into exercises (name, name_en, category_id, difficulty_level_id, tier)
select v.name, v.name_en, c.id, d.id, v.tier
from (values
  ('Sklekovi uz zid',                'Wall push-ups',          'Guranje',    'Početnik', 1),
  ('Široki sklekovi',                'Wide push-ups',          'Guranje',    'Srednji',  2),
  ('Sklekovi s nogama na povišenju', 'Decline push-ups',       'Guranje',    'Napredni', 3),
  ('Superman povlačenje',            'Superman pulls',         'Povlačenje', 'Početnik', 1),
  ('Australijski zgibovi',           'Inverted rows',          'Povlačenje', 'Srednji',  2),
  ('Zgibovi širokim hvatom',         'Wide-grip pull-ups',     'Povlačenje', 'Napredni', 3),
  ('Glute most',                     'Glute bridges',          'Noge',       'Početnik', 1),
  ('Bočni iskoraci',                 'Side lunges',            'Noge',       'Srednji',  2),
  ('Bugarski čučanj',                'Bulgarian split squats', 'Noge',       'Napredni', 3),
  ('Mrtva buba',                     'Dead bugs',              'Core',       'Početnik', 1),
  ('Planinari',                      'Mountain climbers',      'Core',       'Srednji',  2),
  ('V-podizanja',                    'V-ups',                  'Core',       'Napredni', 3)
) as v(name, name_en, category_name, difficulty_name, tier)
join categories c on c.name = v.category_name
join difficulty_levels d on d.name = v.difficulty_name;
