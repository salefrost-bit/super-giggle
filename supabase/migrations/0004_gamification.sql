-- Phase 2 gamification: all changes additive. Spec: 2026-07-09-gamification-phase2-design.md
alter table difficulty_levels add column par_seconds_per_rep numeric not null default 3.0;
alter table difficulty_levels add column par_transition_seconds numeric not null default 20;
alter table card_draws add column beat_quota boolean;

alter table categories add column name_en text;
alter table difficulty_levels add column name_en text;
alter table exercises add column name_en text;

update categories set name_en = 'Push' where name = 'Guranje';
update categories set name_en = 'Pull' where name = 'Povlačenje';
update categories set name_en = 'Legs' where name = 'Noge';
update categories set name_en = 'Core' where name = 'Core';

update difficulty_levels set name_en = 'Beginner' where name = 'Početnik';
update difficulty_levels set name_en = 'Intermediate' where name = 'Srednji';
update difficulty_levels set name_en = 'Advanced' where name = 'Napredni';

update exercises set name_en = 'Knee push-ups' where name = 'Sklekovi na kolenima';
update exercises set name_en = 'Standard push-ups' where name = 'Standardni sklekovi';
update exercises set name_en = 'Diamond push-ups' where name = 'Diamond sklekovi';
update exercises set name_en = 'Towel rows' where name = 'Veslanje peškirom';
update exercises set name_en = 'Assisted pull-ups' where name = 'Zgibovi (asistirani)';
update exercises set name_en = 'Full pull-ups' where name = 'Puni zgibovi';
update exercises set name_en = 'Squats' where name = 'Čučnjevi';
update exercises set name_en = 'Lunges' where name = 'Iskoraci';
update exercises set name_en = 'Jump squats' where name = 'Jump squats';
update exercises set name_en = 'Crunches' where name = 'Trbušnjaci (crunches)';
update exercises set name_en = 'Sit-ups' where name = 'Standardni trbušnjaci';
update exercises set name_en = 'Scissor kicks' where name = 'Nožne makaze';
