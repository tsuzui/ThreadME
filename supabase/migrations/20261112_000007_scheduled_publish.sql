create function public.claim_scheduled_threads_post(p_id uuid, p_version timestamptz, p_account_id uuid, p_account_version timestamptz)
returns setof public.content_posts
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(762401);
  perform 1 from public.app_settings where singleton and automation_enabled
    and (clock_timestamp() at time zone 'Asia/Jakarta')::time >= posting_time for share;
  if not found then return; end if;
  perform 1 from public.content_posts where id = p_id
    and scheduled_date = (clock_timestamp() at time zone 'Asia/Jakarta')::date
    and scheduled_for <= clock_timestamp() and publish_attempts < 10 for update;
  if not found then return; end if;
  return query select * from public.claim_threads_post(p_id, p_version, p_account_id, p_account_version);
end;
$$;
revoke all on function public.claim_scheduled_threads_post(uuid, timestamptz, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_scheduled_threads_post(uuid, timestamptz, uuid, timestamptz) to service_role;
