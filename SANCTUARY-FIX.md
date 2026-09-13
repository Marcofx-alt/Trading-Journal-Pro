# v23.1.1 Sanctuary route fix

Restores the missing `/sanctuary` page that was accidentally omitted from the v23.1 package.

The existing `supabase/upgrade_v13_sanctuary.sql` migration is still the only database setup required.
