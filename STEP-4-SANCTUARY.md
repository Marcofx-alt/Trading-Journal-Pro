# Step 4 — Sanctuary

Adds a dedicated mindset reset area with a meditation timer, duration presets, interval chime, intention field, ambient-sound preference, weekly progress, streaks, a mental toolkit, and saved session history.

## Database setup
Run `supabase/upgrade_v13_sanctuary.sql` once in the Supabase SQL Editor.

## Notes
The timer and UI work without the migration, but history, weekly minutes, and streaks require the table.
