-- Read-only Cloud Sync rollout verification.
--
-- Run after supabase_cloud_sync_multi_store.sql and again after
-- supabase_cloud_sync_legacy_lockdown.sql. This file does not mutate data.

begin;
set transaction read only;
set local statement_timeout = '60s';

-- Both canonical tables must report rls_enabled = true and rls_forced = true.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('wp_cloud_sync_rooms', 'wp_cloud_sync_rate_limits')
order by c.relname;

-- Every row must report privilege_matches = true. Browser roles have no CRUD;
-- service_role has only the operations required by the Edge Function.
with expected(table_name, role_name, privilege_name, expected_value) as (
  values
    ('wp_cloud_sync_rooms', 'anon', 'SELECT', false),
    ('wp_cloud_sync_rooms', 'anon', 'INSERT', false),
    ('wp_cloud_sync_rooms', 'anon', 'UPDATE', false),
    ('wp_cloud_sync_rooms', 'anon', 'DELETE', false),
    ('wp_cloud_sync_rooms', 'authenticated', 'SELECT', false),
    ('wp_cloud_sync_rooms', 'authenticated', 'INSERT', false),
    ('wp_cloud_sync_rooms', 'authenticated', 'UPDATE', false),
    ('wp_cloud_sync_rooms', 'authenticated', 'DELETE', false),
    ('wp_cloud_sync_rooms', 'service_role', 'SELECT', true),
    ('wp_cloud_sync_rooms', 'service_role', 'INSERT', true),
    ('wp_cloud_sync_rooms', 'service_role', 'UPDATE', true),
    ('wp_cloud_sync_rooms', 'service_role', 'DELETE', false),
    ('wp_cloud_sync_rate_limits', 'anon', 'SELECT', false),
    ('wp_cloud_sync_rate_limits', 'anon', 'INSERT', false),
    ('wp_cloud_sync_rate_limits', 'anon', 'UPDATE', false),
    ('wp_cloud_sync_rate_limits', 'anon', 'DELETE', false),
    ('wp_cloud_sync_rate_limits', 'authenticated', 'SELECT', false),
    ('wp_cloud_sync_rate_limits', 'authenticated', 'INSERT', false),
    ('wp_cloud_sync_rate_limits', 'authenticated', 'UPDATE', false),
    ('wp_cloud_sync_rate_limits', 'authenticated', 'DELETE', false),
    ('wp_cloud_sync_rate_limits', 'service_role', 'SELECT', true),
    ('wp_cloud_sync_rate_limits', 'service_role', 'INSERT', true),
    ('wp_cloud_sync_rate_limits', 'service_role', 'UPDATE', true),
    ('wp_cloud_sync_rate_limits', 'service_role', 'DELETE', false)
)
select
  table_name,
  role_name,
  privilege_name,
  expected_value,
  has_table_privilege(role_name, format('public.%I', table_name), privilege_name) as actual_value,
  has_table_privilege(role_name, format('public.%I', table_name), privilege_name) = expected_value
    as privilege_matches
from expected
order by table_name, role_name, privilege_name;

-- The rate-limit function is callable only by service_role; the trigger helper
-- is not a public RPC surface.
select
  has_function_privilege(
    'anon',
    'public.wp_cloud_sync_consume_rate_limit(text, integer, integer)',
    'EXECUTE'
  ) as anon_can_consume_rate_limit,
  has_function_privilege(
    'authenticated',
    'public.wp_cloud_sync_consume_rate_limit(text, integer, integer)',
    'EXECUTE'
  ) as authenticated_can_consume_rate_limit,
  has_function_privilege(
    'service_role',
    'public.wp_cloud_sync_consume_rate_limit(text, integer, integer)',
    'EXECUTE'
  ) as service_role_can_consume_rate_limit;

-- Every row must report missing_room_count = 0. Counts may differ when the
-- canonical table also contains rooms created by the signed-room client.
select
  'bargig' as store_id,
  (select count(*) from public.wp_shared_state) as legacy_row_count,
  (select count(*) from public.wp_cloud_sync_rooms
    where tenant_id = 'bargig' and store_id = 'bargig') as canonical_row_count,
  (select count(*)
   from public.wp_shared_state legacy
   where not exists (
     select 1
     from public.wp_cloud_sync_rooms canonical
     where canonical.tenant_id = 'bargig'
       and canonical.store_id = 'bargig'
       and canonical.room = legacy.room
   )) as missing_room_count
union all
select
  'store-1',
  (select count(*) from public.wp_shared_state_store_1),
  (select count(*) from public.wp_cloud_sync_rooms
    where tenant_id = 'store-1' and store_id = 'store-1'),
  (select count(*)
   from public.wp_shared_state_store_1 legacy
   where not exists (
     select 1
     from public.wp_cloud_sync_rooms canonical
     where canonical.tenant_id = 'store-1'
       and canonical.store_id = 'store-1'
       and canonical.room = legacy.room
   ))
union all
select
  'store-2',
  (select count(*) from public.wp_shared_state_store_2),
  (select count(*) from public.wp_cloud_sync_rooms
    where tenant_id = 'store-2' and store_id = 'store-2'),
  (select count(*)
   from public.wp_shared_state_store_2 legacy
   where not exists (
     select 1
     from public.wp_cloud_sync_rooms canonical
     where canonical.tenant_id = 'store-2'
       and canonical.store_id = 'store-2'
       and canonical.room = legacy.room
   ))
order by store_id;

-- Before lockdown this reports the existing compatibility boundary. After
-- lockdown every row must show RLS enabled/forced and browser SELECT = false.
select
  c.relname as legacy_table,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
  has_table_privilege('service_role', c.oid, 'SELECT') as service_role_can_select,
  (
    has_table_privilege('service_role', c.oid, 'INSERT')
    or has_table_privilege('service_role', c.oid, 'UPDATE')
    or has_table_privilege('service_role', c.oid, 'DELETE')
  ) as service_role_can_mutate
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('wp_shared_state', 'wp_shared_state_store_1', 'wp_shared_state_store_2')
order by c.relname;

-- The canonical table should never contain invalid identifiers, non-object
-- payloads, oversized payloads, or revisions below one.
select
  count(*) filter (where tenant_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$') as invalid_tenant_count,
  count(*) filter (where store_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$') as invalid_store_count,
  count(*) filter (
    where room !~ '^[a-zA-Z0-9_-]{1,128}(::[a-zA-Z0-9_-]{1,64})*$'
  ) as invalid_room_count,
  count(*) filter (where jsonb_typeof(payload) <> 'object') as non_object_payload_count,
  count(*) filter (where octet_length(payload::text) > 2000000) as oversized_payload_count,
  count(*) filter (where revision < 1) as invalid_revision_count
from public.wp_cloud_sync_rooms;

commit;
