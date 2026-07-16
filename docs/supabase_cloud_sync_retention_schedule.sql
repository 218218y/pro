-- Enable the reviewed Bargig retention policy and schedule one bounded daily
-- cleanup. Apply only after running the dry-run and reviewing its counts.

begin;
set local statement_timeout = '60s';

do $$
begin
  if to_regnamespace('cron') is null then
    raise exception 'Supabase Cron is not enabled; enable the pg_cron integration before scheduling retention';
  end if;
end;
$$;

do $$
declare
  v_job_id bigint;
  v_missing_count integer := 0;
  v_stale_count integer := 0;
  v_invalid_count integer := 0;
  v_public_room text;
  v_private_retention interval;
begin
  select policy.public_room, policy.private_room_retention
  into v_public_room, v_private_retention
  from wp_cloud_sync_private.retention_policies policy
  where policy.tenant_id = 'bargig'
    and policy.store_id = 'bargig';

  if not found or v_public_room <> 'public' then
    raise exception 'Bargig Cloud Sync retention policy is missing or has an unexpected public room';
  end if;

  perform *
  from wp_cloud_sync_private.reconcile_room_leases('bargig', 'bargig');

  with room_families as (
    select
      split_part(room_row.room, '::', 1) as room,
      max(room_row.updated_at) as last_activity_at
    from public.wp_cloud_sync_rooms room_row
    where room_row.tenant_id = 'bargig'
      and room_row.store_id = 'bargig'
    group by split_part(room_row.room, '::', 1)
  )
  select
    count(*) filter (where lease.room is null)::integer,
    count(*) filter (
      where lease.room is not null
        and (
          lease.is_public is distinct from (family.room = v_public_room)
          or lease.last_activity_at < family.last_activity_at
          or ((family.room = v_public_room) and lease.expires_at is not null)
          or (
            family.room <> v_public_room
            and (
              lease.expires_at is null
              or lease.expires_at < family.last_activity_at + v_private_retention
            )
          )
        )
    )::integer
  into v_missing_count, v_stale_count
  from room_families family
  left join wp_cloud_sync_private.room_leases lease
    on lease.tenant_id = 'bargig'
   and lease.store_id = 'bargig'
   and lease.room = family.room;

  select count(*)::integer
  into v_invalid_count
  from wp_cloud_sync_private.room_leases lease
  where lease.tenant_id = 'bargig'
    and lease.store_id = 'bargig'
    and (
      (lease.is_public and lease.expires_at is not null)
      or (not lease.is_public and lease.expires_at is null)
    );

  if v_missing_count <> 0 or v_stale_count <> 0 or v_invalid_count <> 0 then
    raise exception 'Cloud Sync lease reconciliation failed (missing %, stale %, invalid %)',
      v_missing_count, v_stale_count, v_invalid_count;
  end if;

  update wp_cloud_sync_private.retention_policies
  set enabled = true, updated_at = clock_timestamp()
  where tenant_id = 'bargig'
    and store_id = 'bargig'
    and public_room = 'public';

  if not exists (
    select 1
    from wp_cloud_sync_private.retention_policies policy
    where policy.tenant_id = 'bargig'
      and policy.store_id = 'bargig'
      and policy.public_room = 'public'
      and policy.enabled
  ) then
    raise exception 'Bargig Cloud Sync retention policy was not enabled';
  end if;

  for v_job_id in
    select job.jobid
    from cron.job job
    where job.jobname = 'wp-cloud-sync-retention-daily'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'wp-cloud-sync-retention-daily',
    '17 3 * * *',
    $command$select wp_cloud_sync_private.run_retention(false);$command$
  );
end;
$$;

commit;

select jobid, jobname, schedule, command, active
from cron.job
where jobname = 'wp-cloud-sync-retention-daily';
