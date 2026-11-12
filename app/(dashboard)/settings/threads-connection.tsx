'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Account = { username: string | null; external_user_id: string; is_active: boolean; token_expires_at: string | null; connected_at: string; last_token_refresh_at: string | null }

export function ThreadsConnection({ account, configurationError, loadError, outcome }: { account: Account | null; configurationError: string | null; loadError: boolean; outcome?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [disconnectConfirmed, setDisconnectConfirmed] = useState(false)
  const expired = account?.is_active && (!account.token_expires_at || Date.parse(account.token_expires_at) <= Date.now())
  const canRefresh = account?.is_active && !expired && Date.now() - Date.parse(account.last_token_refresh_at || account.connected_at) >= 86_400_000
  async function action(name: 'connect' | 'refresh' | 'disconnect') {
    setPending(true); setError(''); setSuccess('')
    try {
      const response = await fetch(`/api/threads/${name}`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Permintaan gagal.')
      if (name === 'connect') {
        const url = new URL(result.url)
        if (url.origin !== 'https://threads.com' || url.pathname !== '/oauth/authorize') throw new Error('Alamat otorisasi tidak valid.')
        window.location.assign(url.href)
      } else { setSuccess(name === 'refresh' ? 'Token berhasil diperbarui.' : 'Koneksi lokal dilepas. Izin aplikasi di Meta dapat dicabut melalui pengaturan Threads.'); setDisconnectConfirmed(false); router.refresh() }
    } catch (error) { setError(error instanceof Error ? error.message : 'Koneksi gagal.') }
    finally { setPending(false) }
  }
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <h2 className="text-base font-semibold">Koneksi Threads API</h2>
    <p className="text-sm text-muted-foreground">OAuth resmi Meta. Kata sandi tidak disimpan; token dienkripsi di server.</p>
    {configurationError && <p className="text-sm text-amber-600">{configurationError}</p>}
    {loadError && <p role="alert" className="text-sm text-destructive">Gagal membaca koneksi Threads. Muat ulang atau periksa migration database.</p>}
    {outcome === 'connected' && <p role="status" className="text-sm text-emerald-600">Akun Threads berhasil dihubungkan.</p>}
    {outcome === 'failed' && <p role="alert" className="text-sm text-destructive">Koneksi belum berhasil. Periksa konfigurasi Meta, sesi login, izin akun tester, dan migration. Lepas akun lama sebelum mengganti identitas akun.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="text-sm">{success}</p>}
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-sm font-semibold">{account ? `@${account.username || account.external_user_id}` : 'Belum ada akun Threads terhubung'}</p>
      <p className="text-xs text-muted-foreground">{account?.is_active ? expired ? 'Token kedaluwarsa — hubungkan ulang.' : 'Koneksi aktif' : account ? 'Koneksi nonaktif' : 'Hubungkan akun pemilik untuk mengaktifkan publikasi.'}</p>
      {account?.token_expires_at && <p className="text-xs text-muted-foreground">Token berlaku sampai {new Date(account.token_expires_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.</p>}
    </div>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={pending || !!configurationError || loadError} onClick={() => action('connect')} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? 'Memproses…' : account?.is_active ? 'Hubungkan ulang' : 'Hubungkan Threads'}</button>
      {account?.is_active && <button type="button" disabled={pending || !canRefresh || !!configurationError} onClick={() => action('refresh')} className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">Perbarui token</button>}
    </div>
    {account?.is_active && <>
      <p className="text-xs text-muted-foreground">Token dapat diperbarui setelah berumur 24 jam. Saat otomatisasi live aktif, worker memperbaruinya dalam tujuh hari sebelum kedaluwarsa.</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={disconnectConfirmed} disabled={pending} onChange={event => setDisconnectConfirmed(event.target.checked)} className="mt-1" />Saya ingin melepas koneksi akun ini dari ThreadMe.</label>
      <button type="button" disabled={pending || !disconnectConfirmed} onClick={() => action('disconnect')} className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">Lepas koneksi</button>
    </>}
    <p className="text-xs text-muted-foreground">Publikasi memerlukan mode live di server. Sakelar otomatisasi mengatur tindakan terjadwal; publikasi manual tetap memerlukan konfirmasi.</p>
  </section>
}
