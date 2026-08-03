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
  const roomScope = read('supabase/functions/wp-cloud-sync-room/room_scope.ts');
  for (const required of [
    /verifyRoomToken\(/u,
    /isCloudSyncRoomAuthorized\(/u,
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
    /touchRoomLease\(/u,
    /wp_cloud_sync_touch_room_lease/u,
  ]) {
    assert.match(source, required);
  }
  assert.doesNotMatch(source, /\.delete\s*\(/u);
  assert.doesNotMatch(source, /roomToken[^\n]*console/u);
  assert.match(roomScope, /CLOUD_SYNC_ALLOWED_ROOM_PATHS/u);
  assert.doesNotMatch(roomScope, /startsWith\(`\$\{claims\.room\}::`\)\s*\)\s*;/u);
});

test('Cloud Sync retention is bounded, dry-run first, and owned outside browser and gateway roles', () => {
  const retentionSql = read('supabase/migrations/202607160001_cloud_sync_retention.sql');
  const expirySql = read('supabase/migrations/202607160002_cloud_sync_room_expiry.sql');
  const retentionMigrations = `${retentionSql}\n${expirySql}`;
  const scheduleSql = read('docs/supabase_cloud_sync_retention_schedule.sql');
  const verifySql = read('docs/supabase_cloud_sync_retention_verify.sql');
  const scheduleVerifySql = read('docs/supabase_cloud_sync_retention_schedule_verify.sql');
  const preflightSql = read('docs/supabase_cloud_sync_retention_preflight.sql');
  const gateway = read('supabase/functions/wp-cloud-sync-room/index.ts');

  for (const required of [
    /create schema if not exists wp_cloud_sync_private/u,
    /wp_cloud_sync_rooms_path_check/u,
    /wp_cloud_sync_rooms_family_idx/u,
    /private_room_retention interval not null default interval '7 days'/u,
    /private_room_retention between interval '7 days' and interval '365 days'/u,
    /values \('bargig', 'bargig', 'public', interval '7 days', 100, false\)/u,
    /private_room_retention = excluded\.private_room_retention,[\s\S]*enabled = false/u,
    /set expires_at = lease\.last_activity_at \+ policy\.private_room_retention/u,
    /rate_limit_retention interval not null default interval '48 hours'/u,
    /rate_limit_retention between interval '25 hours' and interval '30 days'/u,
    /enabled boolean not null default false/u,
    /p_dry_run boolean default true/u,
    /limit v_effective_limit\s+for update skip locked/u,
    /split_part\(room_row\.room, '::', 1\) = any\(v_rooms\)/u,
    /not lease\.is_public/u,
    /security definer/u,
    /revoke all on schema wp_cloud_sync_private from public, anon, authenticated, service_role/u,
    /grant execute on function public\.wp_cloud_sync_touch_room_lease\(text, text, text, text, boolean\)\s+to service_role/u,
    /if p_allow_create then/u,
    /return jsonb_build_object\('ok', false, 'code', 'room_expired'\)/u,
    /revoke all on function wp_cloud_sync_private\.cleanup_store[^;]+from public, anon, authenticated, service_role/su,
    /create or replace function wp_cloud_sync_private\.reconcile_room_leases/u,
    /revoke all on function wp_cloud_sync_private\.reconcile_room_leases\(text, text\)[^;]+service_role/su,
  ]) {
    assert.match(retentionMigrations, required);
  }
  assert.doesNotMatch(retentionSql, /45 days/u);
  const roomPathConstraint = retentionSql.match(
    /add constraint wp_cloud_sync_rooms_path_check[\s\S]*?substring\(room from position\('::' in room\)\) in \(([\s\S]*?)\n\s*\)/u
  )?.[1];
  assert.ok(roomPathConstraint);
  assert.deepEqual(
    [...roomPathConstraint.matchAll(/'([^']+)'/gu)].map(match => match[1]),
    ['::sketch', '::sketch::toMain', '::sketch::toSite2', '::tabsGate', '::syncPin', '::showContents']
  );

  const auditTable = retentionSql.match(
    /create table if not exists wp_cloud_sync_private\.cleanup_audit \([\s\S]*?\n\);/u
  )?.[0];
  assert.ok(auditTable);
  assert.doesNotMatch(auditTable, /payload|jsonb|room_token|bucket_key/iu);
  assert.match(gateway, /room: claims\.room,[\s\S]*publicRoom,/u);
  assert.equal((gateway.match(/await touchRoomLease\(/gu) || []).length, 3);
  assert.match(gateway, /allowCreate: true/gu);
  assert.match(gateway, /allowCreate: false/gu);
  assert.match(gateway, /jsonResponse\(responseOrigin, 410, \{ ok: false, code: 'room_expired' \}\)/u);
  assert.doesNotMatch(gateway, /\.delete\s*\(/u);

  assert.match(scheduleSql, /to_regnamespace\('cron'\) is null/u);
  assert.match(scheduleSql, /enable the pg_cron integration before scheduling retention/u);
  assert.doesNotMatch(scheduleSql, /create extension/u);
  assert.match(scheduleSql, /cron\.unschedule/u);
  assert.match(scheduleSql, /reconcile_room_leases\('bargig', 'bargig'\)/u);
  assert.match(scheduleSql, /Cloud Sync lease reconciliation failed/u);
  assert.match(scheduleSql, /wp_cloud_sync_private\.run_retention\(false\)/u);
  assert.match(
    scheduleSql,
    /where tenant_id = 'bargig'[\s\S]*store_id = 'bargig'[\s\S]*public_room = 'public'/u
  );

  assert.match(verifySql, /set transaction read only/u);
  assert.match(verifySql, /cleanup_store\('bargig', 'bargig', true, 100/u);
  assert.match(verifySql, /service_role_can_cleanup_rooms/u);
  assert.match(verifySql, /missing_room_family_lease_count/u);
  assert.match(verifySql, /stale_room_family_lease_count/u);
  assert.doesNotMatch(verifySql, /cleanup_(?:store|rate_limits)\([^;]*false/iu);

  assert.match(scheduleVerifySql, /exactly_one_job/u);
  assert.match(scheduleVerifySql, /latest_run_succeeded/u);
  assert.match(scheduleVerifySql, /latest_run_within_budget/u);
  assert.match(scheduleVerifySql, /no_consecutive_failures/u);
  assert.match(preflightSql, /set transaction read only/u);
  assert.match(preflightSql, /unapproved_room_path_count/u);
  assert.match(preflightSql, /maximum_rows_in_family/u);
  assert.match(preflightSql, /tenant_store_without_planned_policy_count/u);
  assert.match(preflightSql, /invalid_public_base_count/u);
  assert.doesNotMatch(preflightSql, /^\s*(?:insert|update|delete|alter|drop|create|grant|revoke)\b/imu);
});

test('Cloud Sync keeps the complete production migration chain in source control', () => {
  const historicalPairs = [
    ['supabase/migrations/20260713110031_signed_room_cloud_sync_schema.sql', 'docs/supabase_cloud_sync.sql'],
    [
      'supabase/migrations/20260713110043_copy_legacy_cloud_sync_rows.sql',
      'docs/supabase_cloud_sync_multi_store.sql',
    ],
    [
      'supabase/migrations/20260713110150_tighten_cloud_sync_service_role_privileges.sql',
      'docs/supabase_cloud_sync_legacy_lockdown.sql',
    ],
  ];

  for (const [migration, canonicalSource] of historicalPairs) {
    assert.deepEqual(readFileSync(migration), readFileSync(canonicalSource));
  }

  assert.match(
    read('supabase/migrations/202607160001_cloud_sync_retention.sql'),
    /create or replace function wp_cloud_sync_private\.run_retention/u
  );
  assert.match(
    read('supabase/migrations/202607160002_cloud_sync_room_expiry.sql'),
    /p_allow_create boolean/u
  );
});

test('migration history repair is explicit, scoped, and never re-executes production SQL', () => {
  const repair = read('tools/wp_supabase_cloud_sync_repair_history.ps1');
  const setup = read('docs/supabase_cloud_sync_setup.md');

  for (const version of [
    '20260713110031',
    '20260713110043',
    '20260713110150',
    '202607160001',
    '202607160002',
  ]) {
    assert.match(repair, new RegExp(version, 'u'));
  }

  assert.match(repair, /\[switch\]\$Apply/u);
  assert.match(repair, /Linked Supabase project/u);
  assert.match(repair, /migration',\s*'list',\s*'--linked'/u);
  assert.match(repair, /migration',\s*'repair'/u);
  assert.match(repair, /'--status',\s*'applied'/u);
  assert.match(repair, /'db',\s*'push',\s*'--linked',\s*'--dry-run'/u);
  assert.match(repair, /supabase\/\.temp\/project-ref/u);
  assert.match(repair, /project metadata only/u);
  assert.doesNotMatch(repair, /ConvertFrom-Json/u);
  assert.match(repair, /\[regex\]::Matches/u);
  assert.match(repair, /\[AllowNull\(\)\]/u);
  assert.match(repair, /\[AllowEmptyCollection\(\)\]/u);
  assert.match(repair, /\[object\[\]\]\$MigrationList = @\(\)/u);
  assert.match(repair, /IsNullOrWhiteSpace\(\$lineText\)/u);
  assert.match(repair, /\$versionOccurrences\.Count -ge 2/u);
  assert.match(repair, /\$previousErrorActionPreference = \$ErrorActionPreference/u);
  assert.match(repair, /\$ErrorActionPreference = 'Continue'/u);
  assert.match(repair, /\$exitCode = \$LASTEXITCODE/u);
  assert.match(repair, /\$_ -is \[System\.Management\.Automation\.ErrorRecord\]/u);
  assert.match(repair, /if \(\$exitCode -ne 0\)/u);
  assert.doesNotMatch(repair, /[^\x00-\x7f]/u);

  const repairPolicy = Object.fromEntries(
    [...repair.matchAll(/Version = '(\d+)'[\s\S]*?Repair = \$(true|false)/gu)].map(match => [
      match[1],
      match[2] === 'true',
    ])
  );
  assert.deepEqual(repairPolicy, {
    20260713110031: false,
    20260713110043: false,
    20260713110150: false,
    202607160001: true,
    202607160002: true,
  });
  assert.doesNotMatch(repair, /functions',\s*'deploy|secrets',\s*'set'/u);
  assert.doesNotMatch(repair, /run_retention\s*\(|cron\.(?:schedule|unschedule)/u);
  assert.doesNotMatch(repair, /execute_sql|psql|supabase_migrations\.schema_migrations/u);

  assert.match(setup, /One-time Bargig production history closeout/u);
  assert.match(setup, /wp_supabase_cloud_sync_repair_history\.ps1 -Apply/u);
  assert.match(setup, /never executes migration SQL/u);
  assert.match(setup, /supabase db push --linked/u);
});

test('browser Cloud Sync has one gateway route and no direct table or PostgREST authority', () => {
  const config = read('wp_runtime_config.mjs');
  const gateway = read('esm/native/services/cloud_sync_gateway.ts');
  const configOwner = read('esm/native/services/cloud_sync_config_shared.ts');
  const browserFlow = read('tests/e2e/helpers/project_flows.ts');
  const perfFlow = read('tools/wp_browser_perf_smoke.mjs');
  const browserSources = `${config}\n${gateway}\n${configOwner}\n${browserFlow}\n${perfFlow}`;

  assert.match(config, /gatewayFunction:\s*["']wp-cloud-sync-room["']/u);
  assert.match(config, /roomTokenParam:\s*["']roomToken["']/u);
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
  assert.match(probe, /leaseTouchedAt/u);
  assert.match(probe, /signed read and lease touch from customer origin/u);
  assert.match(probe, /three dot-separated segments/u);
  assert.match(probe, /\$responseBody\s*=\s*if/u);
  assert.doesNotMatch(probe, /\$body\s*=\s*if/iu);
  assert.doesNotMatch(probe, /System\.Net\.Http\.HttpResponseMessage/u);
  assert.doesNotMatch(probe, /action\s*=\s*['"]delete['"]/u);
  assert.doesNotMatch(probe, /roomToken\s*=.*Write-Host/iu);
});
