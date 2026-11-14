import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { ScrollText, AlertTriangle, Info, AlertCircle, Bug, Inbox } from 'lucide-react'
import { formatDateWIB } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type SystemLog = Database['public']['Tables']['system_logs']['Row']

export default async function LogsPage() {
  const supabase = await createClient()

  const { data: rawLogs, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const logs = rawLogs as SystemLog[] | null

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            System Logs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit eksekusi tahap otomatisasi, peralihan state, dan penanganan error.
          </p>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary"><ScrollText className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Jejak aktivitas sistem</h2><p className="mt-0.5 text-xs text-muted-foreground">100 kejadian terakhir, dari yang paling baru.</p></div></div>
        {error ? (
          <div className="p-8 text-center text-sm text-destructive">
            Gagal memuat log sistem: {error.message}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Belum Ada Log Sistem
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Setiap proses otomatisasi harian (generasi, kualitas, validasi, dan publikasi) akan mencatat log di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
                <tr>
                  <th className="px-6 py-4">Waktu (WIB)</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Pesan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {logs.map((log) => {
                  let badgeClass = 'bg-muted text-muted-foreground'
                  let Icon = Info

                  if (log.level === 'error') {
                    badgeClass = 'bg-destructive/10 text-destructive'
                    Icon = AlertCircle
                  } else if (log.level === 'warning') {
                    badgeClass = 'bg-amber-500/10 text-amber-500'
                    Icon = AlertTriangle
                  } else if (log.level === 'debug') {
                    badgeClass = 'bg-muted text-muted-foreground'
                    Icon = Bug
                  }

                  return (
                    <tr key={log.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-6 py-3.5 text-muted-foreground">
                        {formatDateWIB(log.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-sans text-[11px] font-semibold uppercase ${badgeClass}`}>
                          <Icon className="h-3 w-3" />
                          {log.level}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-semibold text-foreground">
                        {log.event}
                      </td>
                      <td className="min-w-[240px] max-w-lg break-words px-6 py-3.5 font-sans leading-relaxed text-foreground">
                        {log.message}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
