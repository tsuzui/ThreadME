'use client'
import { useState } from 'react'

export function PublishStatus({ id }: { id: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ containerStatus: string | null; confirmedMediaId: string | null; message: string; recent: { id: string; text: string; timestamp: string | null }[] } | null>(null)
  async function check() {
    setPending(true); setError(''); setResult(null)
    try {
      const response = await fetch(`/api/posts/${id}/publish-status`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal memeriksa publikasi.')
      setResult(data)
    } catch (error) { setError(error instanceof Error ? error.message : 'Koneksi gagal.') }
    finally { setPending(false) }
  }
  return <section className="space-y-3 rounded-xl border border-border p-4">
    <p className="text-sm">Jangan mengirim ulang publikasi yang hasilnya belum pasti. Pemeriksaan berikut tidak menerbitkan atau mengubah status draf.</p>
    <button type="button" disabled={pending} onClick={check} className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">{pending ? 'Memeriksa…' : 'Periksa hasil di Threads'}</button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result && <div className="space-y-2 text-sm" role="status">
      <p>Status container: {result.containerStatus || 'Belum tercatat'}</p>
      {result.confirmedMediaId && <p>ID publikasi terkonfirmasi: {result.confirmedMediaId}</p>}
      <p className="text-xs text-muted-foreground">{result.message}</p>
      {result.recent.length > 0 && <details><summary className="cursor-pointer">Lihat postingan terbaru untuk pemeriksaan manual</summary><ul className="mt-2 space-y-2">{result.recent.map(post => <li key={post.id} className="break-words rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{post.id} · {post.timestamp}</p><p className="whitespace-pre-wrap">{post.text}</p></li>)}</ul></details>}
    </div>}
  </section>
}
