-- Trading Journal Pro v22.3
-- Adds Skipped as a valid backtesting result so "No Entry / Skipped" setups
-- can be logged without being counted as wins or losses.

alter table public.backtests
  drop constraint if exists backtests_result_check;

alter table public.backtests
  add constraint backtests_result_check
  check (result in ('Win','Loss','Breakeven','Skipped'));
