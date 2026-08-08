create extension if not exists pgcrypto;

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  pair text not null,
  direction text not null check (direction in ('Buy','Sell')),
  entry_timeframe text,
  higher_timeframe_trend text,
  trading_period text,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  risk_percent numeric,
  planned_rr numeric,
  result text not null default 'Open' check (result in ('Open','Win','Loss','Breakeven')),
  profit_loss numeric,
  r_multiple numeric,
  valid_zone boolean default false,
  liquidity_marked boolean default false,
  liquidity_swept boolean default false,
  fvg_present boolean default false,
  fvg_mitigated boolean default false,
  candle_confirmation boolean default false,
  followed_plan boolean default false,
  setup_score integer default 0,
  trade_grade text default 'Needs Review',
  screenshot_before_url text,
  screenshot_after_url text,
  mistake text,
  lesson_learned text,
  what_went_well text,
  created_at timestamptz default now()
);

create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_tested date not null default current_date,
  historical_trade_date date not null,
  pair text not null,
  direction text not null check (direction in ('Buy','Sell')),
  result text not null check (result in ('Win','Loss','Breakeven','Skipped')),
  r_multiple numeric,
  setup_score integer default 0,
  trade_grade text default 'Needs Review',
  lesson_learned text,
  created_at timestamptz default now()
);

alter table public.trades enable row level security;
alter table public.backtests enable row level security;

create policy "Users manage own trades" on public.trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own backtests" on public.backtests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id,name,public) values ('trade-screenshots','trade-screenshots',false) on conflict do nothing;
create policy "Users manage own screenshots" on storage.objects for all using (bucket_id='trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id='trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
