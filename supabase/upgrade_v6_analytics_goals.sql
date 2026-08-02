-- Sprint 6: Analytics Center and Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  metric text not null check (metric in ('monthly_profit','win_rate','average_r','max_trades_day','max_daily_loss','review_rate','strategy_compliance','psychology_score')),
  target_value numeric not null check (target_value > 0),
  period text not null default 'all_time' check (period in ('monthly','all_time')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

do $$ begin
  create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists goals_user_id_idx on public.goals(user_id);
