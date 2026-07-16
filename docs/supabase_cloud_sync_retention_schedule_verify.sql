-- Run after the first scheduled retention execution. This verification is
-- read-only and exposes only job metadata and count-only maintenance results.

begin;
set transaction read only;
set local statement_timeout = '30s';

select
  count(*) = 1 as exactly_one_job,
  count(*) filter (where active) = 1 as job_is_active,
  bool_and(schedule = '17 3 * * *') as schedule_matches,
  bool_and(command = 'select wp_cloud_sync_private.run_retention(false);') as command_matches
from cron.job
where jobname = 'wp-cloud-sync-retention-daily';

with target_job as (
  select jobid
  from cron.job
  where jobname = 'wp-cloud-sync-retention-daily'
), recent_runs as (
  select
    details.status,
    details.return_message,
    details.start_time,
    details.end_time,
    details.end_time - details.start_time as duration
  from cron.job_run_details details
  join target_job job on job.jobid = details.jobid
  order by details.start_time desc
  limit 10
)
select status, return_message, start_time, end_time, duration
from recent_runs
order by start_time desc;

with target_job as (
  select jobid
  from cron.job
  where jobname = 'wp-cloud-sync-retention-daily'
), ranked_runs as (
  select
    details.status,
    details.start_time,
    details.end_time,
    row_number() over (order by details.start_time desc) as recency
  from cron.job_run_details details
  join target_job job on job.jobid = details.jobid
), latest as (
  select * from ranked_runs where recency = 1
)
select
  exists (select 1 from latest) as has_run,
  coalesce((select status = 'succeeded' from latest), false) as latest_run_succeeded,
  coalesce((select end_time - start_time <= interval '5 minutes' from latest), false)
    as latest_run_within_budget,
  not exists (
    select 1
    from ranked_runs first_run
    join ranked_runs second_run on second_run.recency = 2
    where first_run.recency = 1
      and first_run.status <> 'succeeded'
      and second_run.status <> 'succeeded'
  ) as no_consecutive_failures;

commit;
