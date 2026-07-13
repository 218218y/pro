# Supabase cloud sync setup

Cloud Sync uses a no-login, signed-room capability model. A customer receives a link containing an opaque room id and a server-signed `roomToken`; possession of that link grants read/write access only to that store and room. The browser publishable key can invoke Realtime and the Edge Function, but it has no table privileges and cannot enumerate rooms or choose a table.

On first load the client persists the room id and token as one versioned local-storage value, then removes the token from the visible URL with `history.replaceState`. If durable storage fails, the token remains in the URL so access is not silently lost.

## New deployment

1. Run `docs/supabase_cloud_sync.sql` in the Supabase SQL editor.
2. Deploy `supabase/functions/wp-cloud-sync-room`.
3. Configure the Edge Function secrets:

```bash
supabase secrets set WP_CLOUD_SYNC_ROOM_TOKEN_SECRET="<at-least-32-random-characters>"
supabase secrets set WP_CLOUD_SYNC_ORIGIN_STORES='{"https://bargig.example.com":"bargig","https://store-1.example.com":"store-1","https://store-2.example.com":"store-2"}'
supabase secrets set WP_CLOUD_SYNC_STORE_TENANTS='{"bargig":"bargig","store-1":"store-1","store-2":"store-2"}'
supabase secrets set WP_CLOUD_SYNC_PUBLIC_ROOMS='{"bargig":"public","store-1":"public","store-2":"public"}'
```

`WP_CLOUD_SYNC_ROOM_TOKEN_TTL_SECONDS` is optional. It defaults to seven days and is constrained to one hour through thirty days. Rotating `WP_CLOUD_SYNC_ROOM_TOKEN_SECRET` invalidates existing room links.

4. Keep `verify_jwt = true` for the function. The browser invokes it with the Supabase publishable/legacy anon key; room authorization is independently enforced by the signed room token.
5. Verify the focused Cloud Sync runtime tests, room-link flow, reconnect smoke, and Supabase Function logs before release.

## Existing open-table deployment

Use a maintenance window:

1. Run `docs/supabase_cloud_sync.sql` to create the protected canonical table and rate-limit owner.
2. Deploy the Edge Function and the signed-room client build.
3. Run `docs/supabase_cloud_sync_multi_store.sql` to copy existing rows and revoke all browser-role privileges on the old tables.
4. Verify each active store and both main/customer variants.
5. Retain the locked legacy tables only for the agreed rollback window, then remove them deliberately.

Old private links contain only `room` and are intentionally rejected. Generate and share a new signed link from the main site after cutover; there is no insecure room-only fallback.

## Security and data-integrity contract

- `anon` and `authenticated` have no `select`, `insert`, `update`, or `delete` privilege on Cloud Sync tables.
- Only the Edge Function service role can read or compare-and-swap a row; it is not granted `delete` on room data.
- Signed claims bind `tenantId`, `storeId`, the base room, permissions, and expiry.
- A token may access only its base room and that room's internal `::` subresources.
- Writes include `expectedRevision`; stale writes receive HTTP 409 with the current row.
- The client performs a three-way merge for disjoint fields and disjoint saved-model/color ids, then retries one CAS. Conflicting edits to the same value are rejected rather than silently overwritten.
- The Edge Function binds each exact allowed origin to one store id, and also enforces body/payload limits, hashed-IP rate limits, exact action contracts, and structured error logging without tokens or payloads. Origin binding is defense in depth; the signed room token remains the authorization boundary.
- Realtime Broadcast remains a hint channel. Receiving or spoofing a hint does not grant row access.

The lifecycle contract remains in `docs/CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md`.
