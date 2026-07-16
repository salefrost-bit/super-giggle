-- v0.4.5 SHUFFLE biblioteka. Spec: 2026-07-16-shuffle-interfejs-design.md §7 (S1).
alter table exercises add column is_active boolean not null default true;

-- 1) Penzionisanje (7) — redovi ostaju zbog istorije
update exercises set is_active = false, is_default = false where name in
  ('Široki sklekovi','Diamond sklekovi','Sklekovi s nogama na povišenju',
   'Zgibovi (asistirani)','Zgibovi širokim hvatom','Bočni iskoraci','Standardni trbušnjaci');

-- 2) Rename-ovi (isti pokret, isti id)
update exercises set name = 'Sklekovi',           name_en = 'Push-up'        where name = 'Standardni sklekovi';
update exercises set name = 'Veslanje pod stolom', name_en = 'Table row'     where name = 'Australijski zgibovi';
update exercises set name = 'Zgibovi',            name_en = 'Pull-up'        where name = 'Puni zgibovi';
update exercises set name = 'Skok čučanj',        name_en = 'Jump squat'     where name = 'Jump squats';
update exercises set name = 'Trbušnjaci',         name_en = 'Crunches'       where name = 'Trbušnjaci (crunches)';
update exercises set name_en = 'Knee push-up'   where name = 'Sklekovi na kolenima';
update exercises set name_en = 'Wall push-up'   where name = 'Sklekovi uz zid';
update exercises set name_en = 'Towel row'      where name = 'Veslanje peškirom';
update exercises set name_en = 'Superman pull'  where name = 'Superman povlačenje';
update exercises set name_en = 'Squat'          where name = 'Čučnjevi';
update exercises set name_en = 'Glute bridge'   where name = 'Glute most';
update exercises set name_en = 'Lunge'          where name = 'Iskoraci';
update exercises set name_en = 'Dead bug'       where name = 'Mrtva buba';
update exercises set name_en = 'Mountain climbers' where name = 'Planinari';
update exercises set name_en = 'Scissor kicks'  where name = 'Nožne makaze';
update exercises set name_en = 'V-up'           where name = 'V-podizanja';
update exercises set name_en = 'Bulgarian split squat' where name = 'Bugarski čučanj';

-- 3) Tier promene SA sinhronizacijom nivoa (tier→sort_order mapiranje iz 0005)
update exercises set tier = 2, difficulty_level_id = (select id from difficulty_levels where sort_order = 2) where name = 'Bugarski čučanj';
update exercises set tier = 1, difficulty_level_id = (select id from difficulty_levels where sort_order = 1) where name = 'Planinari';
update exercises set tier = 2, difficulty_level_id = (select id from difficulty_levels where sort_order = 2) where name = 'Trbušnjaci';

-- 4) is_default preslagivanje po spec §7 tabeli (D oznake)
update exercises set is_default = true  where name in ('Veslanje pod stolom','Mrtva buba') and is_active;
update exercises set is_default = false where name in ('Planinari') and is_active;
-- (postojeći defaulti koji OSTAJU: Sklekovi na kolenima, Sklekovi, Veslanje
--  peškirom, Zgibovi, Čučnjevi, Iskoraci, Skok čučanj, Trbušnjaci, Nožne makaze)

-- 5) Insert 7 novih (difficulty po tier mapiranju; Pike push-up je default Ⅲ PUSH)
insert into exercises (name, name_en, category_id, difficulty_level_id, tier, is_default)
select v.name, v.name_en, c.id, d.id, v.tier, v.is_default
from (values
  ('Propadanja na stolici','Chair dips','Guranje',2,false),
  ('Pike sklekovi','Pike push-up','Guranje',3,true),
  ('Strelac sklekovi','Archer push-up','Guranje',3,false),
  ('Biceps peškirom','Towel curl','Povlačenje',2,false),
  ('Strelac zgibovi','Archer pull-up','Povlačenje',3,false),
  ('Pištolj čučanj','Pistol squat','Noge',3,false),
  ('Podizanje nogu','Leg raises','Core',2,false)
) as v(name, name_en, category_name, tier, is_default)
join categories c on c.name = v.category_name
join difficulty_levels d on d.sort_order = v.tier;
