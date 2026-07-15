-- ERRATA spec §9.3: check iz 0001 propušta samo 13/26/52 i obara sve nove
-- veličine špila (12, 16, 20, 24...). Presedan za drop+add: migracija 0003.
alter table sessions drop constraint sessions_total_cards_check;
alter table sessions add constraint sessions_total_cards_check
  check (total_cards in (13, 26) or (total_cards between 12 and 52 and total_cards % 4 = 0));
