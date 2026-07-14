# Supabase module

All Supabase I/O lives here — nothing outside this module calls
`@supabase/supabase-js` directly.

- `client.ts` — browser client factory, reads
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `queries.ts` — read-only lookups (`categories`, `difficulty_levels`,
  `exercises`) plus `buildCategoryIdByKey` / `categoryKeyForName`,
  which translate between the app's internal `CategoryKey` enum and
  the database's category rows by name. If you rename a category in
  the database, update `CATEGORY_KEY_TO_NAME` in
  `src/lib/domain/types.ts` in the same change.
- `sessions.ts` — the only place that writes `sessions`,
  `session_exercises`, and `card_draws`. Guest sessions never call
  any function here — that branch is decided by the caller
  (`SessionScreen`), not by this module.
- `records.ts` — read-only personal-records and completed-session-dates
  queries over `sessions` (best time, best score per combination).
