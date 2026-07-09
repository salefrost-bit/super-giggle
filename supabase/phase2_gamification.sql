-- DRAFT — NOT applied. Reference for Phase 2 gamification work only.
-- Run only after Phase 2 has its own approved spec and plan.

create table achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- e.g. 'first_workout', 'hundred_workouts'
  name text not null,
  description text not null
);

create table user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references achievements(id),
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table challenge_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  time_budget_seconds int not null,
  time_remaining_seconds int not null,
  outcome text not null -- 'won' | 'lost'
);

-- Streaks and leaderboards need no new tables:
-- streaks are computed from sessions.completed_at per user;
-- leaderboard is a query over sessions joined to profiles where profiles.is_public = true.
