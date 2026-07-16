-- Make retention deletion terminal for private-room credentials.
-- Only issue-public/create-room may create a missing lease; authenticated
-- read/write/renew calls can extend an existing lease but cannot resurrect one.

begin;
set local statement_timeout = '60s';

drop function if exists public.wp_cloud_sync_touch_room_lease(text, text, text, text);

create or replace function public.wp_cloud_sync_touch_room_lease(
  p_tenant_id text,
  p_store_id text,
  p_room text,
  p_public_room text,
  p_allow_create boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_policy wp_cloud_sync_private.retention_policies%rowtype;
  v_is_public boolean;
  v_expires_at timestamptz;
begin
  if p_tenant_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_store_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_room !~ '^[a-zA-Z0-9_-]{1,128}$'
     or p_public_room !~ '^[a-zA-Z0-9_-]{1,128}$'
     or p_allow_create is null then
    raise exception 'invalid Cloud Sync lease identity';
  end if;

  select *
  into v_policy
  from wp_cloud_sync_private.retention_policies policy
  where policy.tenant_id = p_tenant_id
    and policy.store_id = p_store_id;

  if not found then
    raise exception 'Cloud Sync retention policy is not configured for tenant/store';
  end if;
  if v_policy.public_room <> p_public_room then
    raise exception 'Cloud Sync public room does not match retention policy';
  end if;

  v_is_public := p_room = v_policy.public_room;
  v_expires_at := case
    when v_is_public then null
    else v_now + v_policy.private_room_retention
  end;

  if p_allow_create then
    insert into wp_cloud_sync_private.room_leases (
      tenant_id,
      store_id,
      room,
      is_public,
      last_activity_at,
      expires_at
    )
    values (p_tenant_id, p_store_id, p_room, v_is_public, v_now, v_expires_at)
    on conflict (tenant_id, store_id, room) do update
    set
      is_public = excluded.is_public,
      last_activity_at = excluded.last_activity_at,
      expires_at = excluded.expires_at;
  else
    update wp_cloud_sync_private.room_leases lease
    set
      is_public = v_is_public,
      last_activity_at = v_now,
      expires_at = v_expires_at
    where lease.tenant_id = p_tenant_id
      and lease.store_id = p_store_id
      and lease.room = p_room;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'room_expired');
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'touchedAt', v_now,
    'expiresAt', v_expires_at
  );
end;
$$;

revoke all on function public.wp_cloud_sync_touch_room_lease(text, text, text, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.wp_cloud_sync_touch_room_lease(text, text, text, text, boolean)
  to service_role;

commit;
