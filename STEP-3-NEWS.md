# Step 3 — News / Economic Calendar

Trading Journal Pro v22.7 adds a News workspace modeled after the reference economic-calendar layout.

## Included
- List and calendar views
- Date-range controls and quick ranges
- Currency filters
- High / Medium / Low impact filters
- Category filters
- Device-local timezone display
- Manual refresh
- Personal no-trade window around economic news
- Live provider API route

## Live calendar feed
The server route uses Trading Economics. For testing it falls back to `guest:guest`, which can be limited.
For production, add this environment variable locally and in Vercel:

```
TRADING_ECONOMICS_KEY=client:secret
```

The key stays server-side and is never exposed to the browser.

No Supabase migration is required for Step 3.
