import { createClient } from '@/lib/supabase/server'
import type { Database, ContentStatus } from '@/types/database'
import {
  Calendar,
  ExternalLink,
  Eye,
  Send,
  Users,
  AlertTriangle,
  Sparkles,
  Heart,
  MessageCircle,
  Repeat,
  Quote,
  ShieldAlert,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { formatDateWIB, getTodayDateWIB } from '@/lib/utils'
import { ActivityChart, type ActivityPost } from './activity-chart'
import { DashboardPreviewAction } from './preview-action'
import { getThreadsInsights, type ThreadsInsightsData } from '@/lib/threads/insights'

export const dynamic = 'force-dynamic'

type AppSettings = Database['public']['Tables']['app_settings']['Row']
type ContentPost = Database['public']['Tables']['content_posts']['Row']
type ScheduleSlot = Database['public']['Tables']['schedule_slots']['Row']
type SocialAccount = Database['public']['Tables']['social_accounts']['Row']
type ContentTopic = Database['public']['Tables']['content_topics']['Row']
type SystemLog = Database['public']['Tables']['system_logs']['Row']

interface PostStatusBadge {
  label: string
  className: string
}

function getPostStatusBadge(status: ContentStatus, scheduledFor: string | null): PostStatusBadge {
  if (status === 'published') {
    return {
      label: 'Terbit',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    }
  }
  if (status === 'ready') {
    if (scheduledFor) {
      return {
        label: 'Terjadwal',
        className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      }
    }
    return {
      label: 'Draf',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    }
  }
  if (status === 'generating') {
    return {
      label: 'Membuat Konten',
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    }
  }
  if (status === 'publishing') {
    return {
      label: 'Menerbitkan',
      className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    }
  }
  if (status === 'failed') {
    return {
      label: 'Gagal',
      className: 'bg-destructive/10 text-destructive border border-destructive/20',
    }
  }
  if (status === 'skipped') {
    return {
      label: 'Dilewati',
      className: 'bg-muted text-muted-foreground border border-border',
    }
  }
  if (status === 'publish_unknown') {
    return {
      label: 'Status Belum Pasti',
      className: 'bg-destructive/10 text-destructive border border-destructive/20',
    }
  }
  return {
    label: status,
    className: 'bg-muted text-muted-foreground border border-border',
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const today = getTodayDateWIB()
  const firstDayOfMonth = `${today.slice(0, 7)}-01T00:00:00+07:00`
  const thirtyDaysAgo = new Date(`${today}T00:00:00+07:00`)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  const [
    settingsResult,
    countResult,
    recentResult,
    slotResult,
    accountResult,
    heartbeatResult,
    published30Result,
    upcomingReadyResult,
    topicsResult,
    insights,
  ] = await Promise.all([
    supabase.from('app_settings').select('*').eq('singleton', true).single(),
    supabase
      .from('content_posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', firstDayOfMonth)
      .lte('published_at', nowIso),
    supabase
      .from('content_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('schedule_slots')
      .select('*')
      .eq('lifecycle', 'scheduled')
      .gte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('social_accounts')
      .select('*')
      .eq('platform', 'threads')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('system_logs')
      .select('*')
      .eq('event', 'automation_heartbeat')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('content_posts')
      .select('id, status, scheduled_for, published_at, content_type, topic_id, pillar')
      .eq('status', 'published')
      .gte('published_at', thirtyDaysAgoIso)
      .lte('published_at', nowIso),
    supabase
      .from('content_posts')
      .select('id, status, scheduled_for, published_at, content_type, topic_id, pillar')
      .eq('status', 'ready')
      .gte('scheduled_for', nowIso),
    supabase.from('content_topics').select('id, name, slug'),
    getThreadsInsights().catch(
      (): ThreadsInsightsData => ({
        status: 'error',
        message: 'Insight Threads belum dapat dimuat saat ini.',
      })
    ),
  ])

  const settings = settingsResult.data as AppSettings | null
  const recentPosts = (recentResult.data as ContentPost[] | null) || []
  const nextSlot = slotResult.data as ScheduleSlot | null
  const nextPostResult = nextSlot
    ? await supabase.from('content_posts').select('id, status').eq('slot_id', nextSlot.id).maybeSingle()
    : null
  const nextPost = nextPostResult?.data as Pick<ContentPost, 'id' | 'status'> | null | undefined
  const account = accountResult.data as SocialAccount | null
  const heartbeat = heartbeatResult.data as SystemLog | null
  const published30Posts = (published30Result.data as ContentPost[] | null) || []
  const upcomingReadyPosts = (upcomingReadyResult.data as ContentPost[] | null) || []
  const topics = (topicsResult.data as ContentTopic[] | null) || []

  const automationActive = settings?.automation_enabled ?? false
  const publishLive = process.env.THREADS_PUBLISH_MODE === 'live'
  const tokenValid =
    !!account?.token_expires_at && Date.parse(account.token_expires_at) > now.getTime()
  const heartbeatTimestamp = heartbeat?.created_at
  const heartbeatFresh =
    !!heartbeatTimestamp && now.getTime() - Date.parse(heartbeatTimestamp) < 5 * 60_000

  // Combine published past posts + upcoming ready posts for ActivityChart
  const activityPosts: ActivityPost[] = [
    ...published30Posts.map((p) => ({
      status: p.status,
      scheduled_for: p.scheduled_for,
      published_at: p.published_at,
      content_type: p.content_type,
    })),
    ...upcomingReadyPosts.map((p) => ({
      status: p.status,
      scheduled_for: p.scheduled_for,
      published_at: p.published_at,
      content_type: p.content_type,
    })),
  ]
  const activityUnavailable = !!published30Result.error || !!upcomingReadyResult.error

  // Actionable warnings for unhealthy worker / token / dry-run / paused
  const warnings: Array<{ id: string; title: string; message: string; href: string; action: string }> = []

  if (!account || !account.is_active || !tokenValid) {
    warnings.push({
      id: 'token',
      title: 'Koneksi Threads Perlu Perhatian',
      message: !account
        ? 'Akun Threads belum terhubung. Hubungkan akun di Pengaturan untuk mengaktifkan otomatisasi.'
        : !tokenValid
        ? 'Token akses akun Threads telah kedaluwarsa. Lakukan refresh atau hubungkan ulang akun.'
        : 'Akun Threads saat ini nonaktif.',
      href: '/settings',
      action: 'Kelola Akun di Pengaturan',
    })
  }

  if (!automationActive) {
    warnings.push({
      id: 'paused',
      title: 'Otomatisasi Sedang Dijeda',
      message:
        'Siklus pembuatan konten dan penerbitan terjadwal dinonaktifkan sementara. Tidak ada postingan yang akan dibuat atau diterbitkan secara otomatis.',
      href: '/settings',
      action: 'Aktifkan Otomatisasi',
    })
  }

  if (!publishLive) {
    warnings.push({
      id: 'dry-run',
      title: 'Mode Simulasi (Dry-Run) Aktif',
      message:
        'Sistem berjalan dalam mode simulasi. Generasi draf berjalan, tetapi postingan tidak akan dipublikasikan ke Meta Threads nyata.',
      href: '/settings',
      action: 'Periksa Pengaturan',
    })
  }

  if (!heartbeatFresh) {
    warnings.push({
      id: 'worker',
      title: 'Worker Otomatisasi Standby',
      message: heartbeatTimestamp
        ? `Sinyal heartbeat worker terakhir diterima pada ${formatDateWIB(heartbeatTimestamp)} WIB (> 5 menit lalu). Worker dipicu oleh Supabase Cron saat siklus aktif.`
        : 'Belum ada sinyal heartbeat worker yang tercatat di sistem.',
      href: '/logs',
      action: 'Lihat System Logs',
    })
  }

  // Topic distribution calculation for published posts in the last 30 days
  const topicMap = new Map<string, string>()
  topics.forEach((t) => topicMap.set(t.id, t.name))

  const topicCountMap = new Map<string, { label: string; count: number }>()
  published30Posts.forEach((post) => {
    const topicKey = post.topic_id || post.pillar || 'Lainnya'
    const topicLabel = post.topic_id
      ? topicMap.get(post.topic_id) || post.pillar || 'Topik Kustom'
      : post.pillar || 'Umum'

    const existing = topicCountMap.get(topicKey)
    if (existing) {
      existing.count += 1
    } else {
      topicCountMap.set(topicKey, { label: topicLabel, count: 1 })
    }
  })

  const topicDistribution = Array.from(topicCountMap.values()).sort((a, b) => b.count - a.count)
  const published30Total = published30Posts.length

  // KPI calculations
  const monthlyPublishedCount = countResult.count ?? 0

  const followersCount =
    insights.profile?.followers_count ?? insights.metrics?.followersCount
  const viewsCount = insights.metrics?.views

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Ringkasan workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Konten Anda, dalam satu pandangan.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pantau jangkauan, tinjau draf, dan jaga ritme publikasi Anda.</p>
      </div>
      {/* Compact Account Header */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar or Initials */}
            <div className="relative shrink-0">
              {insights.profile?.threads_profile_picture_url ? (
                <img
                  src={insights.profile.threads_profile_picture_url}
                  alt={insights.profile.name || account?.username || 'Threads'}
                  className="h-12 w-12 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary border border-primary/20">
                  {(insights.profile?.username || account?.username || 'TH').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                  account?.is_active && tokenValid ? 'bg-emerald-500' : 'bg-destructive'
                }`}
                title={account?.is_active && tokenValid ? 'Akun aktif' : 'Perlu perhatian'}
              />
            </div>

            {/* Account Info */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground truncate">
                  {insights.profile?.name || (account?.username ? `@${account.username}` : 'Akun Threads')}
                </h2>
                {account?.username && (
                  <a
                    href={`https://www.threads.net/@${account.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    @{account.username}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    account?.is_active && tokenValid
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {account?.is_active && tokenValid ? 'Terhubung & Aktif' : 'Perlu Perhatian'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Mode:{' '}
                  <strong className="font-semibold text-foreground">
                    {publishLive ? 'Live Publikasi' : 'Dry-Run'}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Otomatisasi:{' '}
                  <strong className="font-semibold text-foreground">
                    {automationActive ? 'Aktif' : 'Dijeda'}
                  </strong>
                </span>
                {account?.token_expires_at && (
                  <>
                    <span>·</span>
                    <span className="truncate">
                      Token s/d {formatDateWIB(account.token_expires_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            <DashboardPreviewAction />
            <Link
              href="/posts/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Buat Postingan
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              Pengaturan
            </Link>
          </div>
        </div>
      </section>

      {/* Actionable Warnings for Unhealthy States */}
      {warnings.length > 0 && (
        <section aria-label="Peringatan Status Sistem" className="space-y-2.5">
          {warnings.map((w) => (
            <div
              key={w.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-bold text-foreground">{w.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {w.message}
                  </p>
                </div>
              </div>
              <Link
                href={w.href}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-amber-500/10"
              >
                {w.action} &rarr;
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* 4 KPI Cards */}
      <section aria-label="Indikator Utama" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Terbit Bulan Ini */}
        <div className="rounded-2xl border border-[#f9dce5] bg-[#fff0f3] p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Terbit Bulan Ini
            </span>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {countResult.error ? (
                <span className="text-sm font-normal text-muted-foreground">Tidak tersedia</span>
              ) : (
                `${monthlyPublishedCount.toLocaleString('id-ID')} post`
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Periode {today.slice(0, 7)} · Waktu lokal WIB
            </p>
          </div>
        </div>

        {/* KPI 2: Followers */}
        <div className="rounded-2xl border border-[#f8e4cd] bg-[#fff5e9] p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Followers
            </span>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {insights.status === 'ok' && followersCount !== undefined ? (
                followersCount.toLocaleString('id-ID')
              ) : insights.status === 'scope_missing' ? (
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Perlu izin
                </span>
              ) : (
                <span className="text-sm font-normal text-muted-foreground">Tidak tersedia</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {insights.status === 'ok'
                ? `Pengikut resmi @${account?.username || 'threads'}`
                : insights.status === 'scope_missing'
                ? 'Izin threads_manage_insights belum aktif'
                : 'Data profil Threads belum terhubung'}
            </p>
          </div>
        </div>

        {/* KPI 3: Views */}
        <div className="rounded-2xl border border-[#d5f0df] bg-[#eafaf0] p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Views (Tayangan)
            </span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {insights.status === 'ok' && viewsCount !== undefined ? (
                viewsCount.toLocaleString('id-ID')
              ) : insights.status === 'scope_missing' ? (
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Perlu izin
                </span>
              ) : (
                <span className="text-sm font-normal text-muted-foreground">Tidak tersedia</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {insights.status === 'ok'
                ? 'Agregat tayangan resmi Meta API'
                : insights.status === 'scope_missing'
                ? 'Hubungkan ulang akun untuk metrik view'
                : 'Belum ada data insight'}
            </p>
          </div>
        </div>

        {/* KPI 4: Slot Berikutnya (derived from actual schedule_slots) */}
        <div className="rounded-2xl border border-[#e8ddfa] bg-[#f3edff] p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Slot Berikutnya
            </span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {slotResult.error ? (
              <div className="text-sm text-destructive">Gagal memuat slot</div>
            ) : nextSlot ? (
              <div>
                <div className="text-base font-bold text-foreground">
                  {formatDateWIB(nextSlot.scheduled_for)} WIB
                </div>
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {nextPostResult?.error ? (
                    <span>Status draf tidak tersedia</span>
                  ) : nextPost ? (
                    <Link href={`/posts/${nextPost.id}`} className="font-medium text-primary hover:underline">
                      {nextPost.status === 'ready' ? 'Draf siap untuk rilis' : getPostStatusBadge(nextPost.status, nextSlot.scheduled_for).label}
                    </Link>
                  ) : nextSlot.generate_after ? (
                    <span>
                      Generasi draf: {formatDateWIB(nextSlot.generate_after)} WIB
                    </span>
                  ) : (
                    <span>Slot aktif ({nextSlot.source})</span>
                  )}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-base font-semibold text-foreground">
                  Belum ada slot
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kelola jadwal di menu Kalender
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Activity Chart (Past 7/30 days published + active today queue) */}
      <ActivityChart
        posts={activityPosts}
        today={today}
        unavailable={activityUnavailable}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {/* Recent 6 Posts with True Status Semantics */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Postingan Terbaru</h2>
            <p className="text-xs text-muted-foreground">
              Enam postingan terbaru berdasarkan waktu pembuatan draf.
            </p>
          </div>
          <Link
            href="/posts"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Lihat semua &rarr;
          </Link>
        </div>

        {recentResult.error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Gagal memuat postingan: {recentResult.error.message}
          </p>
        ) : recentPosts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada postingan yang dibuat.
            </p>
            <Link
              href="/posts/new"
              className="mt-2 inline-block text-xs font-semibold text-primary underline"
            >
              Mulai buat postingan baru
            </Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {recentPosts.map((post) => {
              const badge = getPostStatusBadge(post.status, post.scheduled_for)
              const hasRealPermalink =
                post.threads_permalink &&
                typeof post.threads_permalink === 'string' &&
                post.threads_permalink.startsWith('http')

              return (
                <div
                  key={post.id}
                  className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {post.pillar && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {post.pillar}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {post.content_type === 'image' ? 'Teks + Gambar' : 'Teks'}
                      </span>
                    </div>

                    <Link
                      href={`/posts/${post.id}`}
                      className="block text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                    >
                      {post.content || 'Konten draf belum tersedia'}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {post.status === 'published' && post.published_at ? (
                        <span>Terbit: {formatDateWIB(post.published_at)} WIB</span>
                      ) : post.scheduled_for ? (
                        <span>
                          Rencana rilis: {formatDateWIB(post.scheduled_for)} WIB
                          {Date.parse(post.scheduled_for) < now.getTime() &&
                            post.status !== 'published' && (
                              <span className="text-amber-500 font-medium"> (Jadwal lewat)</span>
                            )}
                        </span>
                      ) : (
                        <span>Dibuat: {formatDateWIB(post.created_at)} WIB (Tanpa jadwal)</span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Editor Link + Optional Threads Link */}
                  <div className="flex shrink-0 items-center gap-3 text-xs sm:self-center">
                    <Link
                      href={`/posts/${post.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {post.status === 'ready' ? 'Edit draf' : 'Detail'}
                    </Link>

                    {hasRealPermalink && (
                      <a
                        href={post.threads_permalink!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Buka Threads
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Two-Column Section: Topic Distribution (Last 30 Days) & Threads Engagement Breakdown */}
      <div className="grid min-w-0 gap-6">
        {/* Topic Distribution of Published Posts (Last 30 Days) */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Distribusi Topik Terbit
              </h2>
              <span className="text-xs font-mono text-muted-foreground">
                30 Hari Terakhir
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Proporsi pilar konten dari {published30Total} postingan terbit (
              {formatDateWIB(thirtyDaysAgoIso).slice(0, 11)} – {formatDateWIB(nowIso).slice(0, 11)}).
            </p>
          </div>

          {published30Result.error ? (
            <p role="alert" className="text-sm text-destructive">
              Gagal memuat distribusi topik.
            </p>
          ) : published30Total === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Belum ada postingan yang dipublikasikan dalam 30 hari terakhir.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {topicDistribution.map((item) => {
                const percent = Math.round((item.count / published30Total) * 100)
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {item.count} post ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Engagement Breakdown from Official Aggregate Insights */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Interaksi Akun Threads
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Data resmi dari Meta Threads API. Angka mencerminkan total akumulasi akun saat ini.
              </p>
            </div>
            {insights.cachedAt && (
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                Cache: {formatDateWIB(insights.cachedAt)}
              </span>
            )}
          </div>

          {insights.status === 'ok' && insights.metrics ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Likes */}
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Likes</span>
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                </div>
                <div className="mt-2 text-lg font-bold font-mono text-foreground">
                  {insights.metrics.likes.toLocaleString('id-ID')}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Total suka</p>
              </div>

              {/* Replies */}
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Replies</span>
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="mt-2 text-lg font-bold font-mono text-foreground">
                  {insights.metrics.replies.toLocaleString('id-ID')}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Balasan &amp; diskusi</p>
              </div>

              {/* Reposts */}
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Reposts</span>
                  <Repeat className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="mt-2 text-lg font-bold font-mono text-foreground">
                  {insights.metrics.reposts.toLocaleString('id-ID')}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Dibagikan ulang</p>
              </div>

              {/* Quotes */}
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold">Quotes</span>
                  <Quote className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="mt-2 text-lg font-bold font-mono text-foreground">
                  {insights.metrics.quotes.toLocaleString('id-ID')}
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Dikutip pengguna</p>
              </div>
            </div>
          ) : insights.status === 'scope_missing' ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Izin Insight (threads_manage_insights) Belum Diberikan
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    Akun saat ini hanya terhubung dengan izin dasar. Untuk menampilkan metrik interaksi resmi, lakukan otorisasi ulang di Pengaturan.
                  </p>
                </div>
              </div>
              <div className="pt-1">
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline"
                >
                  Hubungkan ulang akun di Pengaturan &rarr;
                </Link>
              </div>
            </div>
          ) : insights.status === 'not_connected' ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground flex items-center justify-between">
              <span>Akun Threads belum terhubung. Hubungkan untuk memantau metrik.</span>
              <Link href="/settings" className="font-semibold text-primary underline">
                Pengaturan &rarr;
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
              {insights.message || 'Data metrik interaksi belum tersedia dari Threads API.'}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Catatan: Metrik di atas merupakan agregat akun resmi dari Meta, bukan tren mingguan atau angka per postingan.
          </p>
        </section>
      </div>
      </div>
    </div>
  )
}
