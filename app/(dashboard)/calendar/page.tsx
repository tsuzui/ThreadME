import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getTodayDateWIB } from '@/lib/utils'
import type { Database } from '@/types/database'
import { Calendar as CalendarIcon, Clock, Sparkles, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ContentPost = Database['public']['Tables']['content_posts']['Row']

export default async function CalendarPage() {
  const supabase = await createClient()

  const today = new Date(`${getTodayDateWIB()}T12:00:00+07:00`)
  const dates = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() + (i - 3) * 86400000).toISOString().slice(0, 10))
  const [postsResult, settingsResult] = await Promise.all([
    supabase.from('content_posts').select('*').gte('scheduled_date', dates[0]).lte('scheduled_date', dates[6]),
    supabase.from('app_settings').select('posting_time').eq('singleton', true).single(),
  ])
  const { data: rawPosts, error } = postsResult
  const { data: settings } = settingsResult
  const postingTime = (settings as { posting_time: string } | null)?.posting_time.slice(0, 5) || '19:00'
  const posts = (rawPosts as ContentPost[] | null) || []
  const days = []

  for (let i = -3; i <= 3; i++) {
    const d = new Date(today.getTime() + i * 86400000)
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)

    const label = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d)

    const postForDay = posts.find((p) => p.scheduled_date === dateStr)

    days.push({
      dateStr,
      label,
      isToday: i === 0,
      post: postForDay,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Kalender Konten
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Satu postingan per hari · target {postingTime} WIB. Buka draf untuk mengedit teks atau menambah gambar manual.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">Gagal memuat kalender. Silakan muat ulang halaman.</p>}
      {/* 7-Day Window View */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all ${
              day.isToday
                ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-card'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {day.label}
                </span>
                {day.isToday && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Hari Ini
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs font-mono text-muted-foreground">
                {day.dateStr}
              </div>

              <div className="mt-4">
                {day.post ? (
                  <div className="space-y-2">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        day.post.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {day.post.status}
                    </span>
                    {day.post.image_public_url && <img src={day.post.image_public_url} alt={day.post.image_alt_text || 'Lampiran postingan'} className="w-full rounded-lg object-cover aspect-square" />}
                    <p className="line-clamp-3 text-xs text-foreground font-medium">
                      {day.post.content}
                    </p>
                    <span className="block text-[10px] text-muted-foreground font-mono">
                      {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date(day.post.scheduled_for))} WIB • {day.post.content_type}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground">
                    <Clock className="mx-auto h-4 w-4 text-muted-foreground/60 mb-1" />
                    Belum ada draf · {postingTime} WIB
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-border/60 pt-2 text-[11px] text-muted-foreground flex items-center justify-between">
              {day.post ? <Link href={`/posts/${day.post.id}`} className="font-semibold text-primary hover:underline">{day.post.status === 'ready' ? 'Edit draf' : 'Lihat postingan'}</Link> : <span>Maks 1 Post</span>}
              {day.post?.status === 'published' && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Aturan Idempotensi Kalender
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Sistem ThreadMe menerapkan constraint database <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">scheduled_date UNIQUE</code>. Hal ini menjamin tidak akan terjadi posting ganda pada satu hari kalender Asia/Jakarta, bahkan jika cron scheduler terpicu berulang kali.
        </p>
      </div>
    </div>
  )
}
