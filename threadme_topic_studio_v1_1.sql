-- ThreadMe V1.1 — Topic Studio
-- Additive migration. Preserve all V1.0 data.

create table if not exists public.content_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  source_type text not null default 'custom'
    check (source_type in ('system', 'custom')),
  is_active boolean not null default true,
  priority smallint not null default 3
    check (priority between 1 and 5),
  last_selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.content_topics
  (name, slug, description, source_type, is_active, priority)
values
  ('Tidak dianggap', 'tidak-dianggap',
   'Feeling overlooked, not prioritized, or present but unnoticed. Balance vulnerability with humor or self-respect.',
   'system', true, 3),
  ('Baru putus cinta', 'baru-putus-cinta',
   'The strange, funny, sad, or freeing moments after a breakup. Avoid revenge fantasies and obsessive behavior.',
   'system', true, 3),
  ('Excited sendirian', 'excited-sendirian',
   'Being enthusiastic while the other person responds with low energy. Use relatable contrast and gentle humor.',
   'system', true, 3),
  ('Overthinking', 'overthinking',
   'Everyday worries, late-night thoughts, uncertainty, and imagining too many possibilities. Keep it relatable, not alarmist.',
   'system', true, 3),
  ('Cinta bertepuk sebelah tangan', 'cinta-bertepuk-sebelah-tangan',
   'One-sided affection, unspoken feelings, waiting, and accepting reality. Vary emotional and humorous angles.',
   'system', true, 3),
  ('Humor kehidupan', 'humor-kehidupan',
   'Work, money, adulting, sleep, errands, family moments, and ordinary absurdities.',
   'system', true, 3),
  ('Kesepian', 'kesepian',
   'Solitude, feeling disconnected, wanting company, and learning to be comfortable alone. Use empathetic language.',
   'system', true, 3),
  ('Random thoughts', 'random-thoughts',
   'Unexpected observations, odd comparisons, small daily mysteries, and spontaneous thoughts.',
   'system', true, 3)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  source_type = 'system',
  updated_at = now();

alter table public.app_settings
  add column if not exists topic_mode text not null default 'mix',
  add column if not exists focus_topic_id uuid,
  add column if not exists topic_rotation_cooldown_days integer not null default 7,
  add column if not exists angle_candidates_count integer not null default 5,
  add column if not exists style_reference_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'app_settings_topic_mode_check'
  ) then
    alter table public.app_settings
      add constraint app_settings_topic_mode_check
      check (topic_mode in ('mix', 'focus', 'schedule'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'app_settings_topic_cooldown_check'
  ) then
    alter table public.app_settings
      add constraint app_settings_topic_cooldown_check
      check (topic_rotation_cooldown_days between 0 and 60);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'app_settings_angle_candidates_check'
  ) then
    alter table public.app_settings
      add constraint app_settings_angle_candidates_check
      check (angle_candidates_count between 3 and 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'app_settings_focus_topic_fk'
  ) then
    alter table public.app_settings
      add constraint app_settings_focus_topic_fk
      foreign key (focus_topic_id)
      references public.content_topics(id)
      on delete set null;
  end if;
end $$;

alter table public.topic_history
  add column if not exists topic_id uuid,
  add column if not exists angle_type text,
  add column if not exists angle_fingerprint text,
  add column if not exists selection_mode text not null default 'mix',
  add column if not exists candidate_angles jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'topic_history_topic_fk'
  ) then
    alter table public.topic_history
      add constraint topic_history_topic_fk
      foreign key (topic_id)
      references public.content_topics(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'topic_history_selection_mode_check'
  ) then
    alter table public.topic_history
      add constraint topic_history_selection_mode_check
      check (selection_mode in ('mix', 'focus', 'schedule'));
  end if;
end $$;

alter table public.content_posts
  add column if not exists topic_id uuid,
  add column if not exists angle text,
  add column if not exists style_reference_snapshot jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_posts_topic_fk'
  ) then
    alter table public.content_posts
      add constraint content_posts_topic_fk
      foreign key (topic_id)
      references public.content_topics(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.style_references (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sample_text text not null,
  source_label text,
  source_url text,
  analysis_status text not null default 'pending'
    check (analysis_status in ('pending', 'analyzed', 'failed')),
  style_traits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_topics_active_priority
  on public.content_topics(is_active, priority desc);

create index if not exists idx_topic_history_topic_used
  on public.topic_history(topic_id, used_at desc);

create index if not exists idx_topic_history_angle_fingerprint
  on public.topic_history(angle_fingerprint);

create index if not exists idx_content_posts_topic_date
  on public.content_posts(topic_id, scheduled_date desc);

create index if not exists idx_style_references_active
  on public.style_references(is_active, created_at desc);

alter table public.content_topics enable row level security;
alter table public.style_references enable row level security;

drop policy if exists "admin access content topics"
  on public.content_topics;
create policy "admin access content topics"
on public.content_topics
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

drop policy if exists "admin access style references"
  on public.style_references;
create policy "admin access style references"
on public.style_references
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

update public.app_settings
set topic_mode = 'mix',
    topic_rotation_cooldown_days = 7,
    angle_candidates_count = 5,
    style_reference_enabled = true,
    updated_at = now()
where singleton = true;
