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

update wp_cloud_sync_private.retention_policies
set enabled = true, updated_at = clock_timestamp()
where tenant_id = 'bargig'
  and store_id = 'bargig'
  and public_room = 'public';

do $$
declare
  v_job_id bigint;
begin
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
