# Step 9 — Live / Upcoming News Feed

The News page now works without requiring a Trading Economics API key.

## What changed
- Trading Economics remains the preferred provider when `TRADING_ECONOMICS_KEY` is configured.
- If that provider is unavailable or no key is configured, the app automatically falls back to the free Forex Factory / Fair Economy weekly calendar feed.
- Added **Today**, **Upcoming**, and **This & next week** tabs.
- Upcoming hides releases whose scheduled time has already passed.
- The existing currency, impact, category, list/calendar, and trading-block filters continue to work.
- The feed banner now reports a healthy fallback connection instead of showing a 410 provider error.

No Supabase migration is needed for this update.
