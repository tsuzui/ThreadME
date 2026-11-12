create or replace function public.claim_threads_post(p_id uuid, p_version timestamptz, p_account_id uuid, p_account_version timestamptz)
returns setof public.content_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  account public.social_accounts;
begin
  perform pg_advisory_xact_lock(762401);
  select * into account from public.social_accounts where id = p_account_id for update;
  if not found or not account.is_active or account.updated_at <> p_account_version
    or account.refresh_lease_until > now()
    or account.token_expires_at is null or account.token_expires_at <= now()
    or not account.granted_scopes @> array['threads_basic', 'threads_content_publish']::text[] then
    return;
  end if;
  if exists (select 1 from public.content_posts where status in ('publishing', 'publish_unknown') and id <> p_id) then
    return;
  end if;
  return query update public.content_posts
    set status = 'publishing', social_account_id = p_account_id,
        publish_attempts = publish_attempts + 1, last_attempt_at = now(),
        updated_at = clock_timestamp(), last_error_code = null, last_error_message = null
    where id = p_id and updated_at = p_version and threads_media_id is null
      and ((status = 'ready' and threads_container_id is null)
        or (status = 'publishing' and threads_container_id is not null
          and social_account_id = p_account_id and last_error_code = 'container_not_ready'))
    returning *;
end;
$$;
revoke all on function public.claim_threads_post(uuid, timestamptz, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_threads_post(uuid, timestamptz, uuid, timestamptz) to service_role;
