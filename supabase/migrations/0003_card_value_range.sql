-- As=1 correction: card ranks are 1 (A) through 13 (K), not 2-14.
-- See docs/superpowers/specs/2026-07-09-mvp-visual-redesign-design.md section 5.
alter table card_draws drop constraint card_draws_card_value_check;
alter table card_draws add constraint card_draws_card_value_check
  check (card_value between 1 and 13);
