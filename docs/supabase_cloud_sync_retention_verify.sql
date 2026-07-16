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
    'public.wp_cloud_sync_touch_room_lease(text, text, text, text)',
    'EXECUTE'
  ) as anon_can_touch_lease,
  has_function_privilege(
    'authenticated',
    'public.wp_cloud_sync_touch_room_lease(text, text, text, text)',
    'EXECUTE'
  ) as authenticated_can_touch_lease,
  has_function_privilege(
    'service_role',
    'public.wp_cloud_sync_touch_room_lease(text, text, text, text)',
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
  ) as service_role_can_cleanup_rate_limits;

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
  count(*) filter (where is_public and expires_at is not null) as invalid_public_lease_count,
  count(*) filter (where not is_public and expires_at is null) as invalid_private_lease_count,
  count(*) filter (where expires_at < last_activity_at) as expiry_before_activity_count
from wp_cloud_sync_private.room_leases;

select *
from wp_cloud_sync_private.cleanup_store('bargig', 'bargig', true, 100, clock_timestamp());

select *
from wp_cloud_sync_private.cleanup_rate_limits(true, 5000, clock_timestamp());

commit;
