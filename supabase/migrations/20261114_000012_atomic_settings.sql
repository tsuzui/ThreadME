begin;

-- No data defaults are rewritten here; migration 011 owns the morning cutover.
create function public.update_threadme_settings(
  p_generation_time time, p_posting_time time, p_enabled boolean,
  p_cooldown integer, p_retries integer, p_persona text
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  settings public.app_settings%rowtype;
  rule_id uuid;
  v_slot_id uuid;
  today date := (now() at time zone 'Asia/Jakarta')::date;
  publication timestamptz;
  lead integer;
  outcome text := 'no_slot';
begin
  if not public.is_threadme_admin() then raise exception 'Akses admin diperlukan' using errcode = '42501'; end if;
  if p_generation_time is null or p_posting_time is null or p_enabled is null
    or p_cooldown is null or p_cooldown not between 1 and 30
    or p_retries is null or p_retries not between 0 and 5
    or extract(second from p_generation_time) <> 0 or extract(second from p_posting_time) <> 0
    or p_generation_time >= p_posting_time then
    raise exception 'Generasi harus sebelum publikasi di hari yang sama; periksa rentang parameter';
  end if;
  lead := extract(epoch from (p_posting_time - p_generation_time))::integer / 60;
  if lead not between 1 and 1439 then raise exception 'Lead harus 1–1439 menit'; end if;
  select * into strict settings from public.app_settings where singleton for update;
  -- Match the OLD primary time, never upsert against the enabled partial index.
  select id into strict rule_id from public.recurring_rules
    where posting_time = settings.posting_time for update;
  publication := (today + p_posting_time) at time zone 'Asia/Jakarta';
  select id into v_slot_id from public.schedule_slots
    where recurring_rule_id = rule_id and local_date = today and source = 'routine';
  if v_slot_id is not null then
    -- Exactly the same lock key as claim_slot_generation/finalize_slot_generation.
    perform pg_advisory_xact_lock(hashtextextended(v_slot_id::text, 762406));
    perform 1 from public.schedule_slots where id = v_slot_id for update;
    if publication > now() and exists (
      select 1 from public.schedule_slots where id = v_slot_id and lifecycle = 'scheduled' and scheduled_for > now()
    ) and not exists (select 1 from public.content_posts where slot_id = v_slot_id)
      and not exists (select 1 from public.automation_runs where slot_id = v_slot_id) then
      update public.schedule_slots set scheduled_for = publication,
        generate_after = (today + p_generation_time) at time zone 'Asia/Jakarta',
        revision = revision + 1, updated_at = now() where id = v_slot_id;
      outcome := 'updated';
    else
      outcome := 'protected';
    end if;
  end if;
  update public.recurring_rules set posting_time = p_posting_time,
    generation_lead_minutes = lead, revision = revision + 1, updated_at = now()
    where id = rule_id;
  -- Pause is global. Individual rule enablement is never changed here.
  update public.app_settings set generation_time = p_generation_time, posting_time = p_posting_time,
    automation_enabled = p_enabled, topic_rotation_cooldown_days = p_cooldown,
    max_generation_retries = p_retries, persona_prompt = nullif(trim(p_persona), ''),
    image_target_ratio = 0, updated_at = now() where singleton;
  return outcome;
end;
$$;

create function public.manage_threadme_recurring_rule(
  p_operation text, p_id uuid default null, p_time time default null,
  p_lead integer default null, p_enabled boolean default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare primary_time time; selected_time time;
begin
  if not public.is_threadme_admin() then raise exception 'Akses admin diperlukan' using errcode = '42501'; end if;
  select posting_time into strict primary_time from public.app_settings where singleton for update;
  if p_operation = 'add' then
    if p_time is null or extract(second from p_time) <> 0 or p_time = primary_time
      or p_lead is null or p_lead not between 1 and 1439
      or p_lead > extract(epoch from p_time)::integer / 60 then
      raise exception 'Jadwal tambahan harus berbeda; generasi sebelum publikasi di hari yang sama (1–1439 menit)';
    end if;
    insert into public.recurring_rules (posting_time, generation_lead_minutes, effective_date)
      values (p_time, p_lead, (now() at time zone 'Asia/Jakarta')::date);
  elsif p_operation in ('toggle', 'delete') then
    select posting_time into strict selected_time from public.recurring_rules where id = p_id for update;
    if selected_time = primary_time then raise exception 'Ubah jadwal utama melalui pengaturan utama'; end if;
    if p_operation = 'toggle' then
      if p_enabled is null then raise exception 'Status wajib diisi'; end if;
      update public.recurring_rules set enabled = p_enabled, revision = revision + 1, updated_at = now() where id = p_id;
    else
      delete from public.recurring_rules where id = p_id;
    end if;
  else raise exception 'Operasi tidak valid';
  end if;
end;
$$;

revoke all on function public.update_threadme_settings(time, time, boolean, integer, integer, text), public.manage_threadme_recurring_rule(text, uuid, time, integer, boolean) from public, anon;
grant execute on function public.update_threadme_settings(time, time, boolean, integer, integer, text), public.manage_threadme_recurring_rule(text, uuid, time, integer, boolean) to authenticated;
commit;
