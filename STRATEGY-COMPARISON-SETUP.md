# Trading Journal Pro v22.4 — Strategy Comparison Setup

## 1. Database upgrade
Run these migrations in Supabase SQL Editor in order if you have not already done so:

1. `supabase/upgrade_v10_backtest_outcomes.sql`
2. `supabase/upgrade_v11_strategy_comparison.sql`

The v11 migration is additive. Existing backtests are preserved and assigned to `Strategy A — Normal Strategy`.

## 2. Backtesting workflow
Open `/backtesting` and choose either:

- Strategy A — Normal Strategy
- Strategy B — FVG + Confirmation Candle

Strategy B reveals FVG-specific fields automatically.

## 3. Comparison dashboard
Open `/strategy-comparison` or use the new sidebar item `Strategy Comparison`.

The dashboard includes independent statistics, milestones, filters, equity curves, drawdown, monthly performance, session performance, pair performance, and win-rate charts.

## 4. GitHub / Vercel
Copy the updated files into the Git-connected project folder. Do not copy `.env.local`, `node_modules`, or `.next` from another folder.

Then run:

```bash
git add .
git commit -m "Add strategy comparison and backtesting system"
git push origin main
```

Vercel should redeploy automatically after the push.
