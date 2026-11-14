'use client'

import { useState } from 'react'

type ActivityPost = { status: string; scheduled_for: string | null; published_at: string | null; content_type: string }
const localDate = (date: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(date))

export function ActivityChart({ posts, today, unavailable }: { posts: ActivityPost[]; today: string; unavailable: boolean }) {
  const [range, setRange] = useState(7)
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(`${today}T12:00:00+07:00`)
    date.setUTCDate(date.getUTCDate() - range + 1 + index)
    const key = localDate(date.toISOString())
    const published = posts.filter(post => post.status === 'published' && post.published_at && localDate(post.published_at) === key)
    const scheduled = posts.filter(post => post.status === 'ready' && post.scheduled_for && localDate(post.scheduled_for) === key)
    return { key, published: published.length, scheduled: scheduled.length, images: published.filter(post => post.content_type === 'image').length }
  })
  const max = Math.max(1, ...days.map(day => Math.max(day.published, day.scheduled)))
  const published = days.reduce((total, day) => total + day.published, 0)
  const images = days.reduce((total, day) => total + day.images, 0)
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold">Aktivitas Postingan</h2><p className="text-xs text-muted-foreground">Jumlah postingan per tanggal WIB, bukan tayangan Meta.</p></div>
      <div className="flex gap-2">{[7, 30].map(value => <button key={value} type="button" aria-pressed={range === value} onClick={() => setRange(value)} className={`rounded-lg px-3 py-2 text-xs ${range === value ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{value} hari</button>)}</div>
    </div>
    {unavailable ? <p role="alert">Data aktivitas gagal dimuat. Muat ulang dashboard.</p> : <>
      <div className="flex flex-wrap gap-5 text-sm"><span>Terbit: <strong>{published}</strong></span><span>Terjadwal: <strong>{days.reduce((total, day) => total + day.scheduled, 0)}</strong></span><span>Format terbit: {published - images} teks · {images} gambar</span></div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${Math.max(560, range * 32)} 210`} role="img" aria-label={`Grafik aktivitas ${range} hari terakhir`} className="h-56 w-full min-w-[560px]">
          <line x1="0" y1="175" x2="100%" y2="175" className="stroke-border" />
          {days.map((day, index) => {
            const width = Math.max(560, range * 32) / range
            return <g key={day.key}><title>{day.key}: {day.published} terbit, {day.scheduled} terjadwal</title><rect x={index * width + width * .2} y={175 - day.published / max * 145} width={width * .25} height={day.published / max * 145} className="fill-emerald-500" /><rect x={index * width + width * .5} y={175 - day.scheduled / max * 145} width={width * .25} height={day.scheduled / max * 145} className="fill-blue-500" />{(range === 7 || index % 5 === 0) && <text x={index * width + width / 2} y="198" textAnchor="middle" fontSize="10" className="fill-muted-foreground">{day.key.slice(5)}</text>}</g>
          })}
        </svg>
      </div>
      {!days.some(day => day.published || day.scheduled) && <p className="text-sm text-muted-foreground">Belum ada publikasi atau postingan terjadwal pada rentang ini.</p>}
      <p className="text-xs text-muted-foreground">Hijau: terbit · Biru: terjadwal. Draf tanpa jadwal tidak dihitung.</p>
    </>}
  </section>
}
