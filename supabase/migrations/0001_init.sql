create extension if not exists pgcrypto;

-- Lookup tables (data-driven, not hardcoded in app code)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null
);

create table difficulty_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  default_rep_multiplier numeric not null,
  sort_order int not null
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references categories(id),
  difficulty_level_id uuid not null references difficulty_levels(id),
  created_by uuid references auth.users(id)
);

-- User profile, auto-created on signup (see trigger below)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  is_public boolean not null default false
);

-- Workout sessions (only created for authenticated users; guests never write here)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty_level_id uuid not null references difficulty_levels(id),
  total_cards int not null check (total_cards in (13, 26, 52)),
  rep_multiplier numeric not null,
  game_mode text not null default 'classic',
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  completed_at timestamptz,
  total_duration_seconds int,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed'))
);

create table session_exercises (
  session_id uuid not null references sessions(id) on delete cascade,
  category_id uuid not null references categories(id),
  exercise_id uuid not null references exercises(id),
  primary key (session_id, category_id)
);

create table card_draws (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  order_index int not null,
  suit text not null check (suit in ('hearts', 'clubs', 'spades', 'diamonds')),
  card_value int not null check (card_value between 2 and 14),
  reps int not null,
  completed_at timestamptz not null,
  unique (session_id, order_index)
);

create index sessions_user_id_idx on sessions (user_id);
create index card_draws_session_id_idx on card_draws (session_id);
create index exercises_difficulty_level_id_idx on exercises (difficulty_level_id);

-- Auto-create a profile row when a new auth user signs up.
-- NOTE: username defaults to the email local-part. Harmless today (no public
-- read policy on profiles besides the owner), but revisit before Phase 2 adds
-- a leaderboard read policy on is_public=true profiles — don't leak emails.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, is_public)
  values (new.id, split_part(new.email, '@', 1), false);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table categories enable row level security;
create policy "public read categories" on categories for select using (true);

alter table difficulty_levels enable row level security;
create policy "public read difficulty_levels" on difficulty_levels for select using (true);

alter table exercises enable row level security;
create policy "public read exercises" on exercises for select using (true);

alter table profiles enable row level security;
create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

alter table sessions enable row level security;
create policy "users manage own sessions" on sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table session_exercises enable row level security;
create policy "users manage own session_exercises" on session_exercises for all
  using (exists (select 1 from sessions where sessions.id = session_exercises.session_id and sessions.user_id = auth.uid()))
  with check (exists (select 1 from sessions where sessions.id = session_exercises.session_id and sessions.user_id = auth.uid()));

alter table card_draws enable row level security;
create policy "users manage own card_draws" on card_draws for all
  using (exists (select 1 from sessions where sessions.id = card_draws.session_id and sessions.user_id = auth.uid()))
  with check (exists (select 1 from sessions where sessions.id = card_draws.session_id and sessions.user_id = auth.uid()));
