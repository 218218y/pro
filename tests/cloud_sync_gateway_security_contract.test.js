import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('signed-room SQL removes browser CRUD and requires tenant/store/revision ownership', () => {
  const sql = read('docs/supabase_cloud_sync.sql');
  const copySql = read('docs/supabase_cloud_sync_multi_store.sql');
  const lockdownSql = read('docs/supabase_cloud_sync_legacy_lockdown.sql');
  const verifySql = read('docs/supabase_cloud_sync_verify.sql');
  assert.match(sql, /primary key \(tenant_id, store_id, room\)/u);
  assert.match(sql, /revision bigint not null default 1/u);
  assert.match(sql, /enable row level security/u);
  assert.match(sql, /force row level security/u);
  assert.match(sql, /security invoker/u);
  assert.doesNotMatch(sql, /security definer/u);
  assert.match(sql, /revoke all on table public\.wp_cloud_sync_rooms from anon, authenticated, public/u);
  assert.match(sql, /revoke all on table public\.wp_cloud_sync_rooms from service_role/u);
  assert.match(sql, /grant select, insert, update on table public\.wp_cloud_sync_rooms to service_role/u);
  assert.match(sql, /revoke delete on table public\.wp_cloud_sync_rooms from service_role/u);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete)[^;]*\bto\s+(?:anon|authenticated)\b/iu);
  assert.match(copySql, /on conflict \(tenant_id, store_id, room\) do update/u);
  assert.doesNotMatch(copySql, /revoke all on table public\.%I from anon/u);
  assert.match(lockdownSql, /enable row level security/u);
  assert.match(lockdownSql, /force row level security/u);
  assert.match(lockdownSql, /revoke all on table public\.%I from anon, authenticated, public/u);
  assert.match(lockdownSql, /grant select on table public\.%I to service_role/u);
  assert.match(verifySql, /set transaction read only/u);
  assert.match(verifySql, /missing_room_count/u);
  assert.match(verifySql, /privilege_matches/u);
  assert.doesNotMatch(verifySql, /^\s*(?:insert|update|delete|alter|drop|create|grant|revoke)\b/imu);
});

test('Edge Function verifies signed room scope and performs bounded compare-and-swap writes', () => {
  const source = read('supabase/functions/wp-cloud-sync-room/index.ts');
  for (const required of [
    /verifyRoomToken\(/u,
    /isRoomAuthorized\(/u,
    /claims\.storeId === storeId/u,
    /claims\.tenantId === tenantId/u,
    /expectedRevision/u,
    /\.eq\(["']revision["'], args\.expectedRevision\)/u,
    /revision_conflict/u,
    /consumeRateLimit\(/u,
    /MAX_PAYLOAD_BYTES/u,
    /WP_CLOUD_SYNC_ORIGIN_STORES/u,
    /storeId !== originStoreId/u,
    /const ACTIONS = new Set/u,
    /['"]renew-room['"]/u,
    /room_token_expired/u,
    /Retry-After/u,
    /retryAfterSeconds/u,
  ]) {
    assert.match(source, required);
  }
  assert.doesNotMatch(source, /\.delete\s*\(/u);
  assert.doesNotMatch(source, /roomToken[^\n]*console/u);
});

test('browser Cloud Sync has one gateway route and no direct table or PostgREST authority', () => {
  const config = read('wp_runtime_config.mjs');
  const gateway = read('esm/native/services/cloud_sync_gateway.ts');
  const configOwner = read('esm/native/services/cloud_sync_config_shared.ts');
  const browserFlow = read('tests/e2e/helpers/project_flows.ts');
  const perfFlow = read('tools/wp_browser_perf_smoke.mjs');
  const browserSources = `${config}\n${gateway}\n${configOwner}\n${browserFlow}\n${perfFlow}`;

  assert.match(config, /gatewayFunction:\s*'wp-cloud-sync-room'/u);
  assert.match(config, /roomTokenParam:\s*'roomToken'/u);
  assert.doesNotMatch(browserSources, /\/rest\/v1\//u);
  assert.doesNotMatch(config, /\btable:\s*'wp_shared_state/u);
  assert.doesNotMatch(configOwner, /buildRestUrl/u);
  assert.doesNotMatch(browserSources, /\/rest\/v1\//u);
});

test('private room credentials use one versioned local value and retire room-only storage', () => {
  const storage = read('esm/native/platform/storage.ts');
  const rooms = read('esm/native/services/cloud_sync_owner_context_rooms.ts');
  const source = `${storage}\n${rooms}`;

  assert.match(source, /wp_private_room_credential/u);
  assert.match(rooms, /schemaVersion:\s*2/u);
  assert.match(rooms, /deriveExpiresAtFromToken:\s*rec\.schemaVersion === 1/u);
  assert.match(rooms, /expiresAt/u);
  assert.match(rooms, /removeRoomTokenFromUrl/u);
  assert.doesNotMatch(source, /wp_private_room_token/u);
  assert.doesNotMatch(source, /['"]wp_private_room['"]/u);
});

test('operator scripts deploy only the gateway and keep the write probe explicit and scoped', () => {
  const deploy = read('tools/wp_supabase_cloud_sync_deploy.ps1');
  const probe = read('tools/wp_supabase_cloud_sync_probe.ps1');

  assert.match(deploy, /wp-cloud-sync-room/u);
  assert.match(deploy, /WP_CLOUD_SYNC_ROOM_TOKEN_SECRET/u);
  assert.match(deploy, /WP_CLOUD_SYNC_ORIGIN_STORES/u);
  assert.doesNotMatch(deploy, /legacy_lockdown|db reset|SUPABASE_SERVICE_ROLE_KEY/iu);
  assert.match(probe, /renew-room/u);
  assert.match(probe, /tampered token rejection/u);
  assert.match(probe, /if \(\$IncludeWriteProbe\)[\s\S]*action\s*=\s*['"]write['"]/u);
  assert.match(probe, /revision_conflict/u);
  assert.doesNotMatch(probe, /action\s*=\s*['"]delete['"]/u);
  assert.doesNotMatch(probe, /roomToken\s*=.*Write-Host/iu);
});
