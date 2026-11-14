'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Tag } from 'lucide-react'
import type { Database } from '@/types/database'

type Topic = Database['public']['Tables']['content_topics']['Row']
type Fields = Pick<Topic, 'name' | 'description' | 'priority' | 'is_active'>
const defaults: Fields = { name: '', description: '', priority: 3, is_active: true }
const button = 'rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50'
const input = 'w-full rounded-xl border border-border bg-background p-2.5 text-sm text-foreground focus:outline-primary'

export function TopicManager({ initialTopics, loadError }: { initialTopics: Topic[]; loadError?: string | null }) {
  const router = useRouter()
  const [topics, setTopics] = useState(initialTopics)
  const [editor, setEditor] = useState<Topic | 'new' | null>(null)
  const [fields, setFields] = useState<Fields>(defaults)
  const [deleting, setDeleting] = useState<Topic | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { setTopics(initialTopics) }, [initialTopics])

  function edit(topic: Topic | 'new') {
    setEditor(topic)
    setDeleting(null)
    setFields(topic === 'new' ? defaults : {
      name: topic.name, description: topic.description, priority: topic.priority, is_active: topic.is_active,
    })
    setError('')
    setSuccess('')
  }

  async function mutate(method: 'POST' | 'PUT' | 'DELETE', id?: string, body?: Fields) {
    if (pending) return
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(id ? `/api/topics/${id}` : '/api/topics', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan topik. Silakan coba lagi.')
      if (method === 'DELETE') {
        setTopics((current) => current.filter((topic) => topic.id !== id))
      } else {
        const saved: Topic = data.topic
        setTopics((current) => [...current.filter((topic) => topic.id !== saved.id), saved])
      }
      setEditor(null)
      setDeleting(null)
      setSuccess(method === 'DELETE' ? 'Topik dihapus permanen.' : 'Perubahan topik tersimpan.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Koneksi gagal. Silakan coba lagi.')
    } finally {
      setPending(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!editor) return
    void mutate(editor === 'new' ? 'POST' : 'PUT', editor === 'new' ? undefined : editor.id, fields)
  }

  return (
    <section className="space-y-4" aria-label="Perpustakaan topik" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Tag className="h-4 w-4 text-primary" /> Perpustakaan Topik ({topics.length})
        </h2>
        <button type="button" disabled={pending || !!loadError} onClick={() => edit('new')} className={`${button} inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90`}>
          <Plus className="h-4 w-4" /> Tambah Topik
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Topik sistem dapat dinonaktifkan dari rotasi, tetapi tidak dapat dihapus.</p>
      {(error || loadError) && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error || 'Gagal memuat topik. Muat ulang halaman untuk mencoba lagi.'}</p>}
      <p role="status" className="text-sm text-muted-foreground">
        {pending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan perubahan...</span> : success}
      </p>

      {editor && (
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5">
          <fieldset disabled={pending} className="space-y-4">
            <legend className="mb-4 font-semibold text-foreground">{editor === 'new' ? 'Tambah Topik Kustom' : `Edit ${editor.name}`}</legend>
            <div>
              <label htmlFor="topic-name" className="mb-1 block text-sm">Nama topik</label>
              <input autoFocus id="topic-name" required maxLength={100} value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} className={input} />
            </div>
            <div>
              <label htmlFor="topic-description" className="mb-1 block text-sm">Deskripsi / konteks editorial</label>
              <textarea id="topic-description" rows={3} maxLength={1000} value={fields.description} onChange={(e) => setFields({ ...fields, description: e.target.value })} className={input} />
            </div>
            <div>
              <label htmlFor="topic-priority" className="mb-1 block text-sm">Prioritas rotasi (1–5)</label>
              <select id="topic-priority" value={fields.priority} onChange={(e) => setFields({ ...fields, priority: Number(e.target.value) })} className={input}>
                {[1, 2, 3, 4, 5].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fields.is_active} onChange={(e) => setFields({ ...fields, is_active: e.target.checked })} /> Aktif dalam rotasi
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={`${button} bg-primary text-primary-foreground hover:bg-primary/90`}>Simpan Topik</button>
              <button type="button" onClick={() => { setEditor(null); setError('') }} className={button}>Batal</button>
            </div>
          </fieldset>
        </form>
      )}

      {deleting && (
        <section aria-labelledby="delete-topic-title" className="space-y-3 rounded-2xl border border-destructive/30 bg-card p-5">
          <h3 id="delete-topic-title" className="font-semibold">Hapus topik “{deleting.name}”?</h3>
          <p className="text-sm text-muted-foreground">Topik kustom ini akan dihapus permanen. Post dan riwayat tetap tersimpan, tetapi tautan ke topik ini akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex flex-wrap gap-2">
            <button autoFocus type="button" disabled={pending} onClick={() => { setDeleting(null); setError('') }} className={button}>Batal</button>
            <button type="button" disabled={pending} onClick={() => void mutate('DELETE', deleting.id)} className={`${button} bg-destructive text-destructive-foreground hover:bg-destructive/90`}>Hapus Permanen</button>
          </div>
        </section>
      )}

      {!loadError && topics.length === 0 && <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Belum ada topik. Tambahkan topik kustom untuk rotasi editorial.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...topics].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, 'id')).map((topic) => (
          <article key={topic.id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="break-words text-base font-bold text-foreground">{topic.name}</h3>
            <p className="mt-1 text-xs text-primary">{topic.source_type === 'system' ? 'Sistem' : 'Kustom'} · {topic.is_active ? 'Aktif' : 'Nonaktif'}</p>
            <p className="mt-2 flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{topic.description || 'Belum ada deskripsi.'}</p>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Prioritas {topic.priority}/5 · {topic.last_selected_at ? new Date(topic.last_selected_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : 'Belum terpakai'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => edit(topic)} className={button}>Edit</button>
              <button type="button" disabled={pending || !!editor || !!deleting} onClick={() => void mutate('PUT', topic.id, { name: topic.name, description: topic.description, priority: topic.priority, is_active: !topic.is_active })} className={button}>{topic.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
              {topic.source_type === 'custom' && <button type="button" disabled={pending} onClick={() => { setDeleting(topic); setEditor(null); setError(''); setSuccess('') }} className={`${button} text-destructive`}>Hapus</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
