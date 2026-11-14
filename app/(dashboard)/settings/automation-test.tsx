'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, AlertCircle, CheckCircle2, Loader2, Play } from 'lucide-react'

const STATE_MESSAGES: Record<string, string> = {
  waiting: 'Worker berjalan normal. Belum ada jadwal yang jatuh tempo; tidak ada postingan yang dipaksakan terbit.',
  generated: 'Draf otomatis berhasil dibuat sesuai jadwal hari ini.',
  publication_processed: 'Antrean publikasi telah diproses oleh worker. Periksa status postingan.',
  dry_run: 'Mode simulasi (dry-run) aktif. Generasi dan publikasi tidak dijalankan ke server Threads live.',
  paused: 'Otomatisasi sedang dijeda secara global pada Pengaturan Sistem.',
  reconnect_required: 'Token Threads kedaluwarsa atau tidak valid. Hubungkan ulang akun Threads.',
  token_refreshed: 'Token akun Threads berhasil diperbarui otomatis.',
}

export function AutomationTest() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function runCycle() {
    if (
      !window.confirm(
        'Jalankan satu siklus worker sekarang? Slot yang sudah jatuh tempo akan diproses. Jadwal mendatang tidak akan dipercepat.'
      )
    ) {
      return
    }

    setPending(true)
    setMessage('')
    setIsError(false)

    try {
      const response = await fetch('/api/automation/trigger-test', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Worker gagal dijalankan.')
      }

      const stateKey = data.result?.state as string | undefined
      setMessage(
        (stateKey && STATE_MESSAGES[stateKey]) ||
          `Status siklus worker: ${stateKey || 'selesai'}`
      )
      router.refresh()
    } catch (err) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : 'Worker gagal dijalankan.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Diagnostik Siklus Worker
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Uji jalannya satu putaran worker cron secara aman. Slot jatuh tempo akan dieksekusi; slot mendatang tetap terlindungi.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={runCycle}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 transition-colors shadow-sm"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Menjalankan siklus...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 text-primary" />
              Jalankan Siklus Sekarang
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          role={isError ? 'alert' : 'status'}
          className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs ${
            isError
              ? 'border border-destructive/20 bg-destructive/10 text-destructive'
              : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isError ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{message}</span>
        </div>
      )}
    </section>
  )
}
