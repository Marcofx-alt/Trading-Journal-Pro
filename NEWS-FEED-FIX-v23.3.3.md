# v23.3.3 News feed reliability fix

The previous free-feed fallback could report a connected state while returning zero events on some machines.

This build changes the provider order to:

1. Trading Economics when `TRADING_ECONOMICS_KEY` is configured.
2. Biquote's no-key economic calendar API.
3. Forex Factory / Fair Economy weekly JSON as a final fallback.

The API route now returns explicit provider failure diagnostics instead of a misleading connected message when every source returns zero rows.
