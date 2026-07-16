-- Read-only preflight for the Cloud Sync retention migration.
-- Run before 202607160001_cloud_sync_retention.sql. The report intentionally
-- exposes aggregate counts only; it never selects room ids, tokens or payloads.

begin;
set transaction read only;
set local statement_timeout = '60s';

with room_rows as (
  select
    tenant_id,
    store_id,
    room,
    split_part(room, '::', 1) as base_room,
    case
      when position('::' in room) = 0 then ''
      else substring(room from position('::' in room))
    end as room_path
  from public.wp_cloud_sync_rooms
)
select
  count(*) as total_room_row_count,
  count(*) filter (
    where base_room !~ '^[a-zA-Z0-9_-]{1,128}$'
  ) as invalid_base_room_count,
  count(*) filter (
    where room_path not in (
      '',
      '::sketch',
      '::sketch::toMain',
      '::sketch::toSite2',
      '::tabsGate',
      '::syncPin',
      '::showContents'
    )
  ) as unapproved_room_path_count
from room_rows;

with room_families as (
  select tenant_id, store_id, split_part(room, '::', 1) as base_room, count(*) as row_count
  from public.wp_cloud_sync_rooms
  group by tenant_id, store_id, split_part(room, '::', 1)
)
select
  count(*) as room_family_count,
  coalesce(max(row_count), 0) as maximum_rows_in_family,
  count(*) filter (where row_count > 7) as over_limit_family_count
from room_families;

with planned_policies(tenant_id, store_id, public_room) as (
  values ('bargig'::text, 'bargig'::text, 'public'::text)
), active_scopes as (
  select distinct tenant_id, store_id
  from public.wp_cloud_sync_rooms
)
select
  count(*) as tenant_store_without_planned_policy_count
from active_scopes scope
left join planned_policies policy
  on policy.tenant_id = scope.tenant_id
 and policy.store_id = scope.store_id
where policy.tenant_id is null;

with planned_policies(tenant_id, store_id, public_room) as (
  values ('bargig'::text, 'bargig'::text, 'public'::text)
), public_families as (
  select
    policy.tenant_id,
    policy.store_id,
    count(room_row.room) as public_row_count,
    count(room_row.room) filter (
      where position('::' in room_row.room) = 0
    ) as public_base_row_count
  from planned_policies policy
  left join public.wp_cloud_sync_rooms room_row
    on room_row.tenant_id = policy.tenant_id
   and room_row.store_id = policy.store_id
   and split_part(room_row.room, '::', 1) = policy.public_room
  group by policy.tenant_id, policy.store_id
)
select
  count(*) filter (where public_row_count > 7) as oversized_public_family_count,
  count(*) filter (where public_row_count > 0 and public_base_row_count <> 1)
    as invalid_public_base_count
from public_families;

commit;
