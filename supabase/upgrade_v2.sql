-- Run this once in Supabase SQL Editor on your existing starter project.
alter table public.trades add column if not exists entry_time time;
alter table public.trades add column if not exists exit_time time;
alter table public.trades add column if not exists zone_type text;
alter table public.trades add column if not exists emotion_before text;
alter table public.trades add column if not exists emotion_after text;
alter table public.trades add column if not exists reason_for_entry text;
alter table public.trades add column if not exists reason_for_exit text;

alter table public.backtests add column if not exists higher_timeframe_trend text;
alter table public.backtests add column if not exists entry_timeframe text;
alter table public.backtests add column if not exists zone_type text;
alter table public.backtests add column if not exists valid_zone boolean default false;
alter table public.backtests add column if not exists liquidity_marked boolean default false;
alter table public.backtests add column if not exists liquidity_swept boolean default false;
alter table public.backtests add column if not exists fvg_present boolean default false;
alter table public.backtests add column if not exists fvg_mitigated boolean default false;
alter table public.backtests add column if not exists candle_confirmation boolean default false;
alter table public.backtests add column if not exists entry_price numeric;
alter table public.backtests add column if not exists stop_loss numeric;
alter table public.backtests add column if not exists take_profit numeric;
alter table public.backtests add column if not exists planned_rr numeric;
alter table public.backtests add column if not exists screenshot_before_url text;
alter table public.backtests add column if not exists screenshot_after_url text;

create table if not exists public.psychology_entries (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 entry_date date not null default current_date, related_trade_id uuid references public.trades(id) on delete set null,
 emotion_before text, emotion_after text, confidence integer check(confidence between 1 and 10),
 stress integer check(stress between 1 and 10), discipline integer check(discipline between 1 and 10),
 mistake text, mistake_trigger text, what_went_well text, lesson_learned text, improvement_next_trade text,
 created_at timestamptz default now());
create table if not exists public.weekly_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null, week_end date not null, what_i_did_well text, what_to_improve text, one_rule_next_week text,
 created_at timestamptz default now(), unique(user_id,week_start));
create table if not exists public.monthly_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 month_start date not null, biggest_improvement text, biggest_problem text, strategy_lesson text, psychology_lesson text,
 goal_next_month text, created_at timestamptz default now(), unique(user_id,month_start));
alter table public.psychology_entries enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.monthly_reviews enable row level security;
drop policy if exists "Users manage own psychology" on public.psychology_entries;
create policy "Users manage own psychology" on public.psychology_entries for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Users manage own weekly reviews" on public.weekly_reviews;
create policy "Users manage own weekly reviews" on public.weekly_reviews for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Users manage own monthly reviews" on public.monthly_reviews;
create policy "Users manage own monthly reviews" on public.monthly_reviews for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
