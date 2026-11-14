import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  ImageIcon,
  Send,
  Wifi,
  WifiOff,
  AlertTriangle,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Repeat,
  Quote,
  ShieldAlert,
  Users,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { formatDateWIB, getTodayDateWIB } from '@/lib/utils'
import { ActivityChart } from './activity-chart'
import { DashboardPreviewAction } from './preview-action'
import { AutomationTest } from './automation-test'
import { getThreadsInsights, type ThreadsInsightsData } from '@/lib/threads/insights'

export const dynamic = 'force-dynamic'

type AppSettings = Database['public']['Tables']['app_settings']['Row']
type ContentPost = Database['public']['Tables']['content_posts']['Row']
type AutomationRun = Database['public']['Tables']['automation_runs']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()

  const firstDayOfMonth = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).slice(0, 7)}-01T00:00:00+07:00`
  const [settingsResult, publishedResult, readyResult, countResult, latestResult, runResult, accountResult, heartbeatResult, insights] = await Promise.all([
    supabase.from('app_settings').select('*').eq('singleton', true).single(),
    supabase.from('content_posts').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('content_posts').select('*').in('status', ['ready', 'generating']).not('scheduled_for', 'is', null).order('scheduled_for', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('content_posts').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', firstDayOfMonth),
    supabase.from('content_posts').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('automation_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('social_accounts').select('username, is_active, token_expires_at, granted_scopes').eq('is_active', true).maybeSingle(),
    supabase.from('system_logs').select('created_at').eq('event', 'automation_heartbeat').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    getThreadsInsights().catch((): ThreadsInsightsData => ({ status: 'error', message: 'Tidak dapat memuat insight saat ini.' })),
  ])
  const activityResult = await supabase.from('content_posts').select('status,scheduled_for,published_at,content_type').or(`scheduled_for.gte.${new Date(Date.now() - 31 * 86400000).toISOString()},published_at.gte.${new Date(Date.now() - 31 * 86400000).toISOString()}`)
  const settings = settingsResult.data as AppSettings | null
  const lastPublishedPost = publishedResult.data as ContentPost | null
  const nextReadyPost = readyResult.data as ContentPost | null
  const monthlyPublishedCount = countResult.count
  const latestPost = latestResult.data as ContentPost | null
  const latestRun = runResult.data as AutomationRun | null
  const account = accountResult.data as { username: string | null; is_active: boolean; token_expires_at: string | null; granted_scopes: string[] } | null
  const heartbeat = heartbeatResult.data as { created_at: string } | null

  const automationActive = settings?.automation_enabled ?? false
  const publishLive = process.env.THREADS_PUBLISH_MODE === 'live'
  const tokenExpired = account?.token_expires_at ? Date.parse(account.token_expires_at) <= Date.now() : true
  const heartbeatFresh = heartbeat?.created_at ? Date.now() - Date.parse(heartbeat.created_at) < 5 * 60_000 : false

  const dataUnavailable = [settingsResult, publishedResult, readyResult, countResult, latestResult, runResult, accountResult, heartbeatResult].some(result => result.error)
  if (dataUnavailable) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Ikhtisar Otomatisasi</h1>
        <p role="alert" className="text-sm text-destructive">Status dashboard tidak tersedia karena sebagian data gagal dimuat. Muat ulang halaman untuk mencoba lagi.</p>
        <Link href="/dashboard" className="inline-block text-sm text-primary underline">Muat ulang dashboard</Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ikhtisar Otomatisasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status mesin konten harian Threads (Target rilis {settings?.posting_time ? `${settings.posting_time.slice(0, 5)} WIB` : '19:00 WIB'}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DashboardPreviewAction />
          <span
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold ${
              automationActive
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                automationActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {automationActive ? 'Otomatisasi Aktif' : 'Otomatisasi Nonaktif (Paused)'}
          </span>
        </div>
      </div>

      {/* Connected Account & Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {insights.profile?.threads_profile_picture_url ? (
                <img
                  src={insights.profile.threads_profile_picture_url}
                  alt={insights.profile.name || account?.username || 'Threads'}
                  className="h-14 w-14 rounded-full border-2 border-primary/20 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary border-2 border-primary/20 shadow-sm">
                  {(insights.profile?.username || account?.username || 'T').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card ${
                  account?.is_active && !tokenExpired ? 'bg-emerald-500' : 'bg-destructive'
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground truncate">
                  {insights.profile?.name || account?.username || 'Akun Threads'}
                </h2>
                {account?.username && (
                  <a
                    href={`https://www.threads.net/@${account.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono font-medium text-primary hover:underline"
                  >
                    @{account.username}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    account?.is_active && !tokenExpired
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${account?.is_active && !tokenExpired ? 'bg-emerald-500' : 'bg-destructive'}`} />
                  {account?.is_active && !tokenExpired ? 'Terhubung & Aktif' : 'Perlu Hubungkan Ulang'}
                </span>
              </div>
              {insights.profile?.threads_biography && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                  {insights.profile.threads_biography}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5 font-bold text-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {(insights.profile?.followers_count ?? insights.metrics?.followersCount ?? 0).toLocaleString('id-ID')}
                  <span className="font-normal text-muted-foreground">Follower</span>
                </span>
                <span>•</span>
                <span>
                  Token: {account?.token_expires_at ? `Aktif s/d ${formatDateWIB(account.token_expires_at)}` : 'Tidak aktif'}
                </span>
                <span>•</span>
                <span className="text-[11px] text-muted-foreground/80">
                  Mode: <strong className="text-foreground">{publishLive ? 'Live Publikasi' : 'Dry-Run'}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link
              href="/settings"
              className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 transition"
            >
              Kelola Akun
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Status Otomatisasi */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jadwal Harian
            </span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-foreground">
              {settings?.posting_time ? `${settings.posting_time.slice(0, 5)} WIB` : '19:00 WIB'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Generasi mulai {settings?.generation_time ? `${settings.generation_time.slice(0, 5)} WIB` : '18:40 WIB'} ({settings?.timezone || 'Asia/Jakarta'})
            </p>
          </div>
        </div>

        {/* Card 2: Postingan Terjadwal Berikutnya */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Antrean Berikutnya
            </span>
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-500">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {nextReadyPost ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground truncate max-w-[200px]">
                    {nextReadyPost.scheduled_date}
                  </span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500 uppercase">
                    {nextReadyPost.status}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {nextReadyPost.content}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-base font-semibold text-foreground">
                  Belum ada antrean konten
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Akan dibuat otomatis pada siklus generasi {settings?.generation_time ? `${settings.generation_time.slice(0, 5)} WIB` : '18:40 WIB'}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Postingan Terakhir Sukses */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Publikasi Terakhir
            </span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {lastPublishedPost ? (
              <div>
                <div className="text-sm font-bold text-foreground">
                  {lastPublishedPost.published_at ? formatDateWIB(lastPublishedPost.published_at) : lastPublishedPost.scheduled_date}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  &ldquo;{lastPublishedPost.content}&rdquo;
                </p>
              </div>
            ) : (
              <div>
                <div className="text-base font-semibold text-foreground">
                  Belum ada postingan terbit
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Postingan pertama akan muncul setelah publikasi live.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Terbit Bulan Ini */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Terbit Bulan Ini
            </span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-500">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-foreground">
              {countResult.error ? 'N/A' : (monthlyPublishedCount ?? 0)} <span className="text-sm font-normal text-muted-foreground">post</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Target ritme: 1 post per hari kalender Asia/Jakarta.
            </p>
          </div>
        </div>

        {/* Card 5: Hasil Generasi AI Terakhir */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generasi Konten Terakhir
            </span>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {latestPost ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                    {latestPost.pillar}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {latestPost.content_type === 'image' ? (
                      <ImageIcon className="h-3 w-3" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    {latestPost.content_type}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {latestPost.content}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-base font-semibold text-foreground">
                  Belum ada draf konten
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Draf harian dibuat otomatis saat jadwal generasi atau dapat dipicu manual.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 6: Status Eksekusi Terakhir */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Run Otomatisasi
            </span>
            <div className="rounded-xl bg-teal-500/10 p-2.5 text-teal-500">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            {latestRun ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {latestRun.run_date}
                  </span>
                  <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-500 uppercase">
                    {latestRun.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tahap: {latestRun.current_stage}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-base font-semibold text-foreground">
                  Belum ada riwayat run
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Riwayat generasi dicatat otomatis saat siklus worker berjalan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ActivityChart posts={activityResult.data || []} today={getTodayDateWIB()} unavailable={!!activityResult.error} />

      {/* Threads Official Insights Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Insight &amp; Metrik Akun Threads
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Data resmi langsung dari Meta Threads API (@{account?.username || 'threads'}). Cache server 30 menit untuk menjaga kuota rate limit.
            </p>
          </div>
          {('cachedAt' in insights && insights.cachedAt) && (
            <span className="text-[11px] font-mono text-muted-foreground">
              Diperbarui: {formatDateWIB(insights.cachedAt)}
            </span>
          )}
        </div>

        {insights.status === 'ok' && insights.metrics ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 pt-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Followers</span>
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {(insights.metrics.followersCount ?? insights.profile?.followers_count ?? 0).toLocaleString('id-ID')}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Pengikut akun Threads</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Views (Tayangan)</span>
                <Eye className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {insights.metrics.views.toLocaleString('id-ID')}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Total impresi postingan</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Likes (Suka)</span>
                <Heart className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {insights.metrics.likes.toLocaleString('id-ID')}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Total apresiasi suka</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Replies (Balasan)</span>
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {insights.metrics.replies.toLocaleString('id-ID')}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Komentar &amp; diskusi</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Reposts</span>
                <Repeat className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {insights.metrics.reposts.toLocaleString('id-ID')}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Dibagikan pengguna lain</p>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Quotes (Kutipan)</span>
                <Quote className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-foreground">
                {insights.metrics.quotes.toLocaleString('id-ID')}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Dikutip dengan komentar</p>
            </div>
          </div>
        ) : insights.status === 'scope_missing' ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  Izin Insight (threads_manage_insights) Belum Diberikan
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Akun @{account?.username} saat ini terhubung untuk publikasi. Untuk mengaktifkan metrik views, likes, dan interaksi resmi Meta di sini, silakan hubungkan ulang akun di Pengaturan.
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors"
            >
              Buka Pengaturan
            </Link>
          </div>
        ) : insights.status === 'not_connected' ? (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center justify-between">
            <span>Hubungkan akun Threads di Pengaturan untuk memantau metrik performa secara live.</span>
            <Link href="/settings" className="text-primary font-semibold hover:underline">
              Hubungkan &rarr;
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground">
            {insights.message || 'Data insight belum tersedia atau akun belum memiliki aktivitas publikasi yang cukup.'}
          </div>
        )}
      </div>

      {/* System Status Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status Konektivitas & Mesin Otomatisasi
          </h2>
          <Link
            href="/settings"
            className="text-xs font-medium text-primary hover:underline"
          >
            Buka Pengaturan &rarr;
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              {account?.is_active && !tokenExpired ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Akun Threads Terhubung</span>
                </>
              ) : account?.is_active && tokenExpired ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-500">Token Kedaluwarsa</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Threads Belum Terhubung</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">
              {account?.username ? `@${account.username}` : 'Belum dihubungkan'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {account?.is_active && !tokenExpired
                ? `${account.granted_scopes?.length ?? 0} izin aktif`
                : 'Periksa tab Pengaturan'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              {publishLive ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Mode Live</span>
                </>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-blue-500">Mode Simulasi (Dry-Run)</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">
              {publishLive ? 'Publikasi Nyata' : 'Hanya Mencatat Rencana'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {publishLive ? 'Post dikirim ke Meta Threads' : 'Aman untuk pengujian'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              {heartbeatFresh ? (
                <>
                  <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  <span className="text-emerald-500">Worker Aktif</span>
                </>
              ) : heartbeat?.created_at ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-500">Worker Standby</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Worker Belum Ada Sinyal</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">
              {heartbeatFresh
                ? 'Heartbeat Segar (< 5m)'
                : heartbeat?.created_at
                ? formatDateWIB(heartbeat.created_at)
                : 'Belum terdeteksi'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Dipicu oleh Supabase Cron
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium">
              {automationActive ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Otomatisasi Aktif</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-500">Otomatisasi Dijeda</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">
              {automationActive ? 'Siklus Berjalan Normal' : 'Dijeda Sementara'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {automationActive ? 'Generasi & posting terjadwal' : 'Tidak ada aksi otomatis'}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Worker Cycle Verification */}
      <AutomationTest />
    </div>
  )
}
