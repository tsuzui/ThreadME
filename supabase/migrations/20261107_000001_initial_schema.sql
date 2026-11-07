-- Migration: 20261107_000001_initial_schema.sql
-- Description: Initial schema for ThreadMe V1.0 (Core tables, enums, RLS, indexes)

create extension if not exists pgcrypto;

-- Enums
create type public.content_status as enum (
  'generating',
  'ready',
  'publishing',
  'published',
  'failed',
  'skipped',
  'publish_unknown'
);

create type public.content_format as enum (
  'text',
  'image'
);

create type public.automation_status as enum (
  'running',
  'completed',
  'partial',
  'failed',
  'skipped'
);

-- Admin Users (Single admin enforcement)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Singleton Application Settings
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  timezone text not null default 'Asia/Jakarta',
  generation_time time not null default '18:40',
  posting_time time not null default '19:00',
  automation_enabled boolean not null default false,
  image_target_ratio numeric(4,3) not null default 0.350
    check (image_target_ratio >= 0 and image_target_ratio <= 1),
  language text not null default 'id',
  persona_prompt text,
  max_generation_retries integer not null default 2
    check (max_generation_retries between 0 and 5),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Social Accounts (Threads OAuth & encrypted token)
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'threads'
    check (platform = 'threads'),
  external_user_id text not null unique,
  username text,
  encrypted_access_token text not null,
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  last_token_refresh_at timestamptz,
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Automation Runs (Daily run record & idempotency)
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,
  idempotency_key text not null unique,
  status public.automation_status not null default 'running',
  current_stage text not null default 'queued',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Topic History (Track topics to prevent repetition)
create table if not exists public.topic_history (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  pillar text not null,
  angle text,
  source_title text,
  source_url text,
  source_note text,
  used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Content Posts (The daily generated and published post)
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.automation_runs(id) on delete set null,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  topic_history_id uuid references public.topic_history(id) on delete set null,
  scheduled_date date not null unique,
  scheduled_for timestamptz not null,
  content text not null,
  content_type public.content_format not null default 'text',
  pillar text not null,
  tone text,
  image_prompt text,
  image_storage_path text,
  image_public_url text,
  image_alt_text text,
  content_fingerprint text not null,
  quality_score smallint check (quality_score between 0 and 100),
  quality_notes jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'generating',
  threads_container_id text,
  threads_media_id text unique,
  threads_permalink text,
  publish_attempts integer not null default 0,
  last_attempt_at timestamptz,
  published_at timestamptz,
  last_error_code text,
  last_error_message text,
  generation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_post_has_asset check (
    content_type <> 'image'
    or image_storage_path is not null
  )
);

-- System Logs (Auditing, errors, stage transitions)
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.automation_runs(id) on delete set null,
  content_post_id uuid references public.content_posts(id) on delete set null,
  level text not null check (level in ('debug', 'info', 'warning', 'error')),
  event text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_content_posts_status_scheduled
  on public.content_posts(status, scheduled_for);

create index if not exists idx_content_posts_published_at
  on public.content_posts(published_at desc);

create index if not exists idx_topic_history_used_at
  on public.topic_history(used_at desc);

create index if not exists idx_automation_runs_started_at
  on public.automation_runs(started_at desc);

create index if not exists idx_system_logs_created_at
  on public.system_logs(created_at desc);

-- Single-admin authorization helper function
create or replace function public.is_threadme_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_threadme_admin() from public;
grant execute on function public.is_threadme_admin() to authenticated;

-- Enable Row Level Security (RLS)
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.social_accounts enable row level security;
alter table public.automation_runs enable row level security;
alter table public.topic_history enable row level security;
alter table public.content_posts enable row level security;
alter table public.system_logs enable row level security;

-- Policies
create policy "admin can read own admin record"
on public.admin_users
for select to authenticated
using (user_id = auth.uid());

create policy "admin access app settings"
on public.app_settings
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

create policy "admin access social accounts"
on public.social_accounts
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

create policy "admin access automation runs"
on public.automation_runs
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

create policy "admin access topic history"
on public.topic_history
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

create policy "admin access content posts"
on public.content_posts
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

create policy "admin access system logs"
on public.system_logs
for all to authenticated
using (public.is_threadme_admin())
with check (public.is_threadme_admin());

-- Initial singleton settings row
insert into public.app_settings (singleton)
values (true)
on conflict (singleton) do nothing;
