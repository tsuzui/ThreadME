begin;

alter table public.automation_runs drop constraint if exists automation_runs_run_date_key;

create function public.materialize_routine_slots()
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.schedule_slots (recurring_rule_id, local_date, scheduled_for, generate_after, source)
  select id, (now() at time zone 'Asia/Jakarta')::date,
    ((now() at time zone 'Asia/Jakarta')::date + posting_time) at time zone 'Asia/Jakarta',
    (((now() at time zone 'Asia/Jakarta')::date + posting_time) at time zone 'Asia/Jakarta') - make_interval(mins => generation_lead_minutes), 'routine'
  from public.recurring_rules r where enabled and effective_date <= (now() at time zone 'Asia/Jakarta')::date
    and not exists (select 1 from public.schedule_slots s where s.scheduled_for = (((now() at time zone 'Asia/Jakarta')::date + r.posting_time) at time zone 'Asia/Jakarta') and s.lifecycle = 'scheduled')
  on conflict do nothing;
$$;

create function public.claim_slot_generation(p_date date, p_slot_id uuid, p_lease uuid, p_manual boolean, p_version timestamptz default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.schedule_slots%rowtype; r public.automation_runs%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_slot_id::text, 762406));
  select * into s from public.schedule_slots where id = p_slot_id and local_date = p_date and lifecycle = 'scheduled' for update;
  if not found or s.generate_after > now() or s.scheduled_for < now() - interval '1 day' then return false; end if;
  if not exists (select 1 from public.app_settings where singleton and automation_enabled) then return false; end if;
  if exists (select 1 from public.content_posts where slot_id = p_slot_id) then return false; end if;
  insert into public.automation_runs (run_date, slot_id, idempotency_key) values (p_date, p_slot_id, 'slot-generation:' || p_slot_id) on conflict (slot_id) do nothing;
  select * into r from public.automation_runs where slot_id = p_slot_id for update;
  if r.lease_expires_at > now() or r.attempts >= 3 or r.next_attempt_at > now() then return false; end if;
  update public.automation_runs set lease_id = p_lease, lease_expires_at = now() + interval '3 minutes', attempts = attempts + 1,
    status = 'running', current_stage = 'generating', started_at = now(), completed_at = null, next_attempt_at = null where id = r.id;
  return true;
end;
$$;

create function public.finalize_slot_generation(p_date date, p_slot_id uuid, p_lease uuid, p_version timestamptz, p_post jsonb, p_history jsonb, p_manual boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.schedule_slots%rowtype; r public.automation_runs%rowtype; result uuid; history_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_slot_id::text, 762406));
  select * into s from public.schedule_slots where id = p_slot_id and local_date = p_date and lifecycle = 'scheduled' for update;
  if not found then raise exception 'Schedule changed'; end if;
  select * into r from public.automation_runs where slot_id = p_slot_id for update;
  if not found or r.lease_id is distinct from p_lease or r.lease_expires_at <= clock_timestamp() or r.lease_expires_at is null
    or not exists (select 1 from public.app_settings where singleton and automation_enabled) then raise exception 'Generation lease expired'; end if;
  insert into public.topic_history (topic_id, topic, pillar, angle, angle_type, angle_fingerprint, selection_mode, candidate_angles)
    values ((p_history->>'topic_id')::uuid, p_history->>'topic', p_history->>'pillar', p_history->>'angle', p_history->>'angle_type', p_history->>'angle_fingerprint', 'mix', p_history->'candidate_angles') returning id into history_id;
  insert into public.content_posts (slot_id, run_id, topic_history_id, scheduled_date, scheduled_for, content, content_type, pillar, tone, topic_id, angle, content_fingerprint, quality_score, quality_notes, generation_metadata, context, status)
    values (s.id, r.id, history_id, s.local_date, s.scheduled_for, p_post->>'content', 'text', p_post->>'pillar', p_post->>'tone', (p_post->>'topic_id')::uuid, p_post->>'angle', p_post->>'content_fingerprint', (p_post->>'quality_score')::smallint, p_post->'quality_notes', p_post->'generation_metadata', s.context, 'ready') returning id into result;
  update public.content_topics set last_selected_at = now() where id = (p_history->>'topic_id')::uuid;
  update public.automation_runs set status = 'completed', current_stage = 'completed', completed_at = now(), lease_id = null, lease_expires_at = null, error_code = null, error_message = null where id = r.id;
  return result;
end;
$$;

create function public.fail_slot_generation(p_date date, p_slot_id uuid, p_lease uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  update public.automation_runs set status = 'failed', current_stage = 'failed', completed_at = now(), lease_id = null, lease_expires_at = null, next_attempt_at = now() + interval '5 minutes', error_code = 'generation_failed', error_message = 'Slot generation failed.' where slot_id = p_slot_id and lease_id = p_lease and run_date = p_date;
$$;

create or replace function public.claim_scheduled_threads_post(p_id uuid, p_version timestamptz, p_account_id uuid, p_account_version timestamptz)
returns setof public.content_posts language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(762401);
  perform 1 from public.app_settings where singleton and automation_enabled for share;
  if not found then return; end if;
  perform 1 from public.content_posts where id = p_id and scheduled_for <= clock_timestamp() and publish_attempts < 10 for update;
  if not found then return; end if;
  return query select * from public.claim_threads_post(p_id, p_version, p_account_id, p_account_version);
end;
$$;

revoke all on function public.materialize_routine_slots(), public.claim_slot_generation(date, uuid, uuid, boolean, timestamptz), public.finalize_slot_generation(date, uuid, uuid, timestamptz, jsonb, jsonb, boolean), public.fail_slot_generation(date, uuid, uuid) from public, anon, authenticated;
grant execute on function public.materialize_routine_slots(), public.claim_slot_generation(date, uuid, uuid, boolean, timestamptz), public.finalize_slot_generation(date, uuid, uuid, timestamptz, jsonb, jsonb, boolean), public.fail_slot_generation(date, uuid, uuid) to service_role;

commit;
