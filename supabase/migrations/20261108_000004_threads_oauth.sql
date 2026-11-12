begin;

create unique index social_accounts_one_active_threads on public.social_accounts(platform) where is_active;

drop policy if exists "admin access social accounts" on public.social_accounts;
revoke all on public.social_accounts from anon, authenticated;
grant select (id, platform, external_user_id, username, token_expires_at, granted_scopes, last_token_refresh_at, is_active, connected_at, updated_at) on public.social_accounts to authenticated;
create policy "admin read safe social account columns" on public.social_accounts for select to authenticated using (public.is_threadme_admin());

create table public.threads_oauth_states (
  state_hash text primary key,
  admin_id uuid not null references auth.users(id) on delete cascade,
  account_revision text not null,
  expires_at timestamptz not null
);
alter table public.threads_oauth_states enable row level security;
revoke all on public.threads_oauth_states from anon, authenticated;
grant all on public.threads_oauth_states to service_role;

alter table public.social_accounts add column refresh_lease uuid;
alter table public.social_accounts add column refresh_lease_until timestamptz;

create function public.save_threads_account(p_external_id text, p_username text, p_token text, p_expires timestamptz, p_scopes text[], p_revision text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(762401);
  if exists (select 1 from public.content_posts where status in ('publishing', 'publish_unknown')) then
    raise exception 'Publishing needs review';
  end if;
  if p_revision = 'none' then
    if exists (select 1 from public.social_accounts where is_active) then raise exception 'Account changed during OAuth'; end if;
  elsif not exists (select 1 from public.social_accounts where is_active
    and id = (p_revision::jsonb->>'id')::uuid and updated_at = (p_revision::jsonb->>'updated_at')::timestamptz) then
    raise exception 'Account changed during OAuth';
  end if;
  if exists (select 1 from public.social_accounts where is_active and external_user_id <> p_external_id) then
    raise exception 'Disconnect existing account first';
  end if;
  if exists (select 1 from public.social_accounts where external_user_id = p_external_id and refresh_lease_until > now()) then
    raise exception 'Refresh in progress';
  end if;
  insert into public.social_accounts(external_user_id, username, encrypted_access_token, token_expires_at, granted_scopes, is_active)
    values(p_external_id, p_username, p_token, p_expires, p_scopes, true)
    on conflict(external_user_id) do update set username = excluded.username,
      encrypted_access_token = excluded.encrypted_access_token, token_expires_at = excluded.token_expires_at,
      granted_scopes = excluded.granted_scopes, is_active = true, connected_at = now(),
      last_token_refresh_at = null, refresh_lease = null, refresh_lease_until = null, updated_at = clock_timestamp();
end;
$$;

create function public.disconnect_threads_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(762401);
  if exists (select 1 from public.content_posts where status in ('publishing', 'publish_unknown')) then
    raise exception 'Publishing needs review';
  end if;
  if exists (select 1 from public.social_accounts where is_active and refresh_lease_until > now()) then
    raise exception 'Refresh in progress';
  end if;
  delete from public.threads_oauth_states;
  update public.social_accounts set is_active = false, encrypted_access_token = '', updated_at = clock_timestamp() where is_active;
end;
$$;

revoke all on function public.save_threads_account(text, text, text, timestamptz, text[], text) from public, anon, authenticated;
grant execute on function public.save_threads_account(text, text, text, timestamptz, text[], text) to service_role;
revoke all on function public.disconnect_threads_account() from public, anon, authenticated;
grant execute on function public.disconnect_threads_account() to service_role;

create function public.claim_threads_refresh(p_id uuid, p_version timestamptz, p_lease uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(762401);
  if exists (select 1 from public.content_posts where status in ('publishing', 'publish_unknown')) then return false; end if;
  update public.social_accounts set refresh_lease = p_lease, refresh_lease_until = now() + interval '2 minutes'
    where id = p_id and is_active and updated_at = p_version and token_expires_at > now()
      and (refresh_lease_until is null or refresh_lease_until <= now());
  return found;
end;
$$;
revoke all on function public.claim_threads_refresh(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.claim_threads_refresh(uuid, timestamptz, uuid) to service_role;

commit;
