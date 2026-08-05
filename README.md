# Trading Journal Pro — Version 18

Built by Marco.N

## Version 18: Broker Sync & Import Center

This release adds repeatable file-based broker synchronization for MT4, MT5, TradingView, and CSV exports.

### New features

- Separate broker accounts
- Reusable import mapping profiles
- Automatic column detection
- Date-format and delimiter controls
- Row-level validation
- Duplicate detection
- Reconciliation statuses: New, Matched, Conflict, Invalid
- Import history
- Batch rollback
- Account-aware fingerprints
- Import audit metadata

## Upgrade

1. Run `supabase/upgrade_v9_broker_sync.sql` in the Supabase SQL Editor.
2. Keep your existing `.env.local` file.
3. Run `npm install` and `npm run dev`.
4. Open `/broker-sync`.

This is file-based synchronization. It does not connect to a broker using passwords or trading credentials.

## Version 19.0 — Backup & Recovery Center

New route: `/backup-center`

Features:
- Selective full JSON backups of journal data
- Local settings included in recovery files
- Backup preview and selective restore
- CSV trade export
- Backup and restore history
- Database health check
- Duplicate-trade detection
- Missing-screenshot summary
- Open-trade summary

No new Supabase migration is required for version 19.

## v19.1 environment setup fix

This package no longer crashes when `.env.local` is missing. It displays a setup screen explaining how to copy the existing environment file from the previous working project.

The environment file must be placed in the same folder as `package.json`. After copying it, stop and restart `npm run dev`.

## Version 20 — Institutional Trading Workspace

Version 20 adds:

- Institutional Dashboard with equity curve, session performance and consistency scoring
- AI Trade Planner with readiness checks and saved plans
- Playbook Library for reusable setup rules
- Multi-Chart Workspace with saved symbol/timeframe layouts
- Advanced Replay Mode with hidden future candles and a decision journal

No new Supabase migration is required. Planner, playbook, replay and workspace preferences are stored in the browser. The Institutional Dashboard reads the existing trades and trade_reviews tables.

## Version 20.1 — Home & Navigation Update
- New motivational landing page at `/home` after sign-in
- Scrollable desktop sidebar navigation
- Daily trading and success quote
- Local trading-market hero artwork (no external image dependency)
- Quick daily process links and motivational success path

## Version 20.3 — Focused Markets & Session Guide
- Enabled pairs are now limited to XAUUSD, EURUSD, and GBPUSD.
- Added an Alberta Mountain Time session guide with recommended London and New York windows.
- Updated watchlist and multi-chart defaults to the three focused markets.

## v21 Mobile Foundation
This release adds responsive mobile navigation, PWA installation assets, safe-area support and a mobile tools drawer. See `docs-mobile.md` for the Android/iOS packaging roadmap.

## v22.1 time correction
- Session Guide clock now follows the device/browser local timezone.
- Displays the detected IANA timezone beside the date.
- Corrected New York forex and overlap windows to begin earlier than the U.S. stock open.
