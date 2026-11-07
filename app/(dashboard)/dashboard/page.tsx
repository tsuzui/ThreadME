import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  ImageIcon,
  Send,
  Layers,
} from 'lucide-react'
import { formatDateWIB } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type AppSettings = Database['public']['Tables']['app_settings']['Row']
type ContentPost = Database['public']['Tables']['content_posts']['Row']
type AutomationRun = Database['public']['Tables']['automation_runs']['Row']

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Fetch app_settings
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('*')
    .eq('singleton', true)
    .single()
  const settings = settingsData as AppSettings | null

  // 2. Fetch last successful published post
  const { data: lastPublishedData } = await supabase
    .from('content_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastPublishedPost = lastPublishedData as ContentPost | null

  // 3. Fetch next scheduled / ready post
  const { data: nextReadyData } = await supabase
    .from('content_posts')
    .select('*')
    .in('status', ['ready', 'generating'])
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .maybeSingle()
  const nextReadyPost = nextReadyData as ContentPost | null

  // 4. Count posts published this month (Asia/Jakarta current month)
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: monthlyPublishedCount } = await supabase
    .from('content_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', firstDayOfMonth)

  // 5. Fetch latest generation result (latest post record)
  const { data: latestPostData } = await supabase
    .from('content_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const latestPost = latestPostData as ContentPost | null

  // 6. Fetch recent automation run
  const { data: latestRunData } = await supabase
    .from('automation_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const latestRun = latestRunData as AutomationRun | null

  const automationActive = settings?.automation_enabled ?? false

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Ikhtisar Otomatisasi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status mesin konten harian Threads (Target publikasi 19:00 WIB).
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                  Akan dibuat otomatis pada siklus generasi 18:40 WIB.
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
              {monthlyPublishedCount ?? 0} <span className="text-sm font-normal text-muted-foreground">post</span>
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
                  AI generator akan memproses pada Phase B.
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
                  Supabase cron belum dijadwalkan (Phase E).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Setup / System Status Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Kesiapan Fondasi Sistem (Phase A)
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Database Supabase
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">Terkoneksi & RLS Aktif</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Topic Studio Schema
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">8 Topik Bawaan Terpasang</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Autentikasi Admin
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">Single-Admin Terproteksi</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              Meta Threads OAuth
            </div>
            <p className="mt-1 text-xs text-foreground font-semibold">Menunggu Phase D</p>
          </div>
        </div>
      </div>
    </div>
  )
}
