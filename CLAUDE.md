# ThreadMe - Developer Guidelines & Project Conventions

## Overview
ThreadMe is a private, single-owner AI content automation web application that generates and publishes one natural-sounding Indonesian Threads post per day at 19:00 WIB (Asia/Jakarta timezone).

## Tech Stack
- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + custom theme tokens (shadcn/ui compatible)
- **Database & Auth:** Supabase PostgreSQL with RLS, Supabase Auth (single admin), Supabase Storage
- **Automation:** Supabase Edge Functions + Supabase Cron (`pg_cron` + `pg_net`)
- **Text AI Provider:** Anthropic Claude API (via adapter)
- **Image AI Provider:** OpenAI Images API (via adapter)
- **Social Publishing:** Official Meta Threads Graph API

## Architectural Rules
1. **Single-Admin Only:** No public registration or multi-tenant SaaS code in v1.
2. **One Post Per Local Date:** Scheduled date uses Asia/Jakarta (`YYYY-MM-DD`). Idempotency is enforced by unique constraints.
3. **Secret Separation:**
   - Never expose `SUPABASE_SERVICE_ROLE_KEY`, `THREADS_APP_SECRET`, or `TOKEN_ENCRYPTION_KEY` in browser-accessible code.
   - Any server route or function handling privileged operations must use `import 'server-only'` or be an isolated route handler.
4. **Content Identity:** Casual Indonesian youth voice. No generic quotes, corporate speak, or repetitive question hooks.

## Project Structure
- `app/`: Next.js App Router (dashboard shell, login, api endpoints)
- `components/`: UI components (sidebar, status cards, buttons, dialogs)
- `lib/`:
  - `supabase/`: Browser, server, and service-role clients + auth helpers
  - `ai/`: Text and image provider adapters
  - `threads/`: Threads OAuth, client, and token manager
  - `automation/`: Daily generation, publishing, and quality check engines
- `supabase/migrations/`: Versioned SQL migrations

## Common Commands
- `npm run dev` : Start local development server
- `npm run build` : Build for production
- `npm run typecheck` : Validate TypeScript types (`tsc --noEmit`)
- `npm run lint` : Lint codebase with ESLint
