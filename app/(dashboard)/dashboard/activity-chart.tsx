'use client'

import { useState } from 'react'

export interface ActivityPost {
  status: string
  scheduled_for?: string | null
  published_at?: string | null
  content_type: string
}

const localDate = (date: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(date))

export function ActivityChart({
  posts,
  today,
  unavailable,
}: {
  posts: ActivityPost[]
  today: string
  unavailable: boolean
}) {
  const [range, setRange] = useState<7 | 30>(7)
  const nowMs = Date.now()

  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(`${today}T12:00:00+07:00`)
    date.setUTCDate(date.getUTCDate() - range + 1 + index)
    const key = localDate(date.toISOString())
    const isPast = key < today
    const isToday = key === today

    const published = posts.filter(
      (post) =>
        post.status === 'published' &&
        post.published_at &&
        localDate(post.published_at) === key
    )

    // Only count scheduled posts for today if the schedule is still active (not passed)
    // Past ready posts must never be counted or implied as an active queue
    const scheduled = isPast
      ? []
      : posts.filter(
          (post) =>
            post.status === 'ready' &&
            post.scheduled_for &&
            localDate(post.scheduled_for) === key &&
            Date.parse(post.scheduled_for) >= nowMs
        )

    return {
      key,
      isToday,
      published: published.length,
      scheduled: scheduled.length,
      images: published.filter((post) => post.content_type === 'image').length,
    }
  })

  const maxVal = Math.max(1, ...days.map((day) => Math.max(day.published, day.scheduled)))
  const totalPublished = days.reduce((sum, day) => sum + day.published, 0)
  const totalImages = days.reduce((sum, day) => sum + day.images, 0)
  const todayScheduled = days.find((day) => day.isToday)?.scheduled ?? 0

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Aktivitas Postingan</h2>
          <p className="text-xs text-muted-foreground">
            Volume publikasi historis per tanggal (WIB). Draf masa lalu tidak dihitung sebagai antrean.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
          <button
            type="button"
            aria-pressed={range === 7}
            onClick={() => setRange(7)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              range === 7
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            7 hari
          </button>
          <button
            type="button"
            aria-pressed={range === 30}
            onClick={() => setRange(30)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              range === 30
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30 hari
          </button>
        </div>
      </div>

      {unavailable ? (
        <p role="alert" className="text-sm text-destructive">
          Data aktivitas gagal dimuat. Muat ulang halaman untuk mencoba kembali.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">
              Terbit:{' '}
              <strong className="font-semibold text-foreground">
                {totalPublished.toLocaleString('id-ID')}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Antrean hari ini:{' '}
              <strong className="font-semibold text-foreground">
                {todayScheduled.toLocaleString('id-ID')}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Format terbit: {totalPublished - totalImages} teks · {totalImages} gambar
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${Math.max(560, range * 32)} 200`}
              role="img"
              aria-label={`Grafik aktivitas postingan ${range} hari terakhir`}
              className="h-60 w-full min-w-[560px]"
            >
              {[30, 75, 120].map(y => <line key={y} x1="0" y1={y} x2="100%" y2={y} className="stroke-border" strokeDasharray="4 5" strokeWidth="1" />)}
              <line x1="0" y1="165" x2="100%" y2="165" className="stroke-border" strokeWidth="1" />
              {days.map((day, index) => {
                const totalWidth = Math.max(560, range * 32)
                const colWidth = totalWidth / range
                const pubHeight = (day.published / maxVal) * 135
                const schedHeight = (day.scheduled / maxVal) * 135

                return (
                  <g key={day.key}>
                    <title>{`${day.key}${day.isToday ? ' (Hari ini)' : ''}: ${day.published} terbit${day.scheduled > 0 ? `, ${day.scheduled} terjadwal hari ini` : ''}`}</title>
                    {/* Published Bar (Green) */}
                    {day.published > 0 && (
                      <rect
                        x={index * colWidth + colWidth * 0.2}
                        y={165 - pubHeight}
                        width={colWidth * 0.28}
                        height={pubHeight}
                        rx="2"
                        className="fill-cyan-500"
                      />
                    )}
                    {/* Active Today Queue Bar (Blue) */}
                    {day.scheduled > 0 && (
                      <rect
                        x={index * colWidth + colWidth * 0.52}
                        y={165 - schedHeight}
                        width={colWidth * 0.28}
                        height={schedHeight}
                        rx="2"
                        className="fill-blue-500"
                      />
                    )}
                    {/* Baseline indicator for days with 0 activity */}
                    {day.published === 0 && day.scheduled === 0 && (
                      <circle
                        cx={index * colWidth + colWidth * 0.5}
                        cy="165"
                        r="1.5"
                        className="fill-muted-foreground/30"
                      />
                    )}
                    {/* Date label */}
                    {(range === 7 || index % 5 === 0 || index === range - 1) && (
                      <text
                        x={index * colWidth + colWidth / 2}
                        y="186"
                        textAnchor="middle"
                        fontSize="10"
                        className={`font-mono ${
                          day.isToday
                            ? 'fill-foreground font-bold'
                            : 'fill-muted-foreground'
                        }`}
                      >
                        {day.key.slice(5)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />
                Terbit (riwayat)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                Antrean aktif hari ini
              </span>
            </div>
            <span>Jadwal berbasis waktu lokal Asia/Jakarta (WIB)</span>
          </div>
        </>
      )}
    </section>
  )
}
