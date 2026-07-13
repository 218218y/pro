# Supabase cloud sync setup

Cloud Sync uses a no-login, signed-room capability model. A customer receives a link containing an opaque room id and a server-signed `roomToken`; possession of that link grants read/write access only to that store and room. The browser invokes one Edge Function and Realtime, but it has no table privileges and cannot enumerate rooms or choose a table.

New private links carry `room` and `roomToken` in the URL fragment, so the bearer token is not sent with the initial HTML request. On first load the client persists `{ schemaVersion: 2, room, token, expiresAt }` as one local-storage value, then removes the token from the fragment with `history.replaceState`. If durable storage fails, the token remains in the fragment so access is not silently lost. Schema-1 credentials are migrated only when their signed token contains a valid `exp` claim; malformed or unverifiable legacy values fail closed.

## Production identity

- Supabase project ref: `paqzrxrvowwndevqptdk`
- Active main origin: `https://pro.bargig-furniture.com`
- Active customer origin: `https://pro218.bargig-furniture.com`
- Active store/tenant: `bargig`
- Edge Function: `wp-cloud-sync-room`

`store-1` and `store-2` are draft profiles. Do not add their placeholder domains to `WP_CLOUD_SYNC_ORIGIN_STORES`; add only their final exact HTTPS origins when those stores are activated.

## API-key contract

The current deployment keeps `verify_jwt = true` and therefore invokes the function with the project's legacy JWT-based `anon` key in both `apikey` and `Authorization`. Do not replace `anonKey` with an `sb_publishable_...` key while this setting remains enabled: Supabase's built-in JWT verifier does not validate the new publishable-key format.

Migrating to publishable/secret keys is a separate cutover: set `verify_jwt = false`, validate the publishable key in the handler (prefer the current `@supabase/server` publishable auth mode), move server access from `SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_SECRET_KEYS`, deploy and verify, then replace the browser key. See [Supabase's API-key migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

## New deployment

1. Apply `docs/supabase_cloud_sync.sql` as one migration.
2. Configure the Edge Function secrets. Generate a fresh random token secret of at least 32 characters and keep it out of source control:

```bash
supabase secrets set --project-ref paqzrxrvowwndevqptdk \
  WP_CLOUD_SYNC_ROOM_TOKEN_SECRET="<fresh-random-secret>" \
  WP_CLOUD_SYNC_ORIGIN_STORES='{"https://pro.bargig-furniture.com":"bargig","https://pro218.bargig-furniture.com":"bargig"}' \
  WP_CLOUD_SYNC_STORE_TENANTS='{"bargig":"bargig"}' \
  WP_CLOUD_SYNC_PUBLIC_ROOMS='{"bargig":"public"}' \
  WP_CLOUD_SYNC_ROOM_TOKEN_TTL_SECONDS="604800"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are platform-provided Edge Function secrets. The room-token TTL is constrained to one hour through thirty days; seven days is the production default. Rotating the room-token secret invalidates all existing signed room links.

3. Deploy with JWT verification enabled:

```bash
supabase functions deploy wp-cloud-sync-room \
  --project-ref paqzrxrvowwndevqptdk \
  --use-api
```

4. Run the gateway probes below, then deploy the signed-room client.

### Windows one-command function deployment

From the repository root, authenticate once and keep the generated room secret in a password manager. Reusing the same secret is important: replacing it later invalidates every existing private link.

```powershell
npx --yes supabase@latest login
$roomSecret = Read-Host 'WP_CLOUD_SYNC_ROOM_TOKEN_SECRET (32+ random characters)'
.\tools\wp_supabase_cloud_sync_deploy.ps1 -RoomTokenSecret $roomSecret
```

The script sets only the five documented Cloud Sync secrets and deploys only `wp-cloud-sync-room`. It does not apply SQL and does not lock legacy tables. To redeploy code without rotating or resending secrets:

```powershell
.\tools\wp_supabase_cloud_sync_deploy.ps1 -SkipSecrets
```

Run the non-data-mutating probes with the active legacy anon JWT. The value is accepted as a parameter and is not printed by the script:

```powershell
$anonKey = Read-Host 'Legacy Supabase anon JWT'
.\tools\wp_supabase_cloud_sync_probe.ps1 -AnonKey $anonKey
```

The probe issues public/private credentials, reads a newly generated empty room, renews it, and verifies blocked-origin and tampered-token rejection. It does not write a Cloud Sync row.

For the required production cutover check, include the explicit write/CAS probe:

```powershell
.\tools\wp_supabase_cloud_sync_probe.ps1 -AnonKey $anonKey -IncludeWriteProbe
```

This writes only to the newly generated private probe room, verifies HTTP 200 plus a stale-revision HTTP 409, and leaves one isolated diagnostic row because the gateway intentionally has no delete authority.

## Existing open-table deployment

Use one controlled expand/verify/contract rollout. The copy step and the final lock are intentionally separate so a still-live legacy client is not cut off early.

1. Record counts and take the normal project backup. Reject the rollout if a legacy room violates the canonical room pattern or a payload exceeds 2,000,000 bytes.
2. Apply `docs/supabase_cloud_sync.sql`.
3. Apply `docs/supabase_cloud_sync_multi_store.sql`. It is re-runnable and reconciles legacy rows that changed after an earlier copy; it does **not** revoke legacy browser access.
   Then run `docs/supabase_cloud_sync_verify.sql`: both canonical tables must have RLS enabled/forced, every canonical privilege row must match, every `missing_room_count` must be zero, and all six invalid-data counts must be zero.
4. Configure secrets and deploy the Edge Function.
5. Run the PowerShell probe with `-IncludeWriteProbe`, then verify row counts, Edge Function logs, and Supabase security/performance advisors.
6. Deploy the signed-room client to both `pro.bargig-furniture.com` and `pro218.bargig-furniture.com`. Confirm their live runtime config contains `gatewayFunction` and `roomTokenParam`, and their active bundle no longer contains `/rest/v1/`.
7. Rerun `docs/supabase_cloud_sync_multi_store.sql` immediately before cutover.
8. Apply `docs/supabase_cloud_sync_legacy_lockdown.sql`. It fails if any legacy room is absent from the canonical table, enables and forces RLS on each legacy table, removes `anon`/`authenticated` privileges, and leaves `service_role` with read-only rollback access.
9. Rerun `docs/supabase_cloud_sync_verify.sql`. Every legacy table must now show RLS enabled/forced, browser SELECT false, service-role SELECT true, and service-role mutation false. Verify direct legacy REST access is rejected, then run the room-link and reconnect smoke tests on both production origins.

If step 6 cannot be completed, stop before steps 7-8. The canonical schema and Edge Function may remain staged, but the legacy tables must stay available until the live clients are upgraded.

Build the two Bargig release artifacts locally with:

```powershell
npm run release:bargig:main
npm run release:bargig:site2
```

They are emitted under `dist/sites/bargig/main/release/` and `dist/sites/bargig/site2/release/`. Upload them with the repository's normal hosting procedure. Do not run `docs/supabase_cloud_sync_legacy_lockdown.sql` until both deployed origins serve these new artifacts and a newly created private link works across main -> customer, including a reload/reconnect.

Old room-only links are intentionally rejected. Signed links generated before Credential v2 may still be consumed once from query parameters as a narrow migration boundary, but every newly generated link uses the fragment and the token is removed from query/history on load. Generate and share a new signed link from the main site after cutover; there is no insecure room-only fallback.

## Gateway probes

Use the deployed browser `anonKey` only as a public invocation key. Keep the room token returned by the first request out of logs and shell history.

```bash
export WP_SUPABASE_URL="https://paqzrxrvowwndevqptdk.supabase.co"
export WP_SUPABASE_ANON_KEY="<legacy-anon-jwt>"

curl --fail-with-body "$WP_SUPABASE_URL/functions/v1/wp-cloud-sync-room" \
  -H 'Origin: https://pro.bargig-furniture.com' \
  -H "apikey: $WP_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $WP_SUPABASE_ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"action":"issue-public","storeId":"bargig"}'
```

Expected checks:

- both active origins receive HTTP 200 for `issue-public`
- an unlisted origin receives HTTP 403 with code `origin`
- a valid token can read only its base room and `::` subresources
- a write with the current revision succeeds and increments `revision`
- repeating the old `expectedRevision` receives HTTP 409 with code `revision_conflict`
- a tampered token receives HTTP 403 with code `room_token`
- an expired token receives HTTP 403 with code `room_token_expired`
- `renew-room` accepts only a still-valid token for its exact base room and returns a replacement credential
- HTTP 429 includes code `rate_limit`, `Retry-After`, and `retryAfterSeconds`
- direct `/rest/v1/wp_cloud_sync_rooms` and legacy-table requests with the anon key are rejected after lockdown
- Edge Function logs contain no room token or payload

## Security and data-integrity contract

- `anon` and `authenticated` have no `select`, `insert`, `update`, or `delete` privilege on protected Cloud Sync tables.
- Only the Edge Function's server role can read or compare-and-swap a canonical row; it has no `delete` privilege on room data.
- Signed claims bind `tenantId`, `storeId`, the base room, permissions, and expiry.
- Private credentials renew through a per-owner singleflight during the final 24 hours of validity. An already-expired token is never sent and cannot renew itself; the UI reports that a fresh link is required.
- Gateway failures preserve authentication, rate-limit, network, and server identity through the owner status and panel snapshot; a 403 is not treated as a missing row and a 429 is not treated as a generic network failure.
- A token may access only its base room and that room's internal `::` subresources.
- Writes include `expectedRevision`; stale writes receive HTTP 409 with the current row.
- The client performs a three-way merge for disjoint fields and disjoint saved-model/color ids, then retries one CAS. Conflicting edits to the same value are rejected rather than silently overwritten.
- The Edge Function binds each exact allowed origin to one store id, and also enforces body/payload limits, hashed-IP rate limits, exact action contracts, and structured error logging without tokens or payloads. Origin binding is defense in depth; the signed room token remains the authorization boundary.
- Realtime Broadcast remains a hint channel. Receiving or spoofing a hint does not grant row access.

The lifecycle contract remains in `docs/CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md`.
