begin;

alter table public.automation_runs
  add column lease_id uuid,
  add column lease_expires_at timestamptz,
  add column attempts integer not null default 0 check (attempts >= 0),
  add column next_attempt_at timestamptz;

-- The namespace is distinct from the Threads account/publishing lock.
create function public.claim_daily_generation(
  p_date date, p_lease uuid, p_manual boolean, p_version timestamptz default null
)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.automation_runs%rowtype;
  v_post public.content_posts%rowtype;
  v_now timestamptz;
begin
  if p_date is null or p_lease is null or p_manual is null then return false; end if;
  perform pg_advisory_xact_lock(762406, p_date - date '2000-01-01');
  v_now := clock_timestamp();
  if p_date <> (v_now at time zone 'Asia/Jakarta')::date then return false; end if;

  if not p_manual then
    perform 1 from public.app_settings
      where singleton and automation_enabled
        and (v_now at time zone 'Asia/Jakarta')::time >= generation_time
      for share;
    if not found then return false; end if;
  end if;

  select * into v_post from public.content_posts where scheduled_date = p_date for update;
  if found then
    if not p_manual or p_version is null or v_post.updated_at <> p_version
      or v_post.status <> 'ready' or v_post.content_type <> 'text'
      or v_post.image_storage_path is not null or v_post.image_public_url is not null
      or v_post.image_prompt is not null or v_post.image_alt_text is not null
      or coalesce(v_post.generation_metadata ->> 'manuallyEdited', 'false') <> 'false'
      or v_post.threads_container_id is not null or v_post.threads_media_id is not null
      or v_post.published_at is not null then
      return false;
    end if;
  elsif p_version is not null then
    return false;
  end if;

  insert into public.automation_runs (run_date, idempotency_key)
    values (p_date, 'daily-generation:' || p_date::text)
    on conflict (run_date) do nothing;
  select * into v_run from public.automation_runs where run_date = p_date for update;
  v_now := clock_timestamp();
  if p_date <> (v_now at time zone 'Asia/Jakarta')::date
    or v_run.lease_expires_at > v_now
    or (not p_manual and v_run.attempts >= 3)
    or v_run.next_attempt_at > v_now then
    return false;
  end if;

  update public.automation_runs
    set lease_id = p_lease, lease_expires_at = v_now + interval '3 minutes',
        attempts = attempts + 1, status = 'running', current_stage = 'generating',
        started_at = v_now, completed_at = null, next_attempt_at = null,
        error_code = null, error_message = null,
        metadata = jsonb_set(metadata, '{generation_claim}',
          jsonb_build_object('manual', p_manual, 'version', p_version))
    where id = v_run.id;
  return true;
end;
$$;

create function public.finalize_daily_generation(
  p_date date, p_lease uuid, p_version timestamptz,
  p_post jsonb, p_history jsonb, p_manual boolean
)
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.automation_runs%rowtype;
  v_post public.content_posts%rowtype;
  v_history_id uuid;
  v_post_id uuid;
  v_has_post boolean;
  v_now timestamptz;
begin
  if p_date is null or p_lease is null or p_manual is null then
    raise exception 'Invalid generation claim';
  end if;
  perform pg_advisory_xact_lock(762406, p_date - date '2000-01-01');
  select * into v_run from public.automation_runs where run_date = p_date for update;
  if not found then raise exception 'Generation claim unavailable'; end if;
  v_now := clock_timestamp();
  if v_run.lease_id is distinct from p_lease
    or v_run.lease_expires_at is null or v_run.lease_expires_at <= v_now
    or p_date <> (v_now at time zone 'Asia/Jakarta')::date
    or (v_run.metadata -> 'generation_claim' ->> 'manual') is distinct from p_manual::text
    or (v_run.metadata -> 'generation_claim' ->> 'version')::timestamptz is distinct from p_version then
    raise exception 'Generation claim expired or changed';
  end if;

  if not p_manual then
    perform 1 from public.app_settings where singleton and automation_enabled for share;
    if not found then raise exception 'Automation is disabled'; end if;
  end if;
  if jsonb_typeof(p_post) is distinct from 'object'
    or jsonb_typeof(p_history) is distinct from 'object' then
    raise exception 'Invalid generation payload';
  end if;

  select * into v_post from public.content_posts where scheduled_date = p_date for update;
  v_has_post := found;
  if v_has_post then
    if not p_manual or p_version is null or v_post.updated_at <> p_version
      or v_post.status <> 'ready' or v_post.content_type <> 'text'
      or v_post.image_storage_path is not null or v_post.image_public_url is not null
      or v_post.image_prompt is not null or v_post.image_alt_text is not null
      or coalesce(v_post.generation_metadata ->> 'manuallyEdited', 'false') <> 'false'
      or v_post.threads_container_id is not null or v_post.threads_media_id is not null
      or v_post.published_at is not null then
      raise exception 'Draft changed during generation';
    end if;
  elsif p_version is not null then
    raise exception 'Draft changed during generation';
  end if;

  -- Check again after potentially waiting for settings or draft row locks.
  v_now := clock_timestamp();
  if v_run.lease_expires_at <= v_now
    or p_date <> (v_now at time zone 'Asia/Jakarta')::date then
    raise exception 'Generation claim expired';
  end if;

  -- Explicit history fields match the content engine; IDs and timestamps are server-owned.
  insert into public.topic_history (
    topic_id, topic, pillar, angle, angle_type, angle_fingerprint,
    selection_mode, candidate_angles, source_title, source_url, used_at
  ) values (
    (p_history ->> 'topic_id')::uuid, p_history ->> 'topic', p_history ->> 'pillar',
    p_history ->> 'angle', p_history ->> 'angle_type', p_history ->> 'angle_fingerprint',
    coalesce(p_history ->> 'selection_mode', 'mix'),
    coalesce(p_history -> 'candidate_angles', '[]'::jsonb),
    p_history ->> 'source_title', p_history ->> 'source_url', v_now
  ) returning id into v_history_id;

  -- Never populate a row from JSON: publication fields are not caller-controlled.
  if v_has_post then
    update public.content_posts set
      content = p_post ->> 'content',
      scheduled_for = (p_post ->> 'scheduled_for')::timestamptz,
      pillar = p_post ->> 'pillar', tone = p_post ->> 'tone',
      topic_id = (p_post ->> 'topic_id')::uuid, angle = p_post ->> 'angle',
      content_fingerprint = p_post ->> 'content_fingerprint',
      quality_score = (p_post ->> 'quality_score')::smallint,
      quality_notes = coalesce(p_post -> 'quality_notes', '{}'::jsonb),
      generation_metadata = coalesce(p_post -> 'generation_metadata', '{}'::jsonb),
      run_id = v_run.id, topic_history_id = v_history_id, updated_at = v_now
    where id = v_post.id and updated_at = p_version and status = 'ready'
      and content_type = 'text' and image_storage_path is null and image_public_url is null
      and image_prompt is null and image_alt_text is null
      and coalesce(generation_metadata ->> 'manuallyEdited', 'false') = 'false'
    returning id into v_post_id;
    if not found then raise exception 'Draft changed during generation'; end if;
  else
    insert into public.content_posts (
      scheduled_date, run_id, topic_history_id, status, content_type,
      content, scheduled_for, pillar, tone, topic_id, angle, content_fingerprint,
      quality_score, quality_notes, generation_metadata, updated_at
    ) values (
      p_date, v_run.id, v_history_id, 'ready', 'text',
      p_post ->> 'content', (p_post ->> 'scheduled_for')::timestamptz,
      p_post ->> 'pillar', p_post ->> 'tone', (p_post ->> 'topic_id')::uuid,
      p_post ->> 'angle', p_post ->> 'content_fingerprint',
      (p_post ->> 'quality_score')::smallint,
      coalesce(p_post -> 'quality_notes', '{}'::jsonb),
      coalesce(p_post -> 'generation_metadata', '{}'::jsonb), v_now
    ) returning id into v_post_id;
  end if;

  update public.content_topics set last_selected_at = v_now
    where id = (p_history ->> 'topic_id')::uuid;
  update public.automation_runs
    set status = 'completed', current_stage = 'completed', completed_at = v_now,
        lease_id = null, lease_expires_at = null, next_attempt_at = null,
        error_code = null, error_message = null,
        metadata = metadata - 'generation_claim'
    where id = v_run.id;
  return v_post_id;
end;
$$;

create function public.fail_daily_generation(p_date date, p_lease uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz;
begin
  if p_date is null or p_lease is null then return; end if;
  perform pg_advisory_xact_lock(762406, p_date - date '2000-01-01');
  v_now := clock_timestamp();
  -- A stale worker must never release a replacement worker's lease.
  update public.automation_runs
    set status = 'failed', current_stage = 'failed', completed_at = v_now,
        lease_id = null, lease_expires_at = null,
        next_attempt_at = v_now + interval '5 minutes',
        error_code = 'generation_failed', error_message = 'Daily generation failed.',
        metadata = metadata - 'generation_claim'
    where run_date = p_date and lease_id = p_lease;
end;
$$;

revoke all on function public.claim_daily_generation(date, uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_daily_generation(date, uuid, boolean, timestamptz) to service_role;
revoke all on function public.finalize_daily_generation(date, uuid, timestamptz, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.finalize_daily_generation(date, uuid, timestamptz, jsonb, jsonb, boolean) to service_role;
revoke all on function public.fail_daily_generation(date, uuid) from public, anon, authenticated;
grant execute on function public.fail_daily_generation(date, uuid) to service_role;

commit;
