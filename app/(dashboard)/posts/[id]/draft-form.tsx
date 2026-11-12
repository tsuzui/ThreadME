'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Post = Database['public']['Tables']['content_posts']['Row']

export function DraftForm({ post }: { post: Post }) {
  const router = useRouter()
  const imageInput = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState(post.content)
  const [alt, setAlt] = useState(post.image_alt_text || '')
  const [file, setFile] = useState<File | null>(null)
  const [action, setAction] = useState<'keep' | 'remove' | 'replace'>('keep')
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const editable = post.status === 'ready'
  useEffect(() => {
    if (!file) { setLocalUrl(null); return }
    const url = URL.createObjectURL(file)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const preview = action === 'remove' ? null : localUrl || post.image_public_url

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true); setError(''); setSuccess(false)
    try {
      const body = new FormData()
      body.set('content', content); body.set('alt', alt); body.set('version', post.updated_at)
      body.set('imageAction', action)
      if (file && action === 'replace') body.set('image', file)
      const response = await fetch(`/api/posts/${post.id}`, { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan draf.')
      if (imageInput.current) imageInput.current.value = ''
      setSuccess(true); setFile(null); setAction('keep'); router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Koneksi gagal. Silakan coba lagi.') }
    finally { setPending(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      {!editable && <p className="rounded-xl bg-muted p-3 text-sm">Postingan berstatus {post.status} hanya dapat dilihat, tidak dapat diedit.</p>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-600">Perubahan draf tersimpan. Belum dipublikasikan ke Threads.</p>}
      <fieldset disabled={!editable || pending} className="space-y-5 disabled:opacity-70">
        <div>
          <label htmlFor="content" className="mb-2 block text-sm font-semibold">Teks postingan</label>
          <textarea id="content" value={content} onChange={e => { setContent(e.target.value); setSuccess(false) }} rows={7}
            required minLength={15} maxLength={500} className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-primary" />
          <p className="mt-1 text-xs text-muted-foreground">{content.length} / 500 karakter · minimal 15 karakter</p>
        </div>
        <div className="space-y-3 border-t border-border pt-5">
          <h2 className="text-sm font-semibold">Gambar opsional</h2>
          <p className="text-xs text-muted-foreground">Buat gambarmu sendiri, lalu unggah JPEG, PNG, atau WebP statis maksimal 5 MB / 25 megapiksel. Gambar disimpan sebagai JPEG, maksimal 2048 px.</p>
          <p className="text-xs text-amber-600">Setelah disimpan, gambar dapat diakses melalui URL publik. Jangan unggah gambar pribadi atau sensitif.</p>
          {preview && <img src={preview} alt={alt || 'Pratinjau lampiran draf'} className="max-h-80 max-w-full rounded-xl border border-border object-contain" />}
          <label htmlFor="image" className="block text-sm font-medium">{preview ? 'Ganti gambar' : 'Pilih gambar'}</label>
          <input ref={imageInput} id="image" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm"
            onChange={e => {
              const selected = e.target.files?.[0]
              setError(''); setSuccess(false)
              if (!selected) return
              if (selected.size > 5 * 1024 * 1024) { setError('Gambar maksimal 5 MB.'); e.target.value = ''; return }
              setFile(selected); setAction('replace')
            }} />
          {preview && <>
            <label htmlFor="alt" className="block text-sm font-medium">Deskripsi gambar (alt text)</label>
            <textarea id="alt" rows={2} maxLength={500} value={alt} onChange={e => setAlt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm" placeholder="Jelaskan isi gambar untuk pembaca layar." />
            <button type="button" onClick={() => { if (imageInput.current) imageInput.current.value = ''; setAction('remove'); setFile(null); setAlt(''); setSuccess(false) }}
              className="rounded-lg border border-border px-3 py-2 text-xs">Lepas gambar saat disimpan</button>
          </>}
          {action === 'remove' && <p className="text-xs text-muted-foreground">Gambar akan dilepas setelah Simpan perubahan. Postingan menjadi teks saja.</p>}
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Link href="/calendar" className="rounded-xl border border-border px-4 py-2 text-sm">{editable ? 'Batal / kembali' : 'Kembali ke kalender'}</Link>
        {editable && <button disabled={pending || content.trim().length < 15 || content.trim().length > 500} type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? 'Menyimpan…' : 'Simpan perubahan'}</button>}
      </div>
    </form>
  )
}
