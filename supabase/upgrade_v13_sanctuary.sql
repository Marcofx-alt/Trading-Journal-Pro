-- Trading Journal Pro v22.8 — Sanctuary / meditation history
create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes > 0),
  completed_minutes integer not null check (completed_minutes > 0),
  intention text,
  ambient_sound text,
  interval_bells boolean not null default true,
  completed_at timestamptz not null default now()
);

create index if not exists meditation_sessions_user_completed_idx
  on public.meditation_sessions(user_id, completed_at desc);

alter table public.meditation_sessions enable row level security;

drop policy if exists "Users can read own meditation sessions" on public.meditation_sessions;
create policy "Users can read own meditation sessions"
  on public.meditation_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own meditation sessions" on public.meditation_sessions;
create policy "Users can insert own meditation sessions"
  on public.meditation_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own meditation sessions" on public.meditation_sessions;
create policy "Users can delete own meditation sessions"
  on public.meditation_sessions for delete
  using (auth.uid() = user_id);
