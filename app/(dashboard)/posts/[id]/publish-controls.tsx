'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Preview = { mediaType: string; text: string; imageUrl: string | null }

export function PublishControls({ id, version, liveEnabled, resume = false }: { id: string; version: string; liveEnabled: boolean; resume?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(mode: 'dry-run' | 'live') {
    setPending(true); setError(''); setMessage(''); setPreview(null)
    try {
      const response = await fetch(`/api/posts/${id}/publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, mode, confirmed: mode === 'live' && confirmed }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Gagal memproses publikasi.')
      if (mode === 'dry-run') {
        setPreview(result.preview)
        setMessage('Simulasi berhasil. Tidak ada permintaan ke Meta atau perubahan pada draf.')
      } else {
        setMessage(result.message)
        setConfirmed(false)
        router.refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Koneksi gagal. Silakan muat ulang.')
      if (mode === 'live') router.refresh()
    } finally { setPending(false) }
  }

  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <h2 className="text-base font-semibold">Publikasi Threads</h2>
    <p className="text-sm text-muted-foreground">Simulasi menggunakan draf yang sudah tersimpan. Simpan perubahan editor terlebih dahulu.</p>
    {!liveEnabled && <p className="text-xs text-muted-foreground">Mode aman aktif. Publikasi sungguhan dinonaktifkan di konfigurasi server.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    {preview && <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold">{preview.mediaType === 'IMAGE' ? 'Teks dengan gambar manual' : 'Teks saja'}</p>
      <p className="whitespace-pre-wrap break-words text-sm">{preview.text}</p>
      {preview.imageUrl && <img src={preview.imageUrl} alt="Lampiran yang akan dikirim ke Threads" className="max-h-64 max-w-full rounded-lg object-contain" />}
    </div>}
    {!resume && <button type="button" disabled={pending} onClick={() => submit('dry-run')}
      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">{pending ? 'Memproses…' : 'Simulasikan publikasi'}</button>}
    {liveEnabled && <div className="space-y-3 border-t border-border pt-4">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} className="mt-1" />
        Saya ingin menerbitkan draf tersimpan ke akun Threads sekarang, tanpa menunggu jadwal.
      </label>
      <button type="button" disabled={pending || !confirmed} onClick={() => submit('live')}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Terbitkan sekarang</button>
    </div>}
  </section>
}
