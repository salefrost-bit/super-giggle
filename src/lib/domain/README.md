# Domain module

Pure, framework-independent business logic. No Supabase imports, no
React imports, no side effects — every function here takes plain
data in and returns plain data out, which is why it's fully covered
by unit tests instead of manual verification.

- `types.ts` — the single source of truth for domain shapes
  (`Card`, `Exercise`, `SessionConfig`, `CardDrawResult`, etc.) and
  the `CATEGORY_KEY_TO_NAME` mapping, which MUST match the `name`
  column seeded in `supabase/migrations/0002_seed.sql` exactly.
- `deck.ts` — deck creation, shuffling, and session card draw.
- `reps.ts` — card rank -> rep count.
- `timer.ts` — **invariant: elapsed/remaining time is always derived
  from stored timestamps, never accumulated via a tick counter.**
  See spec section 4.2. Any new timer-like feature (e.g. Phase 2
  challenge countdown) must follow this same pattern.
- `summarize.ts` — per-category rollup of a finished session's draws.
- `challenge.ts` — per-card quota split and score/win logic for the
  "Perfect Deck" mode (budget from par formula or personal record).
- `streak.ts` — daily streak from completed-session dates; 2 automatic
  freezes per ISO week, streak must be anchored by a real workout.
- `pauseLog.ts` — pause accounting from timestamps (count + total
  seconds); idempotent pause/resume, same timer invariant as `timer.ts`.
- `draws.ts` — builds the `CardDrawResult[]` for a session from cards +
  chosen exercises + rep multiplier.
- `score.ts` — universal score formula (base × tier factor × mode
  multipliers), XP totals, and the 14-rank card ladder (`rankForXp`).
- `jokers.ts` — computes where joker rests fall in a deck (1–2 per
  session, never during warm-up cards or on the last card) and the
  30-second rest constant; rests never consume quota or budget.
- `daily.ts` — Card of the Day: date-seeded 20-card deck, weekly tier
  rotation, local done-flag for guests.
- `bank.ts` — Survive mode time bank (90s start; balance changes only
  on card completion: +quota −time spent), pure arithmetic.
- `lastConfig.ts` — persistence and validation of the last session
  config for "Run it back" (localStorage, guest-safe).
