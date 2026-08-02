-- Sprint 7: Live Trade Assistant
create table if not exists public.live_trade_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  pair text not null,
  direction text not null check (direction in ('Buy','Sell')),
  trading_period text,
  entry_timeframe text,
  higher_timeframe_trend text,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_percent numeric,
  planned_rr numeric,
  rule_answers jsonb not null default '{}'::jsonb,
  setup_score numeric not null default 0,
  setup_grade text not null default 'F',
  recommendation text not null default 'Wait',
  notes text,
  status text not null default 'Planned' check (status in ('Planned','Taken','Skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_trade_analyses enable row level security;

do $$ begin
  create policy "Users manage own live analyses" on public.live_trade_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists live_trade_analyses_user_created_idx
  on public.live_trade_analyses(user_id, created_at desc);
