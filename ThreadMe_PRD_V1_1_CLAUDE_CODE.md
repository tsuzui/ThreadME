# ThreadMe --- PRD, Architecture, Database Schema & Claude Code Master Prompt

**Document version:** 1.1\
**Date:** 7 November 2026\
**Product type:** Personal web application\
**Primary channel:** Threads\
**Timezone:** Asia/Jakarta (WIB)\
**Publishing target:** 1 post per day at 19:00 WIB\
**Operating mode:** Fully automated, no per-post approval

------------------------------------------------------------------------

# 1. Executive Summary

ThreadMe is a personal AI content engine that creates and publishes one
natural-sounding Indonesian Threads post every day. It researches a
relevant daily angle, selects a content pillar, writes a post in the
ThreadMe voice, decides whether an image is genuinely useful, optionally
generates an original meme-style visual, and publishes the result to the
owner's Threads account.

The application is a private tool for one owner. It is not a public SaaS
product in v1.

## Product principles

1.  **Human-feeling writing:** conversational Indonesian, not generic AI
    quotes.
2.  **Variety:** rotate topics, structures, emotional tones, and
    punchlines.
3.  **Image is optional:** do not force a visual on every post.
4.  **One post per local calendar day:** prevent duplicate daily posts.
5.  **Autonomous operation:** the server runs even when the owner's
    computer is off.
6.  **Safe publishing:** use Meta's official Threads API, never browser
    automation or stored social passwords.
7.  **Observable automation:** every run, stage, error, and publication
    result is recorded.
8.  **Cost-aware:** use text-only posts by default when an image adds
    little value.

# 2. Product Requirements Document

## 2.1 Problem statement

The owner wants a consistently active Threads account but does not want
to manually find ideas, write captions, create images, or publish every
day. Generic AI content can sound repetitive, overly polished, or
obviously machine-written. Images also should not be mandatory.

## 2.2 Product goal

Automatically publish one relevant, varied, natural Indonesian post to
the connected Threads account every day, targeting 19:00 WIB.

## 2.3 Success metrics

-   At least 95% of scheduled daily runs complete successfully over a
    rolling 30-day period, excluding Meta/API outages and
    expired/revoked authorization.
-   No more than one successful post per local calendar day.
-   100% of successful posts are recorded with their Threads media ID
    and publication timestamp.
-   No duplicate post caused by an automatic retry.
-   Image generation is used selectively, with a starting target of
    approximately 30--40% of posts, not a hard requirement.
-   Every failed or skipped run has a readable reason in the dashboard.

## 2.4 Target user

One administrator: the owner of ThreadMe.

## 2.5 Out of scope for v1

-   Public registration or multi-user accounts.
-   Billing, subscription, or SaaS tenancy.
-   Other social platforms.
-   Auto-replies, auto-comments, follow/unfollow, or engagement bots.
-   Video generation.
-   Carousel generation.
-   Automatic reposting of third-party memes.
-   Complex analytics or competitor monitoring.
-   Mobile native application.

## 2.6 Content identity

**Account name:** ThreadMe\
**Suggested description:** Tempat pikiran random, perasaan campur aduk,
dan humor kehidupan sehari-hari.\
**Suggested tagline:** Sedikit galau, banyak bercanda.

### Voice and personality

ThreadMe sounds like a young Indonesian adult who notices ordinary life
and makes short, relatable observations. The voice can be funny,
slightly dramatic, reflective, mildly sarcastic, or unexpectedly poetic.

It should not sound like: - A motivational speaker. - A corporate
brand. - A formal news account. - A generic quote generator. - A model
that always ends with a question. - A model that uses the same hook and
sentence rhythm every day.

### Content pillars and initial target distribution

  Pillar                Initial target
  ------------------- ----------------
  Galau tapi lucu                  20%
  Realita kehidupan                20%
  Random thoughts                  20%
  Humor dan meme                   15%
  Puisi pendek                     10%
  Sindiran halus                   10%
  Topik aktual                      5%

These percentages guide variety; they are not rigid quotas. The system
should use recent post history to avoid repetitive themes.

### Format distribution

-   Approximately 65% text-only.
-   Approximately 35% text plus original image.
-   The AI may choose text-only whenever the writing is stronger without
    an image.
-   Never add an image only to satisfy a quota.
-   Default to no hashtags. Use one only when it is genuinely useful.
-   Emojis are optional and should be sparse.

## 2.7 Functional requirements

  -----------------------------------------------------------------------
  ID                Feature           Requirement       Priority
  ----------------- ----------------- ----------------- -----------------
  FR-01             Admin dashboard   Show automation   P0
                                      status, next run, 
                                      last run, and     
                                      latest post       

  FR-02             Threads           Connect one       P0
                    connection        Threads account   
                                      using official    
                                      OAuth             

  FR-03             Token management  Store tokens      P0
                                      securely and      
                                      refresh before    
                                      expiry            

  FR-04             Daily topic       Gather a relevant P0
                    research          current or        
                                      evergreen angle   

  FR-05             Content           Generate one post P0
                    generation        in the ThreadMe   
                                      voice             

  FR-06             Anti-repetition   Compare against   P0
                                      previous posts    
                                      and recent topics 

  FR-07             Quality checks    Validate length,  P0
                                      tone, relevance,  
                                      safety, and       
                                      originality       

  FR-08             Format selection  Decide text-only  P0
                                      or text plus      
                                      image             

  FR-09             Image generation  Generate an       P0
                                      original          
                                      meme-style image  
                                      when selected     

  FR-10             Asset storage     Store generated   P0
                                      image and provide 
                                      a Meta-fetchable  
                                      URL               

  FR-11             Scheduler         Prepare daily     P0
                                      content and       
                                      publish at 19:00  
                                      WIB               

  FR-12             Auto publishing   Publish text or   P0
                                      image through     
                                      Threads API       

  FR-13             Idempotency       Prevent duplicate P0
                                      runs and          
                                      duplicate daily   
                                      posts             

  FR-14             Retry and         Retry transient   P0
                    recovery          failures safely   

  FR-15             Run history       Show generation   P0
                                      and publishing    
                                      history           

  FR-16             System logs       Record errors and P0
                                      stage transitions 

  FR-17             Settings          Edit schedule,    P0
                                      persona, image    
                                      preference, and   
                                      automation toggle 

  FR-18             Manual test       Generate a        P1
                    generation        preview without   
                                      publishing        

  FR-19             Content calendar  Browse posts by   P1
                                      date              

  FR-20             Analytics         Retrieve          P1
                                      supported post    
                                      insights          
  -----------------------------------------------------------------------

## 2.8 User stories

1.  As the owner, I can connect my Threads account once and let the app
    manage authorization.
2.  As the owner, I can see whether daily automation is active.
3.  As the owner, I want the app to create one post for each local date.
4.  As the owner, I want the AI to decide whether a meme improves the
    post.
5.  As the owner, I want the app to avoid repeating recent topics or
    wording.
6.  As the owner, I want to know if publishing failed and why.
7.  As the owner, I want to pause automation without deleting my
    settings.
8.  As the owner, I want a manual preview/test mode that never publishes
    accidentally.

# 3. Technical Architecture

## 3.1 Recommended stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Web app                 Next.js App Router +    Private admin dashboard
                          TypeScript              and OAuth callback

  UI                      Tailwind CSS +          Dashboard components
                          shadcn/ui               

  Database                Supabase PostgreSQL     Settings, posts, runs,
                                                  logs, account metadata

  Authentication          Supabase Auth           Single-admin access

  File storage            Supabase Storage        Generated image assets

  Background jobs         Supabase Edge Functions Generation, publishing,
                                                  token refresh

  Scheduler               Supabase Cron           Trigger background
                          (`pg_cron` + `pg_net`)  functions

  Text model              Anthropic Claude API    Research synthesis and
                          (configurable provider) writing

  Image model             OpenAI Images API       Original meme-style
                          (configurable model)    visuals

  Social publishing       Meta Threads API        Official Threads
                                                  publishing

  Hosting                 Vercel + Supabase       Web hosting and managed
                                                  backend
  -----------------------------------------------------------------------

Claude Code is the development assistant, not the runtime engine. A
deployed application must use provider API credentials for text/image
generation. Claude Code subscription access does not automatically
provide Anthropic API credits.

## 3.2 High-level architecture

``` mermaid
flowchart TD
    A["Supabase Cron<br/>18:40 WIB"] --> B["Daily Content Worker"]
    B --> C["Topic Research Provider"]
    B --> D["Text AI Provider"]
    C --> D
    D --> E["Quality Control + Anti-Repetition"]
    E --> F{"Image adds value?"}
    F -->|No| G["Text-only content"]
    F -->|Yes| H["Image Generation API"]
    H --> I["Supabase Storage"]
    I --> J["Image content"]
    G --> K["Content Database"]
    J --> K
    L["Publish Cron<br/>19:00 WIB"] --> M["Publisher Worker"]
    K --> M
    M --> N["Threads API"]
    N --> O["Save media ID, URL, status"]
    O --> P["Dashboard + Logs"]
```

## 3.3 Scheduling

Use `Asia/Jakarta` as the application timezone.

Recommended jobs: - **18:40 WIB (11:40 UTC):** generate and prepare the
daily post. - **19:00 WIB (12:00 UTC):** publish the prepared post. -
**19:15, 19:30, 19:45 WIB:** bounded retries for eligible transient
failures. - **Daily token check:** refresh a long-lived token before
expiry, only when eligible.

Store all timestamps as `timestamptz` in UTC. Store `scheduled_date` as
the local Asia/Jakarta date so the one-post-per-day constraint is
unambiguous.

The worker must not rely on the browser being open or the owner's
computer being online.

## 3.4 Daily generation workflow

1.  Acquire a database lock or insert a unique `automation_runs` record
    for the local date.
2.  Confirm automation is enabled and the Threads account is connected.
3.  Load recent posts and topic history.
4.  Gather daily context:
    -   Current date and day of week.
    -   Seasonal or calendar context.
    -   Optional current events/trends from a search provider.
    -   Evergreen everyday-life observations as fallback.
5.  Select one content pillar and one angle.
6.  Generate a small set of candidate ideas internally, then select the
    strongest.
7.  Write one final Threads post.
8.  Run quality and anti-repetition checks.
9.  Decide whether an image genuinely improves the post.
10. If an image is selected, generate an original visual and upload it
    to Supabase Storage.
11. Save the post with status `ready` and a target time of 19:00 WIB.
12. Record all stage outcomes in `system_logs`.

## 3.5 Publishing workflow

1.  At 19:00 WIB, claim the ready post using a database
    transaction/lock.
2.  Verify that no post is already published for that local date.
3.  Verify Threads authorization is valid.
4.  For a text post, create a text media container.
5.  For an image post, create an image media container using a public
    HTTPS `image_url` and alt text.
6.  Publish the returned container ID through the Threads publish
    endpoint.
7.  Save the returned Threads media ID, permalink when available, and
    publication timestamp.
8.  Mark the post as `published`.
9.  If a network timeout occurs after the publish request, mark the
    result `publish_unknown` and reconcile before retrying. Never
    blindly retry an ambiguous publish request.

## 3.6 Threads API integration

Use Meta's official Threads API and OAuth flow. Do not automate the
Threads website with a browser and do not store the account password.

Required implementation capabilities: - Create a Meta developer app with
the Threads use case. - Configure the OAuth redirect URI. - Request the
minimum scopes needed for account identity and publishing, including
`threads_basic` and `threads_content_publish`. - Exchange the
authorization code for a user token. - Exchange for a long-lived token
where applicable. - Store the token encrypted server-side. - Refresh the
long-lived token before it expires. - Retrieve and store the Threads
user ID. - Support text and image publishing.

Publishing is a two-step process: 1. `POST /{threads-user-id}/threads`
creates a media container. 2. `POST /{threads-user-id}/threads_publish`
publishes the container using `creation_id`.

For image posts, Meta must be able to fetch the image from a publicly
accessible HTTPS URL. Do not use a local filesystem path or a private
URL requiring authentication.

Keep the Graph API version configurable and verify the current version,
OAuth parameters, scopes, and app-review requirements against Meta's
current documentation during implementation. Do not assume that a test
app/token is production-ready.

## 3.7 Image generation

Use an image-provider adapter so the provider can be changed without
rewriting the workflow.

Initial behavior: - Generate one image only when the content benefits
from a visual. - Prefer original reaction-meme scenes, expressive
everyday situations, simple comic illustrations, or cinematic relatable
scenes. - Do not copy a copyrighted meme image or reproduce a protected
character. - Avoid relying on text embedded in the generated image; put
the joke in the Threads caption. - Generate an appropriate square image
(initial target 1024 × 1024). - Decode the image API response and upload
the binary to Supabase Storage. - Save the storage path, public URL, and
descriptive alt text. - If image generation or upload fails, safely fall
back to text-only if the caption still works.

## 3.8 Topic research

Create a `TopicResearchProvider` interface. The first implementation may
use a web-search API provider, configured through environment variables.
Do not bind the system permanently to one vendor.

Research rules: - Prefer reliable sources for factual current events. -
Use current events only when relevant to a casual lifestyle account. -
Do not turn tragedies, disasters, or sensitive events into jokes. - Do
not invent news, statistics, quotes, or public-figure claims. - If
research fails, use an evergreen everyday-life idea. - Save source
title, URL, and a short note for traceability. - Do not reproduce source
articles or other people's posts.

## 3.9 Quality control and anti-repetition

Before a post becomes `ready`, check: - Natural Indonesian phrasing. -
Clear and relatable idea. - No generic motivational filler. - No
repetitive opening or closing. - No forced question at the end. - No
unnecessary hashtags or emojis. - No unsupported factual claims. - No
targeted harassment, private information, or defamatory claims. -
Similarity against recent posts and topic history.

Use a configurable lookback window (initially 30--60 posts). A
similarity check should consider both normalized text matching and
semantic similarity if embeddings are enabled. A high similarity score
should trigger regeneration, not automatic publication.

If quality checks fail, regenerate up to two times. If the final attempt
still fails, use a safe evergreen fallback prompt. If all generation
attempts fail, record a failed run rather than publish low-quality or
duplicated content.

## 3.10 Retry and duplicate protection

Use: - Unique `automation_runs.run_date`. - Unique
`content_posts.scheduled_date`. - A database claim/lock before
generation and before publishing. - Explicit state transitions. -
Bounded retries for transient errors. - No automatic retry for invalid
permissions, revoked authorization, or ambiguous publish outcomes until
reconciled.

Suggested states: - `generating` - `ready` - `publishing` -
`published` - `failed` - `skipped` - `publish_unknown`

Important: exactly-once delivery cannot be guaranteed solely by a client
retry when the external publishing API does not provide an idempotency
key. Reconcile uncertain outcomes against recent account posts before
attempting another publish.

# 4. Database Schema (Supabase SQL)

The following is the initial schema. Claude Code should put it in a
versioned Supabase migration and adjust it only when the implementation
requires a documented change.

``` sql
create extension if not exists pgcrypto;

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

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.app_settings (
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

create table public.social_accounts (
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

create table public.automation_runs (
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

create table public.topic_history (
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

create table public.content_posts (
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

create table public.system_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.automation_runs(id) on delete set null,
  content_post_id uuid references public.content_posts(id) on delete set null,
  level text not null check (level in ('debug', 'info', 'warning', 'error')),
  event text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_content_posts_status_scheduled
  on public.content_posts(status, scheduled_for);

create index idx_content_posts_published_at
  on public.content_posts(published_at desc);

create index idx_topic_history_used_at
  on public.topic_history(used_at desc);

create index idx_automation_runs_started_at
  on public.automation_runs(started_at desc);

create index idx_system_logs_created_at
  on public.system_logs(created_at desc);

-- Single-admin authorization helper.
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

-- Enable Row Level Security.
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.social_accounts enable row level security;
alter table public.automation_runs enable row level security;
alter table public.topic_history enable row level security;
alter table public.content_posts enable row level security;
alter table public.system_logs enable row level security;

-- Admin can read their own admin record.
create policy "admin can read own admin record"
on public.admin_users
for select to authenticated
using (user_id = auth.uid());

-- Only the configured admin can access application data.
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

-- Create the initial singleton settings row.
insert into public.app_settings (singleton)
values (true)
on conflict (singleton) do nothing;
```

## 4.1 Database security notes

-   Never expose the Supabase service-role key in browser code.
-   Never expose a Threads access token or Meta app secret to the
    frontend.
-   `encrypted_access_token` must contain an application-encrypted
    token, not plaintext. Keep the encryption key in server-side
    secrets.
-   Consider Supabase Vault for server-side secrets where appropriate.
-   Do not log OAuth codes, access tokens, app secrets, or encryption
    keys.
-   The initial admin user must be inserted by a trusted server/database
    administrator after Supabase Auth is configured.
-   Create a private storage bucket for internal drafts if needed. For
    image publishing, use a separate public bucket containing only
    generated, non-sensitive post assets.
-   Add storage policies so only the admin/server can upload or delete
    assets.

# 5. Backend Modules and API Contracts

## 5.1 Suggested project structure

``` text
threadme/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── posts/
│   │   ├── calendar/
│   │   ├── settings/
│   │   └── logs/
│   ├── auth/
│   │   └── callback/
│   └── api/
│       ├── threads/
│       │   ├── connect/
│       │   └── callback/
│       └── health/
├── components/
├── lib/
│   ├── ai/
│   │   ├── text-provider.ts
│   │   ├── image-provider.ts
│   │   └── prompts/
│   ├── research/
│   │   └── topic-provider.ts
│   ├── threads/
│   │   ├── oauth.ts
│   │   ├── client.ts
│   │   ├── publisher.ts
│   │   └── token-manager.ts
│   ├── automation/
│   │   ├── generate-daily.ts
│   │   ├── publish-due.ts
│   │   ├── quality-check.ts
│   │   └── idempotency.ts
│   ├── supabase/
│   └── security/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── daily-content-worker/
│   │   ├── publish-due-posts/
│   │   └── refresh-threads-token/
│   └── config.toml
├── tests/
├── docs/
├── .env.example
├── CLAUDE.md
└── README.md
```

## 5.2 Suggested endpoints

  Method   Endpoint                        Purpose
  -------- ------------------------------- -----------------------------
  GET      `/api/health`                   Health check
  GET      `/api/threads/connect`          Start Threads OAuth
  GET      `/api/threads/callback`         Handle OAuth callback
  GET      `/api/dashboard/summary`        Dashboard metrics
  GET      `/api/posts`                    List posts
  GET      `/api/posts/:id`                Post detail
  POST     `/api/posts/generate-preview`   Generate without publishing
  PATCH    `/api/settings`                 Update settings
  POST     `/api/automation/pause`         Pause automation
  POST     `/api/automation/resume`        Resume automation

Background functions (not public dashboard endpoints): -
`daily-content-worker` - `publish-due-posts` - `refresh-threads-token`

Protect worker endpoints with a server-side secret and reject
unauthenticated calls.

# 6. AI Prompt Specification

## 6.1 System persona prompt

Use this as the starting persona. Store it in
`app_settings.persona_prompt` or a versioned prompt file.

``` text
Kamu adalah penulis konten akun Threads bernama ThreadMe.

Karakter:
- Anak muda Indonesia yang mengamati kehidupan sehari-hari.
- Santai, spontan, kadang receh, kadang galau, kadang sedikit puitis.
- Tidak selalu ingin terlihat bijak.
- Bisa menyampaikan keresahan dengan humor yang ringan.
- Menulis seperti orang sungguhan yang punya selera humor dan sudut pandang.

Gaya bahasa:
- Bahasa Indonesia sehari-hari yang natural.
- Kalimat pendek dan enak dibaca.
- Boleh memakai slang Indonesia secara wajar, jangan dipaksakan.
- Variasikan panjang, ritme, dan struktur kalimat.
- Gunakan punchline jika memang cocok.
- Jangan selalu memakai pertanyaan sebagai penutup.
- Jangan selalu menggunakan kata "kadang", "ternyata", atau "hidup".
- Emoji dan hashtag tidak wajib.

Hindari:
- Kalimat motivasi generik.
- Gaya formal, korporat, atau seperti artikel.
- Puisi yang terlalu dibuat-buat.
- Pola hook yang sama setiap hari.
- Penjelasan panjang untuk satu ide sederhana.
- Mengaku mengalami kejadian pribadi yang tidak benar-benar dialami.
- Menyalin postingan orang lain.
- Berita atau klaim faktual yang tidak terverifikasi.

Tujuan:
Buat pembaca merasa "ini gue banget", tersenyum, tertawa kecil, atau ingin membalas karena relate.

Satu hari hanya menghasilkan satu posting final.
Prioritaskan kualitas dan kealamian, bukan sekadar mengejar kuantitas.
```

## 6.2 Structured content output

The text model should return valid JSON matching a schema similar to:

``` json
{
  "pillar": "realita_kehidupan",
  "topic": "niat tidur cepat tetapi scrolling",
  "angle": "self-deprecating humor",
  "content": "Niatnya tidur cepat. Tapi jempol punya agenda sendiri sampai jam satu.",
  "format": "text",
  "image_prompt": null,
  "image_alt_text": null,
  "source_title": null,
  "source_url": null,
  "quality_notes": {
    "naturalness": 90,
    "originality": 92,
    "relevance": 88,
    "reason": "Short, relatable, conversational."
  }
}
```

For image posts, `format` becomes `image` and `image_prompt` plus
`image_alt_text` must be populated.

## 6.3 Daily generation instruction

``` text
Buat satu posting Threads untuk ThreadMe yang dijadwalkan pukul 19.00 WIB hari ini.

Pertimbangkan:
1. Tanggal dan suasana hari ini.
2. Topik aktual yang benar-benar relevan, jika ada.
3. Riwayat posting terbaru.
4. Pilar konten yang belum terlalu sering digunakan.
5. Gaya ThreadMe yang santai, natural, dan tidak terasa seperti AI.

Pilih satu ide paling kuat. Jangan menampilkan daftar ide ke pengguna.

Tentukan apakah posting lebih kuat sebagai:
- text-only; atau
- text + original meme-style image.

Jangan membuat gambar jika caption sudah kuat tanpa visual.
Jika memakai gambar, buat prompt visual yang spesifik, lucu/relatable, dan tidak menyalin meme berhak cipta.
Jangan menaruh teks panjang di dalam gambar.

Kembalikan hanya JSON yang sesuai schema.
Jangan mengarang fakta atau tren. Jika riset aktual tidak tersedia, gunakan tema evergreen.
```

# 7. Environment Variables

Create `.env.example` with placeholders only:

``` env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_TIMEZONE=Asia/Jakarta
ADMIN_EMAIL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Text AI
TEXT_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# Image AI
IMAGE_AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=

# Optional topic research
TOPIC_SEARCH_PROVIDER=
TOPIC_SEARCH_API_KEY=

# Meta / Threads
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_REDIRECT_URI=
THREADS_API_VERSION=
THREADS_USER_ID=

# Token encryption
TOKEN_ENCRYPTION_KEY=

# Worker security
CRON_SECRET=
```

Never commit a real `.env` file. Add `.env*` to `.gitignore` while
allowing `.env.example`.

# 8. Error Handling

  ---------------------------------------------------------------------
  Failure                            Expected behavior
  ---------------------------------- ----------------------------------
  Topic search unavailable           Use evergreen topic

  Text AI timeout                    Retry within configured limit

  Text AI returns invalid JSON       Retry with schema correction

  Similarity too high                Regenerate with a different angle

  Image API fails                    Fall back to text-only

  Storage upload fails               Fall back to text-only

  Threads token expired              Refresh if eligible; otherwise
                                     pause publishing and log

  Missing publishing permission      Mark failed; do not loop retries

  Meta rate limit                    Respect retry guidance and back
                                     off

  Network timeout during publish     Mark `publish_unknown`, reconcile
                                     before retry

  Cron fires twice                   Unique run date and idempotency
                                     lock prevent duplicate work

  Worker crashes                     Persist stage and resume safely
  ---------------------------------------------------------------------

# 9. Acceptance Criteria

## 9.1 Core functionality

-   [ ] Admin can sign in.
-   [ ] Only the configured admin can access the dashboard.
-   [ ] Threads account can be connected using OAuth.
-   [ ] Threads username and connection status are visible.
-   [ ] Access token is never returned to the browser.
-   [ ] One daily automation run is created per Asia/Jakarta date.
-   [ ] One post is generated for the target date.
-   [ ] Text-only output is supported.
-   [ ] Image output is optional.
-   [ ] Image posts use a publicly accessible HTTPS URL.
-   [ ] Generated image is stored in Supabase Storage.
-   [ ] Content is checked against recent posts.
-   [ ] Post status and error details are recorded.
-   [ ] The system can be paused and resumed.

## 9.2 Publishing

-   [ ] Text container can be created.
-   [ ] Image container can be created.
-   [ ] Container can be published.
-   [ ] Returned Threads media ID is saved.
-   [ ] Publication timestamp is saved.
-   [ ] Retry does not create duplicate posts.
-   [ ] Ambiguous publish outcomes are reconciled before retry.
-   [ ] The daily schedule targets 19:00 Asia/Jakarta.

## 9.3 Reliability and security

-   [ ] Worker endpoints require a secret.
-   [ ] Service-role key is server-only.
-   [ ] Meta app secret is server-only.
-   [ ] Tokens are encrypted at rest.
-   [ ] Logs redact secrets and tokens.
-   [ ] RLS is enabled on all application tables.
-   [ ] Database uniqueness protects one post per local date.
-   [ ] Failed runs appear in the dashboard.
-   [ ] A failed image generation does not prevent a valid text-only
    post.

# 10. Test Plan

  -----------------------------------------------------------------------
  ID                      Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  TC-001                  Generate a normal daily One valid post record
                          post                    is created

  TC-002                  Generate when recent    Different angle is
                          topic is similar        selected

  TC-003                  Image selector chooses  No image API call is
                          text-only               made

  TC-004                  Image selector chooses  Image is generated and
                          image                   uploaded

  TC-005                  Image API fails         Text-only fallback is
                                                  prepared

  TC-006                  Research provider fails Evergreen topic is used

  TC-007                  Cron triggers twice on  Only one run is created
                          same date               

  TC-008                  Publish text post       Threads media ID is
                                                  stored

  TC-009                  Publish image post      Threads media ID is
                                                  stored

  TC-010                  Token is expired but    Token is refreshed
                          refreshable             securely

  TC-011                  Token is revoked        Publishing stops and
                                                  error is logged

  TC-012                  Meta returns transient  Bounded retry is
                          error                   performed

  TC-013                  Publish request times   Post is marked unknown
                          out                     and reconciled

  TC-014                  Non-admin opens         Access is denied
                          dashboard               

  TC-015                  Browser is closed at    Server automation still
                          19:00                   runs

  TC-016                  Automation is paused    No new content is
                                                  published

  TC-017                  Two posts are attempted Database prevents
                          for one date            duplicate daily post

  TC-018                  Invalid AI JSON is      Validation fails and
                          returned                generation retries
  -----------------------------------------------------------------------

# 11. Deployment Checklist

## Supabase

-   [ ] Create Supabase project.
-   [ ] Apply database migrations.
-   [ ] Configure Supabase Auth.
-   [ ] Insert the owner's admin user ID.
-   [ ] Create generated-assets storage bucket.
-   [ ] Configure storage policies.
-   [ ] Deploy Edge Functions.
-   [ ] Store worker secrets securely.
-   [ ] Configure Cron jobs.
-   [ ] Verify cron execution history.

## Meta

-   [ ] Create Meta developer app.
-   [ ] Add Threads use case/API.
-   [ ] Configure OAuth redirect URI.
-   [ ] Configure required permissions.
-   [ ] Add the owner as an authorized tester/developer where required.
-   [ ] Complete OAuth connection.
-   [ ] Verify token exchange and refresh.
-   [ ] Test text publishing.
-   [ ] Test image publishing.
-   [ ] Verify app mode and review requirements for the intended use.

## Vercel

-   [ ] Import Git repository.
-   [ ] Configure environment variables.
-   [ ] Deploy production build.
-   [ ] Configure custom domain if desired.
-   [ ] Verify server-side routes and OAuth callback.
-   [ ] Confirm no secrets are included in client bundles.

## Production readiness

-   [ ] Run a manual preview without publishing.
-   [ ] Run one controlled text publish.
-   [ ] Run one controlled image publish.
-   [ ] Verify database history and logs.
-   [ ] Verify the 19:00 WIB schedule.
-   [ ] Test pause/resume.
-   [ ] Test failure and retry behavior.
-   [ ] Monitor the first seven scheduled runs.

# 12. Recommended Development Phases

## Phase 1 --- Foundation

-   Scaffold Next.js project.
-   Configure Supabase.
-   Create migrations and RLS.
-   Build single-admin login.
-   Build dashboard shell.

**Definition of done:** secure dashboard works and database is
connected.

## Phase 2 --- Content Engine

-   Implement text AI provider.
-   Implement persona prompt.
-   Implement topic research adapter.
-   Implement anti-repetition.
-   Implement structured output validation.
-   Add manual preview generation.

**Definition of done:** app can generate and store a natural post
without publishing.

## Phase 3 --- Image Engine

-   Implement image provider.
-   Generate optional meme-style visual.
-   Upload to Supabase Storage.
-   Add text-only fallback.

**Definition of done:** both text-only and image post drafts work.

## Phase 4 --- Threads Integration

-   Implement OAuth.
-   Implement secure token storage.
-   Implement token refresh.
-   Implement text and image publishing.
-   Save returned post metadata.

**Definition of done:** controlled text and image posts publish
successfully.

## Phase 5 --- Automation

-   Implement daily generation job.
-   Implement 19:00 publisher job.
-   Implement idempotency and retry.
-   Implement run history and logs.
-   Add pause/resume settings.

**Definition of done:** scheduled posting works without an open browser
or running local computer.

## Phase 6 --- Hardening

-   Add analytics if supported.
-   Add monitoring and notifications.
-   Add prompt versioning.
-   Add usage/cost tracking.
-   Improve content diversity using actual performance.

**Definition of done:** system is observable, recoverable, and
maintainable.

------------------------------------------------------------------------

# 13. Master Prompt for Claude Code

Copy the following prompt into Claude Code from the root directory of a
new repository.

``` text
You are the senior full-stack engineer responsible for building ThreadMe.

PROJECT
ThreadMe is a private, single-owner AI content automation web application.
It generates one natural Indonesian Threads post every day and automatically
publishes it at 19:00 Asia/Jakarta without per-post approval.

PRODUCT DECISIONS — DO NOT CHANGE
- Personal tool for one owner only.
- No public registration or multi-user SaaS features in v1.
- One post per Asia/Jakarta calendar date.
- Target publish time: 19:00 WIB.
- Start content generation at approximately 18:40 WIB.
- Content is Indonesian, casual, relatable, varied, sometimes funny,
  sometimes galau, sometimes reflective, sometimes lightly sarcastic.
- Image is optional. The model must decide whether an image improves the post.
- When an image is used, generate an original meme-style visual.
- Do not copy third-party memes, copyrighted meme templates, or protected characters.
- Use Meta's official Threads API and OAuth. Do not automate the Threads website.
- The system must run on hosted infrastructure while the owner's computer is off.
- Every run, stage, publication result, and failure must be recorded.

TECH STACK
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Edge Functions
- Supabase Cron / pg_cron / pg_net
- Anthropic Claude API as the initial text provider, behind an adapter
- OpenAI Images API as the initial image provider, behind an adapter
- Meta Threads API for publishing
- Vercel for the web application

IMPORTANT PROVIDER SEPARATION
Claude Code is used to write the application. It is not the production runtime.
The deployed app must use API credentials configured by the owner.
Never assume a Claude Code subscription provides Anthropic API credits.

SOURCE OF TRUTH
Use the PRD, architecture, SQL schema, acceptance criteria, and test plan
provided by the owner as the initial product specification.
If the specification file exists in the repository, read it first.
Do not silently change product decisions.
If a provider API detail may have changed, consult the provider's current
official documentation before implementing it.
Do not invent API endpoints, OAuth scopes, request parameters, or API versions.

WORKING RULES
1. Start by inspecting the repository and its current state.
2. Do not overwrite existing work without inspecting it.
3. Before coding, produce a concise implementation plan and identify unknowns.
4. Build in small phases with working checkpoints.
5. After each phase, run typecheck, lint, and relevant tests.
6. Prefer simple, maintainable code over premature abstraction.
7. Use strict TypeScript. Avoid `any` unless justified.
8. Validate all external API responses at runtime.
9. Keep business logic out of React components.
10. Use server-only modules for secrets and privileged operations.
11. Never expose service-role keys, Meta app secrets, OAuth tokens,
    or token-encryption keys to browser code.
12. Never log secrets, authorization codes, or access tokens.
13. Do not claim an integration works until it has been tested.
14. Do not publish a real Threads post during development unless the owner
    explicitly starts a controlled live test.
15. Provide clear setup instructions and `.env.example` placeholders.
16. Add useful error messages and structured logs.
17. Use database migrations for schema changes.
18. Keep the app usable when optional topic research or image generation fails.

INITIAL TASK
Do not attempt to implement the entire system in one pass.

PHASE A — REPOSITORY AND FOUNDATION
- Inspect repository.
- Create or update CLAUDE.md with project conventions.
- Scaffold Next.js App Router with TypeScript.
- Configure Tailwind and shadcn/ui.
- Configure Supabase clients correctly:
  browser client for user-scoped operations,
  server client for authenticated server operations,
  service-role client only in trusted server/worker modules.
- Create initial database migration from the approved schema.
- Enable RLS and add the single-admin authorization helper.
- Create `.env.example`.
- Build a clean, responsive dark/light-capable admin dashboard shell.
- Add login and protected routes.
- Do not add public registration.

PHASE B — CONTENT ENGINE
- Create a TextAIProvider interface.
- Implement Anthropic provider.
- Create a TopicResearchProvider interface with an optional search provider.
- Implement the ThreadMe persona prompt.
- Implement structured JSON output validation using Zod.
- Implement recent-post/topic retrieval.
- Implement anti-repetition checks.
- Implement a quality-control module.
- Add a manual preview generator that never publishes.
- Save generated posts and generation metadata.

PHASE C — IMAGE ENGINE
- Create an ImageAIProvider interface.
- Implement OpenAI Images API integration using the currently supported image model.
- Decode image output safely.
- Upload generated image to Supabase Storage.
- Store asset path, public URL, and alt text.
- Keep image generation optional.
- If image generation/upload fails, convert the draft to text-only when appropriate.
- Do not put long text inside generated images.

PHASE D — THREADS OAUTH AND PUBLISHING
- Read Meta's current official Threads API documentation.
- Implement OAuth authorization and callback.
- Request only necessary scopes for reading basic account identity and publishing.
- Exchange and refresh tokens according to current Meta documentation.
- Encrypt tokens before persistence using a server-side encryption key.
- Implement Threads client methods for:
  - get authenticated profile
  - create text container
  - create image container
  - publish a container
  - retrieve recent posts for reconciliation if supported
- Keep API version and base URL configurable.
- Add a safe test mode.
- Do not store the Threads account password.
- Do not expose access tokens in UI or logs.

PHASE E — AUTOMATION
- Implement an idempotent daily generation worker.
- Use Asia/Jakarta local dates for daily uniqueness.
- Prepare content before 19:00 WIB.
- Implement a publish-due worker for 19:00 WIB.
- Configure hosted Supabase Cron jobs using UTC equivalents.
- Add bounded retry for transient failures.
- Add a publish_unknown state for ambiguous network outcomes.
- Reconcile uncertain outcomes before retrying to prevent duplicate posts.
- Add pause/resume setting.
- Add token expiry checks and safe refresh handling.
- Persist all stage transitions and errors.

PHASE F — TESTING AND DOCUMENTATION
- Unit test content validation, date handling, idempotency, and quality checks.
- Mock external APIs in automated tests.
- Test text-only and image workflows.
- Test token expiry/revocation paths.
- Test duplicate cron invocation.
- Test ambiguous publish outcome.
- Test admin access and RLS.
- Add deployment instructions for Supabase, Meta, and Vercel.
- Add an operational runbook for failures.
- Do not mark a phase complete until its acceptance criteria pass.

UI REQUIREMENTS
Build a clean, modern, minimal admin interface.
Main navigation:
- Dashboard
- Posts
- Content Calendar
- Settings
- Logs

Dashboard cards:
- Automation status
- Next scheduled post
- Last successful post
- Posts published this month
- Latest generation result
- Recent run status

Posts page:
- Date
- Content preview
- Pillar
- Format (text/image)
- Status
- Threads link if available

Settings page:
- Automation enabled/disabled
- Timezone (default Asia/Jakarta)
- Generation time (default 18:40)
- Publishing time (default 19:00)
- Image preference/target ratio
- Persona prompt
- Connected Threads username
- Token status (never show token value)

CONTENT QUALITY REQUIREMENTS
The writer should sound like a real Indonesian social-media user.
Avoid generic motivational quotes, overly polished AI phrasing, repeated hooks,
unnecessary emojis, forced questions, and repetitive punchline patterns.
Use everyday observations, mild humor, light galau, short poems, and relatable
adult-life situations.
Do not invent personal experiences.
Do not invent current events.
If current research is unavailable, use evergreen ideas.
Do not joke about tragedies or exploit sensitive events.

DELIVERY FORMAT
At the end of each phase, report:
1. What was implemented.
2. Files created/changed.
3. Commands run.
4. Test results.
5. Known limitations.
6. Exact next step.

Start with PHASE A only.
First inspect the repository and present the implementation plan.
Wait for confirmation before moving into major integration work.
```

------------------------------------------------------------------------

# 14. First Development Session

The first Claude Code session should only establish the foundation. Do
not start with Meta OAuth or AI generation before the app structure and
database are stable.

Suggested first terminal commands:

``` bash
mkdir threadme
cd threadme
git init
claude
```

Then paste the Master Prompt above.

When Claude Code has inspected the repository and presented its plan,
have it implement Phase A.

------------------------------------------------------------------------

# 15. Important Technical Notes and References

1.  Meta Threads API documentation:
    https://developers.facebook.com/docs/threads/
2.  Meta Threads API Postman collection:
    https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
3.  Supabase Cron: https://supabase.com/docs/guides/cron
4.  Supabase scheduling Edge Functions:
    https://supabase.com/docs/guides/functions/schedule-functions
5.  OpenAI Image Generation API:
    https://developers.openai.com/api/docs/guides/image-generation
6.  Anthropic API documentation: https://docs.anthropic.com/

**Implementation warning:** Meta API permissions, app modes, review
requirements, token lifetimes, endpoint versions, and publishing
behavior can change. Verify them against current official documentation
before production deployment.

**Final v1 definition:** ThreadMe is complete when it can generate one
original, quality-checked Indonesian post per day, optionally create an
image, publish it to the owner's Threads account at 19:00 WIB, and
record the result without requiring an open browser or manual approval.

------------------------------------------------------------------------

# 14. Revision V1.1 --- Topic Studio (Authoritative Product Update)

**Revision:** V1.1\
**Date:** 7 November 2026\
**Default topic mode:** `mix` (Auto Mix)\
**Posting cadence remains unchanged:** one post per day at 19:00 WIB.

This section is an authoritative extension to V1.0. Where an earlier
V1.0 section conflicts with this revision, V1.1 takes precedence.

## 14.1 Product decision

ThreadMe now includes **Topic Studio**, a first-class content planning
feature. The owner can manage a topic library, add custom topics, and
let the AI rotate topics automatically.

The active default is **Auto Mix**: - The AI chooses one eligible topic
for each daily post. - The selection considers recent topic usage,
priority, and variety. - The same topic should not be selected again
within the last 7 days when enough other active topics are available. -
A topic is an editorial subject; a content pillar is the writing
category/tone. Keep these concepts separate. - The AI generates several
different angles for the selected topic, chooses one, then writes one
final post. - Style references inform high-level writing traits only.
The system must not copy sample sentences or reproduce another account's
posts.

## 14.2 Initial built-in topic library

Seed these eight active topics in the first Topic Studio migration:

  ---------------------------------------------------------------------------------
  Topic                   Slug                              Description / editorial
                                                            direction
  ----------------------- --------------------------------- -----------------------
  Tidak dianggap          `tidak-dianggap`                  Feeling overlooked, not
                                                            being prioritized, or
                                                            being present but
                                                            unnoticed. Balance
                                                            vulnerability with
                                                            humor or self-respect.

  Baru putus cinta        `baru-putus-cinta`                The strange, funny,
                                                            sad, or freeing moments
                                                            after a breakup. Avoid
                                                            revenge fantasies and
                                                            obsessive behavior.

  Excited sendirian       `excited-sendirian`               Being enthusiastic
                                                            while the other person
                                                            responds with low
                                                            energy. Use relatable
                                                            contrast and gentle
                                                            humor.

  Overthinking            `overthinking`                    Everyday worries,
                                                            late-night thoughts,
                                                            uncertainty, and
                                                            imagining too many
                                                            possibilities. Keep it
                                                            relatable, not
                                                            alarmist.

  Cinta bertepuk sebelah  `cinta-bertepuk-sebelah-tangan`   One-sided affection,
  tangan                                                    unspoken feelings,
                                                            waiting, and accepting
                                                            reality. Vary emotional
                                                            and humorous angles.

  Humor kehidupan         `humor-kehidupan`                 Work, money, adulting,
                                                            sleep, errands, family
                                                            moments, and ordinary
                                                            absurdities.

  Kesepian                `kesepian`                        Solitude, feeling
                                                            disconnected, wanting
                                                            company, and learning
                                                            to be comfortable
                                                            alone. Use empathetic
                                                            language.

  Random thoughts         `random-thoughts`                 Unexpected
                                                            observations, odd
                                                            comparisons, small
                                                            daily mysteries, and
                                                            spontaneous thoughts.
  ---------------------------------------------------------------------------------

The owner can activate, deactivate, edit descriptions, and change
priority. Built-in topics must not be permanently deleted through the
normal UI; they can be deactivated.

## 14.3 Topic Studio functional requirements

  ------------------------------------------------------------------------
  ID                Feature           Requirement        Priority
  ----------------- ----------------- ------------------ -----------------
  TS-01             Topic library     Show all built-in  P0
                                      and custom topics  

  TS-02             Built-in topics   Seed the eight     P0
                                      topics listed      
                                      above              

  TS-03             Custom topics     Create, edit,      P0
                                      activate,          
                                      deactivate, and    
                                      archive custom     
                                      topics             

  TS-04             Topic             Store editorial    P0
                    descriptions      context and        
                                      boundaries for     
                                      each topic         

  TS-05             Topic priority    Allow priority     P0
                                      values from 1 to 5 

  TS-06             Auto Mix          Default selection  P0
                                      mode is `mix`      

  TS-07             Topic rotation    Avoid recently     P0
                                      used topics when   
                                      alternatives exist 

  TS-08             Topic history     Record the         P0
                                      selected topic for 
                                      each daily post    

  TS-09             Angle generator   Generate 3--5      P0
                                      distinct angles    
                                      for the selected   
                                      topic              

  TS-10             Angle selection   Select an angle    P0
                                      using novelty,     
                                      variety, and       
                                      voice-fit checks   

  TS-11             Angle history     Store the chosen   P0
                                      angle and its      
                                      fingerprint to     
                                      prevent repeats    

  TS-12             Style references  Allow the owner to P0
                                      paste and save     
                                      writing samples    

  TS-13             Style analysis    Extract high-level P0
                                      traits into a      
                                      structured style   
                                      profile            

  TS-14             Style toggle      Allow style        P0
                                      references to be   
                                      enabled/disabled   

  TS-15             Prompt            Save which topic,  P0
                    traceability      angle, and style   
                                      profile version    
                                      informed a post    
  ------------------------------------------------------------------------

Focus Topic and Topic Schedule can be future modes, but the active V1.1
production setting is `mix`. Do not build unnecessary scheduling
complexity before the Auto Mix workflow is reliable.

## 14.4 Topic rotation algorithm

Implement topic selection in a deterministic, testable service, not
inside a React component.

Recommended initial algorithm:

1.  Load all active topics.
2.  Load topic usage from the last 30 days.
3.  Exclude topics used within the configured cooldown (default 7 days)
    if at least one alternative remains.
4.  Among eligible topics, prefer topics with lower usage counts in the
    rolling 30-day window.
5.  Use `priority` as a weighted tie-breaker, not as permission for one
    topic to dominate every day.
6.  Randomize only among similarly ranked candidates so the result does
    not become mechanically predictable.
7.  If no active topic exists, fail the run with a clear configuration
    error; do not silently invent a custom topic.
8.  Record the selected topic in `topic_history` and update
    `content_topics.last_selected_at`.

Suggested settings: - `topic_mode = 'mix'` -
`topic_rotation_cooldown_days = 7` - `angle_candidates_count = 5` -
`style_reference_enabled = true`

The rotation algorithm must be unit-tested with fixed histories and
deterministic random seeds.

## 14.5 Angle Generator

For the selected topic, generate 3--5 candidate angles internally. Do
not publish the candidate list; publish only the strongest final post.

Examples for **"Tidak dianggap"**: - Humorous: treating attention like a
limited office-hour service. - Vulnerable: always showing up for someone
who barely notices. - Self-respect: realizing that not being prioritized
is also information. - Ironic: being the emergency contact only when
everyone else is unavailable. - Poetic: being physically present but
emotionally invisible.

Examples for **"Excited sendirian"**: - Funny contrast between a long
enthusiastic message and a one-word reply. - A gentle observation about
mismatched energy. - A self-aware realization that enthusiasm is not
always mutual. - A short poetic thought about sharing excitement with
the wrong person.

Angle categories may include: - `humor` - `vulnerable` - `ironic` -
`poetic` - `self_reflection` - `everyday_observation` - `satire`

Angle selection checks: - Is it distinct from recent angles for the same
topic? - Does it fit the topic description? - Does it fit the ThreadMe
persona? - Is it suitable for a short Threads post? - Does it avoid
repeating a recent opening, punchline, or structure?

Save the selected angle and a normalized `angle_fingerprint` in
`topic_history`. Candidate angles may be saved in metadata for debugging
and diversity analysis.

## 14.6 Style Reference

Add a Style Reference panel to Topic Studio.

The owner can: - Paste 3--5 sample posts manually. - Give each reference
a label. - Optionally record the public source URL as provenance. -
Activate or deactivate individual references. - Run AI analysis to
create a structured style profile. - Review and edit the generated style
notes.

The application should extract high-level characteristics such as: -
Typical sentence length and rhythm. - Casualness/register of
Indonesian. - Use of line breaks. - Humor intensity. - Emotional
intensity. - Poetic density. - Use of understatement, contrast, or
punchlines. - Emoji and hashtag frequency. - Whether the writing tends
to be one-liners or short multi-line thoughts.

**Originality boundary:** use references to understand broad writing
characteristics, not to copy wording, distinctive phrases, or a specific
post. Never reproduce a sample with only a few words changed. Generate
original ThreadMe writing. Store the user's manually supplied samples
securely. Do not scrape a third-party Threads profile automatically; use
manually supplied examples or an officially permitted API workflow.

## 14.7 Topic Studio UI

Add **Topic Studio** to the main navigation.

Recommended sections:

1.  **Topic Library**
    -   Topic name and description.
    -   Built-in/custom indicator.
    -   Active/inactive toggle.
    -   Priority (1--5).
    -   Last used date.
    -   Usage count in the last 30 days.
    -   Add custom topic action.
2.  **Rotation Settings**
    -   Current mode displayed as Auto Mix.
    -   Cooldown days (default 7).
    -   Angle candidates (default 5).
    -   Explanation of how topic fairness works.
3.  **Angle Generator**
    -   Select a topic.
    -   Generate sample angles without publishing.
    -   Show angle category and short description.
    -   Mark recent/used angles to prevent repetition.
4.  **Style Reference**
    -   Add sample text.
    -   Optional source label and URL.
    -   Analyze style button.
    -   Display extracted traits.
    -   Enable/disable reference.
5.  **Topic Activity**
    -   Date.
    -   Selected topic.
    -   Selected angle.
    -   Published post link.
    -   Format (text/image).

## 14.8 Database schema --- V1.1 additions

The original V1.0 tables remain. Add the following migration to support
Topic Studio. The migration is additive and should be saved as:

`supabase/migrations/20261107_000002_topic_studio_v1_1.sql`

``` sql
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

-- Seed the eight built-in topics. Re-running the migration is safe.
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

-- Add Topic Studio configuration to the singleton settings row.
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

alter table public.app_settings
  add constraint app_settings_focus_topic_fk
  foreign key (focus_topic_id)
  references public.content_topics(id)
  on delete set null;

-- Store topic and angle details for each selected daily idea.
alter table public.topic_history
  add column if not exists topic_id uuid,
  add column if not exists angle_type text,
  add column if not exists angle_fingerprint text,
  add column if not exists selection_mode text not null default 'mix',
  add column if not exists candidate_angles jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.topic_history
  add constraint topic_history_topic_fk
  foreign key (topic_id)
  references public.content_topics(id)
  on delete set null;

alter table public.topic_history
  add constraint topic_history_selection_mode_check
  check (selection_mode in ('mix', 'focus', 'schedule'));

-- Store the selected topic and angle on the final post for easy dashboard queries.
alter table public.content_posts
  add column if not exists topic_id uuid,
  add column if not exists angle text,
  add column if not exists style_reference_snapshot jsonb not null default '[]'::jsonb;

alter table public.content_posts
  add constraint content_posts_topic_fk
  foreign key (topic_id)
  references public.content_topics(id)
  on delete set null;

-- Manually supplied writing samples and their high-level style analysis.
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

-- Enable RLS on the new tables.
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

-- V1.1 active defaults.
update public.app_settings
set topic_mode = 'mix',
    topic_rotation_cooldown_days = 7,
    angle_candidates_count = 5,
    style_reference_enabled = true,
    updated_at = now()
where singleton = true;
```

### Migration implementation notes

-   The SQL migration is additive; do not recreate or truncate V1.0
    tables.
-   Before production, inspect existing constraint names. If the
    migration is re-run, use guarded constraint creation for every
    foreign key as well.
-   The `content_topics.last_selected_at` field is maintained by the
    application when a topic is committed to a daily run.
-   Keep topic and angle selection inside a server-side service.
-   Do not expose `style_references.sample_text` to
    public/unauthenticated clients.
-   Built-in topics are archived/deactivated, not hard-deleted.
-   If a custom topic has already been used, archive it rather than
    deleting historical context.

## 14.9 Topic Studio API contracts

  -------------------------------------------------------------------------------------
  Method                  Endpoint                              Purpose
  ----------------------- ------------------------------------- -----------------------
  GET                     `/api/topics`                         List topics and usage
                                                                statistics

  POST                    `/api/topics`                         Create a custom topic

  PATCH                   `/api/topics/:id`                     Edit, prioritize,
                                                                activate, or deactivate
                                                                a topic

  POST                    `/api/topics/:id/preview-angles`      Generate sample angles
                                                                without publishing

  GET                     `/api/topic-history`                  View topic and angle
                                                                history

  GET                     `/api/style-references`               List saved style
                                                                references

  POST                    `/api/style-references`               Save a manually
                                                                supplied writing sample

  PATCH                   `/api/style-references/:id`           Edit or
                                                                activate/deactivate a
                                                                reference

  POST                    `/api/style-references/:id/analyze`   Analyze high-level
                                                                style traits

  DELETE                  `/api/style-references/:id`           Delete an
                                                                owner-supplied
                                                                reference
  -------------------------------------------------------------------------------------

All write endpoints require admin authentication. AI calls must be
server-side.

## 14.10 Updated daily AI pipeline

1.  Load active topics and Topic Studio settings.
2.  Select one topic using Auto Mix rotation.
3.  Load the selected topic description and recent topic/angle history.
4.  Load active style-reference traits if
    `style_reference_enabled = true`.
5.  Generate 3--5 candidate angles.
6.  Reject angles too similar to recent angles for the same topic.
7.  Score the remaining angles for novelty, relatability, persona fit,
    and variety.
8.  Select one angle.
9.  Write one original Threads post.
10. Run content quality and duplicate checks.
11. Decide whether an image adds value.
12. Generate and store an original image only when selected.
13. Save the topic, angle, style-reference snapshot, and final post.
14. Publish at 19:00 WIB.

## 14.11 Updated AI prompt --- Topic Studio

Append this to the V1.0 persona and daily generation prompts:

``` text
TOPIC STUDIO — THREADME V1.1

You receive:
- A selected topic name and description.
- Recent topic history.
- Recent selected angles.
- Optional style-reference traits.
- Current local date and day context.

Your task:
1. Stay within the selected topic, but explore a fresh perspective.
2. Internally generate 3–5 distinct candidate angles.
3. Make the angles meaningfully different, not minor rewordings.
4. Avoid angles used recently for this topic.
5. Select the strongest angle based on originality, relatability,
   naturalness, and fit with ThreadMe's persona.
6. Write one final original Threads post.
7. Decide whether the post is stronger with text only or with an image.
8. Return structured output including topic, selected angle,
   angle category, final text, format, and optional image prompt.

STYLE REFERENCE RULES:
- Use only high-level traits from supplied style references.
- You may adapt broad traits such as sentence rhythm, casualness,
  humor intensity, line breaks, and emotional tone.
- Never copy a sample sentence, distinctive phrase, or post structure
  so closely that the result is a disguised rewrite.
- Do not claim to be the reference account or person.
- Preserve ThreadMe's own identity and generate original wording.

TOPIC VARIETY:
- Do not use the same topic within the configured cooldown when
  enough alternative active topics exist.
- Do not overuse one emotional tone.
- A sad topic can produce humor; a humorous topic can produce
  a reflective observation.
- Avoid turning every topic into a breakup quote.
- If the selected topic has no fresh angle, generate a different
  perspective rather than forcing a weak post.

Return valid JSON only. Do not publish multiple posts.
```

## 14.12 Updated acceptance criteria

-   [ ] Topic Studio appears in the dashboard navigation.
-   [ ] The eight built-in topics are seeded exactly once.
-   [ ] The default topic mode is `mix`.
-   [ ] The owner can add and edit custom topics.
-   [ ] The owner can activate/deactivate topics.
-   [ ] Built-in topics cannot be hard-deleted from the UI.
-   [ ] Topic priority accepts values 1--5.
-   [ ] The rotation service respects the 7-day cooldown when
    alternatives exist.
-   [ ] The rotation service prefers underused topics in the rolling
    30-day window.
-   [ ] The selected topic is recorded in topic history.
-   [ ] The angle generator creates 3--5 distinct candidate angles.
-   [ ] Only one selected angle is used for the daily post.
-   [ ] Recent angles are checked to avoid repetition.
-   [ ] The owner can paste multiple style-reference samples.
-   [ ] Style analysis returns structured high-level traits.
-   [ ] The owner can enable/disable style references.
-   [ ] The final post is original and does not copy reference wording.
-   [ ] The final post stores the topic, selected angle, and
    style-reference snapshot.
-   [ ] Existing V1.0 post history remains intact after migration.

## 14.13 Topic Studio test cases

  -----------------------------------------------------------------------
  ID                      Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  TS-TC-01                Fresh installation      Eight built-in topics
                                                  exist once

  TS-TC-02                Re-run seed migration   No duplicate topic rows

  TS-TC-03                Add custom topic        Topic is saved and
                                                  available to Auto Mix

  TS-TC-04                Deactivate topic        Topic is excluded from
                                                  future selection

  TS-TC-05                Select topic in Auto    Eligible topic is
                          Mix                     selected

  TS-TC-06                Topic used yesterday    It is excluded when
                                                  alternatives exist

  TS-TC-07                All topics inside       Rotation relaxes
                          cooldown                cooldown safely and
                                                  records the decision

  TS-TC-08                Topic has highest       A less-used eligible
                          recent usage            topic is preferred

  TS-TC-09                Generate angles         3--5 distinct angles
                                                  are returned

  TS-TC-10                Recent angle is similar Similar candidate is
                                                  rejected or regenerated

  TS-TC-11                Save style reference    Sample is stored
                                                  privately

  TS-TC-12                Analyze style reference High-level traits are
                                                  stored as structured
                                                  JSON

  TS-TC-13                Disable style reference Traits are not injected
                                                  into generation prompt

  TS-TC-14                Reference contains      Final output does not
                          distinctive phrase      reproduce it

  TS-TC-15                No active topics        Run fails with a clear
                                                  configuration error

  TS-TC-16                Existing V1.0 data      Migration preserves all
                                                  previous posts and
                                                  history
  -----------------------------------------------------------------------

## 14.14 Updated Claude Code Master Prompt Addendum

Paste this after the original Master Prompt when continuing development:

``` text
THREADME V1.1 — TOPIC STUDIO REQUIREMENTS

The owner has approved Topic Studio with Auto Mix as the active default.

Initial built-in topics:
1. Tidak dianggap
2. Baru putus cinta
3. Excited sendirian
4. Overthinking
5. Cinta bertepuk sebelah tangan
6. Humor kehidupan
7. Kesepian
8. Random thoughts

Implement these V1.1 capabilities:

A. TOPIC LIBRARY
- Create the eight built-in topics through an idempotent database seed.
- Support custom topic creation, editing, priority, activation, and archival.
- Store a description and editorial direction for every topic.
- Never hard-delete a built-in topic through the UI.

B. AUTO MIX ROTATION
- Default `topic_mode` to `mix`.
- Default cooldown to 7 days.
- Use recent topic history and rolling 30-day usage to balance topic selection.
- Prefer underused topics and respect priority without letting one topic dominate.
- If all topics are in cooldown, relax the cooldown rather than failing unnecessarily.
- Record every selected topic.

C. ANGLE GENERATOR
- Generate 3–5 candidate angles for the selected topic.
- Angle categories: humor, vulnerable, ironic, poetic, self_reflection,
  everyday_observation, satire.
- Select one angle using novelty, relatability, persona fit, and recency.
- Persist the chosen angle and fingerprint.
- Do not publish the candidate list.

D. STYLE REFERENCE
- Allow the owner to paste 3–5 writing samples manually.
- Store optional source label and URL.
- Analyze high-level traits: sentence rhythm, register, line breaks,
  humor intensity, emotional intensity, poetic density, punctuation,
  emoji frequency, and punchline technique.
- Store structured analysis in `style_references.style_traits`.
- Allow references to be enabled/disabled.
- Never copy distinctive wording or reproduce a sample with minor edits.
- Do not scrape third-party Threads profiles automatically.
- Use manually provided examples or an officially permitted API workflow.

E. DATABASE
- Add the V1.1 migration:
  `supabase/migrations/20261107_000002_topic_studio_v1_1.sql`
- Preserve all V1.0 data.
- Add `content_topics` and `style_references`.
- Extend `app_settings`, `topic_history`, and `content_posts`.
- Apply RLS to every new table.
- Add indexes and safe seed logic.
- Make the migration safe to apply once in a fresh database and document
  any guarded behavior required for reapplication.

F. UI
- Add Topic Studio to navigation.
- Build Topic Library, Rotation Settings, Angle Generator,
  Style Reference, and Topic Activity sections.
- Keep the existing 19:00 WIB publishing schedule unchanged.
- Keep image selection optional.
- Provide a preview-only action that never publishes.

G. TESTING
- Add tests for topic rotation, cooldown, priority, and usage balancing.
- Add tests for angle diversity and angle history.
- Add tests for style reference enable/disable behavior.
- Add tests proving sample wording is not copied.
- Add tests proving V1.0 post history survives the migration.

Implement Topic Studio after the V1.0 foundation and content engine are stable.
Do not build Focus Topic or Topic Schedule UI in this revision.
The active production mode remains Auto Mix.
```

------------------------------------------------------------------------

# 15. Revision History

  -----------------------------------------------------------------------
  Version                             Changes
  ----------------------------------- -----------------------------------
  V1.0                                Initial personal AI Threads content
                                      automation PRD, architecture,
                                      database, and Claude Code prompt

  V1.1                                Added Topic Studio, eight built-in
                                      topics, Auto Mix rotation, custom
                                      topics, Angle Generator, Style
                                      Reference, database migration, UI
                                      requirements, and test cases
  -----------------------------------------------------------------------

**Final V1.1 product definition:** ThreadMe automatically chooses one
topic from the owner's topic library, rotates topics to avoid
repetition, generates multiple original angles, writes one natural
Indonesian post in the ThreadMe voice, optionally creates an original
meme-style image, and publishes one post to Threads at 19:00 WIB.
