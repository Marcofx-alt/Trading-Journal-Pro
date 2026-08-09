-- Trading Journal Pro v22.4 — Strategy Comparison & Backtesting System
-- Safe additive migration. Existing backtests are preserved and treated as Strategy A.

alter table public.backtests add column if not exists strategy_key text not null default 'strategy_a';
alter table public.backtests add column if not exists risk_percent numeric;
alter table public.backtests add column if not exists trading_session text;
alter table public.backtests add column if not exists screenshot_url text;
alter table public.backtests add column if not exists notes text;
alter table public.backtests add column if not exists fvg_type text;
alter table public.backtests add column if not exists fvg_timeframe text;
alter table public.backtests add column if not exists confirmation_timeframe text;
alter table public.backtests add column if not exists confirmation_candle_type text;
alter table public.backtests add column if not exists price_respected_fvg boolean;
alter table public.backtests add column if not exists confirmation_notes text;

update public.backtests set strategy_key='strategy_a' where strategy_key is null or strategy_key='';

do $$ begin
  alter table public.backtests add constraint backtests_strategy_key_check check (strategy_key in ('strategy_a','strategy_b'));
exception when duplicate_object then null; end $$;

create index if not exists backtests_strategy_key_idx on public.backtests(strategy_key);
create index if not exists backtests_strategy_pair_idx on public.backtests(strategy_key,pair);
create index if not exists backtests_strategy_date_idx on public.backtests(strategy_key,historical_trade_date);
