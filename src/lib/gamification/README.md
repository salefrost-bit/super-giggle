# Gamification module (Phase 2 — not yet implemented)

This directory is reserved for Phase 2 gamification logic, planned in
`docs/superpowers/specs/2026-07-08-trening-app-design.md` section 10.

Planned contents (none implemented yet):
- Dual-timer challenge mode: countdown per card that draws down a
  global time budget, built on `sessions.game_mode = 'challenge'` and
  `sessions.settings` (see spec section 5).
- Achievement evaluation: reads `achievements` / `user_achievements`
  from `supabase/phase2_gamification.sql` (draft, not yet applied).
- Streak calculation: derived from `sessions.completed_at`, no new
  table needed.
- Leaderboard queries: `sessions` joined to `profiles` where
  `profiles.is_public = true`.

Do not add code here until Phase 2 has its own approved spec and plan.
