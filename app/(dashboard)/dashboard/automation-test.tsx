'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const messages: Record<string, string> = {
  waiting: 'Worker berjalan. Belum ada jadwal yang jatuh tempo; tidak ada postingan yang dipaksakan terbit.',
  generated: 'Draf otomatis berhasil dibuat. Publikasi mengikuti jadwalnya.',
  publication_processed: 'Antrean publikasi telah diproses. Periksa status postingan.',
  dry_run: 'Mode dry-run aktif. Generasi dan publikasi tidak dijalankan.',
  paused: 'Otomatisasi sedang dinonaktifkan.',
  reconnect_required: 'Hubungkan ulang akun Threads sebelum melanjutkan.',
  token_refreshed: 'Token akun berhasil diperbarui.',
}

export function AutomationTest() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  async function run() {
    if (!window.confirm('Jalankan satu siklus worker? Postingan yang sudah jatuh tempo dapat langsung dipublikasikan ke Threads. Jadwal mendatang tidak dipercepat.')) return
    setPending(true)
    setMessage('')
    setError(false)
    try {
      const response = await fetch('/api/automation/trigger-test', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Worker gagal dijalankan.')
      setMessage(messages[data.result?.state] || `Status worker: ${data.result?.state || 'tidak diketahui'}`)
      router.refresh()
    } catch (err) {
      setError(true)
      setMessage(err instanceof Error ? err.message : 'Worker gagal dijalankan.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Periksa Siklus Otomatisasi</h2>
          <p className="text-xs text-muted-foreground mt-1">Menjalankan worker sesuai jadwal, bukan memaksa generasi sebelum waktunya. Antrean jatuh tempo dapat terbit live.</p>
        </div>
        <button type="button" disabled={pending} onClick={run} className="shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
          {pending ? 'Memeriksa worker…' : 'Jalankan Siklus Sekarang'}
        </button>
      </div>
      {message && <p role={error ? 'alert' : 'status'} className={`text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
    </div>
  )
}
