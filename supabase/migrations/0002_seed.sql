insert into categories (name, sort_order) values
  ('Guranje', 1),
  ('Povlačenje', 2),
  ('Noge', 3),
  ('Core', 4);

insert into difficulty_levels (name, default_rep_multiplier, sort_order) values
  ('Početnik', 0.75, 1),
  ('Srednji', 1.0, 2),
  ('Napredni', 1.25, 3);

insert into exercises (name, category_id, difficulty_level_id)
select v.name, c.id, d.id
from (values
  ('Sklekovi na kolenima', 'Guranje', 'Početnik'),
  ('Standardni sklekovi', 'Guranje', 'Srednji'),
  ('Diamond sklekovi', 'Guranje', 'Napredni'),
  ('Veslanje peškirom', 'Povlačenje', 'Početnik'),
  ('Zgibovi (asistirani)', 'Povlačenje', 'Srednji'),
  ('Puni zgibovi', 'Povlačenje', 'Napredni'),
  ('Čučnjevi', 'Noge', 'Početnik'),
  ('Iskoraci', 'Noge', 'Srednji'),
  ('Jump squats', 'Noge', 'Napredni'),
  ('Trbušnjaci (crunches)', 'Core', 'Početnik'),
  ('Standardni trbušnjaci', 'Core', 'Srednji'),
  ('Nožne makaze', 'Core', 'Napredni')
) as v(name, category_name, difficulty_name)
join categories c on c.name = v.category_name
join difficulty_levels d on d.name = v.difficulty_name;
