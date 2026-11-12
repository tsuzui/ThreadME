begin;

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  posting_time time not null,
  generation_lead_minutes integer not null check (generation_lead_minutes between 1 and 1439),
  enabled boolean not null default true,
  effective_date date not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index recurring_rules_enabled_time on public.recurring_rules(posting_time) where enabled;

create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  recurring_rule_id uuid references public.recurring_rules(id) on delete restrict,
  local_date date not null,
  scheduled_for timestamptz not null,
  generate_after timestamptz not null,
  source text not null check (source in ('routine', 'ad_hoc', 'legacy')),
  lifecycle text not null default 'scheduled' check (lifecycle in ('scheduled', 'cancelled', 'missed', 'completed', 'legacy')),
  revision integer not null default 1 check (revision > 0),
  context text check (char_length(context) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recurring_rule_id, local_date),
  check (generate_after <= scheduled_for)
);

create unique index schedule_slots_active_time on public.schedule_slots(scheduled_for)
  where lifecycle = 'scheduled';
create index schedule_slots_due on public.schedule_slots(lifecycle, scheduled_for);

alter table public.recurring_rules enable row level security;
alter table public.schedule_slots enable row level security;
revoke all on public.recurring_rules, public.schedule_slots from anon, authenticated;
grant select on public.recurring_rules, public.schedule_slots to authenticated;
grant all on public.recurring_rules, public.schedule_slots to service_role;
create policy "admin read recurring rules" on public.recurring_rules
  for select to authenticated using (public.is_threadme_admin());
create policy "admin read schedule slots" on public.schedule_slots
  for select to authenticated using (public.is_threadme_admin());

insert into public.recurring_rules (posting_time, generation_lead_minutes, effective_date)
select posting_time,
  greatest(1, floor(mod(extract(epoch from (posting_time - generation_time)) + 86400, 86400) / 60)::integer),
  (now() at time zone 'Asia/Jakarta')::date
from public.app_settings where singleton;

alter table public.content_posts add column slot_id uuid references public.schedule_slots(id) on delete restrict;
alter table public.automation_runs add column slot_id uuid references public.schedule_slots(id) on delete restrict;

-- Snapshot publication fields so the backfill fails atomically if they change.
create temporary table publication_snapshot on commit drop as
  select id, md5((to_jsonb(p) - 'slot_id')::text) as checksum from public.content_posts p;

insert into public.schedule_slots (id, recurring_rule_id, local_date, scheduled_for, generate_after, source, lifecycle)
select p.id, r.id, p.scheduled_date, p.scheduled_for,
  p.scheduled_for - make_interval(mins => r.generation_lead_minutes),
  'legacy', case when p.status = 'published' then 'completed' else 'scheduled' end
from public.content_posts p cross join public.recurring_rules r;

update public.content_posts set slot_id = id;
update public.automation_runs r set slot_id = p.slot_id
from public.content_posts p where p.run_id = r.id;

insert into public.schedule_slots (id, local_date, scheduled_for, generate_after, source, lifecycle)
select r.id, r.run_date,
  (r.run_date + s.posting_time) at time zone 'Asia/Jakarta',
  (r.run_date + s.generation_time) at time zone 'Asia/Jakarta',
  'legacy', 'legacy'
from public.automation_runs r cross join public.app_settings s
where r.slot_id is null and s.singleton;
update public.automation_runs set slot_id = id where slot_id is null;

create unique index content_posts_slot_unique on public.content_posts(slot_id);
create unique index automation_runs_slot_unique on public.automation_runs(slot_id);

do $$
begin
  if exists (
    select 1 from publication_snapshot s full join public.content_posts p using (id)
    where s.id is null or p.id is null or s.checksum <> md5((to_jsonb(p) - 'slot_id')::text)
  ) then raise exception 'Publication backfill integrity check failed'; end if;
  if exists (select 1 from public.content_posts where slot_id is null)
    or exists (select 1 from public.automation_runs where slot_id is null) then
    raise exception 'Slot backfill incomplete';
  end if;
end;
$$;

-- Date uniqueness and legacy RPCs remain until a coordinated slot-aware cutover.
commit;
