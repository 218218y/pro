-- Read-only verification for Cloud Sync retention ownership and policy.

begin;
set transaction read only;
set local statement_timeout = '60s';

select
  has_schema_privilege('anon', 'wp_cloud_sync_private', 'USAGE') as anon_can_use_private_schema,
  has_schema_privilege('authenticated', 'wp_cloud_sync_private', 'USAGE')
    as authenticated_can_use_private_schema,
  has_schema_privilege('service_role', 'wp_cloud_sync_private', 'USAGE')
    as service_role_can_use_private_schema;

select
  has_function_privilege(
    'anon',
    'public.wp_cloud_sync_touch_room_lease(text, text, text, text, boolean)',
    'EXECUTE'
  ) as anon_can_touch_lease,
  has_function_privilege(
    'authenticated',
    'public.wp_cloud_sync_touch_room_lease(text, text, text, text, boolean)',
    'EXECUTE'
  ) as authenticated_can_touch_lease,
  has_function_privilege(
    'service_role',
    'public.wp_cloud_sync_touch_room_lease(text, text, text, text, boolean)',
    'EXECUTE'
  ) as service_role_can_touch_lease,
  has_function_privilege(
    'service_role',
    'wp_cloud_sync_private.cleanup_store(text, text, boolean, integer, timestamptz)',
    'EXECUTE'
  ) as service_role_can_cleanup_rooms,
  has_function_privilege(
    'service_role',
    'wp_cloud_sync_private.cleanup_rate_limits(boolean, integer, timestamptz)',
    'EXECUTE'
  ) as service_role_can_cleanup_rate_limits,
  has_function_privilege(
    'service_role',
    'wp_cloud_sync_private.reconcile_room_leases(text, text)',
    'EXECUTE'
  ) as service_role_can_reconcile_leases;

select
  tenant_id,
  store_id,
  public_room,
  private_room_retention,
  room_batch_limit,
  enabled
from wp_cloud_sync_private.retention_policies
order by tenant_id, store_id;

select
  rate_limit_retention,
  rate_limit_batch_limit,
  audit_retention
from wp_cloud_sync_private.retention_settings
where singleton;

with room_families as (
  select
    room_row.tenant_id,
    room_row.store_id,
    split_part(room_row.room, '::', 1) as room,
    max(room_row.updated_at) as last_activity_at
  from public.wp_cloud_sync_rooms room_row
  group by room_row.tenant_id, room_row.store_id, split_part(room_row.room, '::', 1)
)
select
  count(*) filter (where lease.room is null) as missing_room_family_lease_count,
  count(*) filter (
    where lease.room is not null
      and lease.last_activity_at < family.last_activity_at
  ) as stale_room_family_lease_count
from room_families family
left join wp_cloud_sync_private.room_leases lease
  on lease.tenant_id = family.tenant_id
 and lease.store_id = family.store_id
 and lease.room = family.room;

select
  count(*) filter (where is_public and expires_at is not null) as invalid_public_lease_count,
  count(*) filter (where not is_public and expires_at is null) as invalid_private_lease_count,
  count(*) filter (where expires_at < last_activity_at) as expiry_before_activity_count
from wp_cloud_sync_private.room_leases;

with room_families as (
  select distinct
    room_row.tenant_id,
    room_row.store_id,
    split_part(room_row.room, '::', 1) as room
  from public.wp_cloud_sync_rooms room_row
)
select count(*) as orphan_room_lease_count
from wp_cloud_sync_private.room_leases lease
left join room_families family
  on family.tenant_id = lease.tenant_id
 and family.store_id = lease.store_id
 and family.room = lease.room
where family.room is null;

select *
from wp_cloud_sync_private.cleanup_store('bargig', 'bargig', true, 100, clock_timestamp());

select *
from wp_cloud_sync_private.cleanup_rate_limits(true, 5000, clock_timestamp());

commit;
