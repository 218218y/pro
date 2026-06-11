# Supabase cloud sync setup

This project includes an optional Supabase-backed cloud sync path.

## Setup

1. Create/open the Supabase project.
2. Run `docs/supabase_cloud_sync.sql` in the SQL editor.
3. Configure the app with the expected Supabase URL/key through the existing runtime configuration path.
4. Verify cloud sync panel controls and lifecycle tests before release.

## Notes

- Keep RLS/policies aligned with the SQL file.
- Do not duplicate table/schema instructions in another doc; update the SQL and this setup note together.
- The app lifecycle contract is summarized in `docs/CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md`.
