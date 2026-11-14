'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ImageIcon,
  X,
  Calendar,
  Clock,
  Send,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopicOption {
  id: string
  name: string
}

interface ComposerFormProps {
  defaultDate: string
  defaultTime: string
  activeTopics: TopicOption[]
}

export function ComposerForm({
  defaultDate,
  defaultTime,
  activeTopics,
}: ComposerFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [content, setContent] = useState('')
  const [context, setContext] = useState('')
  const [pillar, setPillar] = useState('topik_aktual')
  const [topicId, setTopicId] = useState('')
  const selectedTopic = activeTopics.find(topic => topic.id === topicId)
  const [action, setAction] = useState<'draft' | 'schedule' | 'publish_now'>('draft')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)
  const [file, setFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [alt, setAlt] = useState('')

  // AI Assist State
  const [aiPending, setAiPending] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  // Submission State
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{
    message: string
    postId?: string
    permalink?: string
  } | null>(null)

  useEffect(() => {
    const proposal = sessionStorage.getItem('threadme-proposal')
    if (proposal) {
      setContent(proposal)
      sessionStorage.removeItem('threadme-proposal')
    }
  }, [])

  async function handleGenerateAI() {
    setAiPending(true)
    setError(null)
    try {
      const response = await fetch('/api/posts/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topicId || undefined,
          context: context.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal membuat usulan.')
      setSuggestion(data.data.content)
      if (data.data.pillar) {
        setPillar(data.data.pillar)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghubungi AI.')
    } finally {
      setAiPending(false)
    }
  }

  // Clean up object URL on file change
  useEffect(() => {
    if (!file) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const charCount = content.length
  const isContentValid = charCount >= 15 && charCount <= 500

  // Request AI Suggestion
  async function handleAiSuggest() {
    if (!context.trim() || context.trim().length < 3) return
    setAiPending(true)
    setError(null)

    try {
      const res = await fetch('/api/posts/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: context.trim(),
          currentContent: content || undefined,
          pillar,
          topicName: selectedTopic?.name || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal meracik usulan AI.')
      setSuggestion(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghubungi AI.')
    } finally {
      setAiPending(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 5 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Format gambar harus JPEG, PNG, atau WebP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setError(null)
    setFile(selected)
  }

  function handleRemoveImage() {
    setFile(null)
    setAlt('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Handle Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isContentValid) {
      setError('Teks postingan harus antara 15 dan 500 karakter.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccessInfo(null)

    try {
      const formData = new FormData()
      formData.set('content', content.trim())
      formData.set('pillar', pillar)
      if (topicId) formData.set('topicId', topicId)
      if (context.trim()) formData.set('context', context.trim())
      formData.set('action', action)

      if (action === 'schedule') {
        formData.set('date', date)
        formData.set('time', time)
      }

      if (file) {
        formData.set('image', file)
        if (alt.trim()) formData.set('alt', alt.trim())
      }

      const res = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.postId) {
          router.push(`/posts/${data.postId}`)
          return
        }
        throw new Error(data.error || 'Gagal membuat postingan.')
      }

      setSuccessInfo({
        message: data.message || (action === 'publish_now' ? 'Postingan berhasil dipublikasikan!' : 'Postingan berhasil disimpan.'),
        postId: data.postId,
        permalink: data.permalink,
      })

      // Redirect ke detail postingan setelah delay singkat agar user melihat konfirmasi
      setTimeout(() => {
        if (data.postId) {
          router.push(`/posts/${data.postId}`)
        } else {
          router.push('/posts')
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {successInfo && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{successInfo.message}</p>
            {successInfo.permalink && (
              <a
                href={successInfo.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline"
              >
                Lihat di Threads <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <p className="mt-1 text-xs opacity-80">Mengalihkan ke halaman detail...</p>
          </div>
        </div>
      )}

      {/* 1. BANTUAN AI & KONTEKS VIRAL */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Inspirasi AI & Konteks Isu Viral (Opsional)
              </h2>
              <p className="text-xs text-muted-foreground">
                Masukkan isu terkini atau analogi yang ingin disenggol, AI akan meracik sesuai persona ThreadME.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="topic" className="block text-xs font-medium">Topik pilihan</label>
          <select id="topic" value={topicId} onChange={e => { setTopicId(e.target.value); setSuggestion(null) }} disabled={aiPending || submitting} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
            <option value="">Pilih topik untuk bantuan AI</option>
            {activeTopics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
          {!activeTopics.length && <p className="text-xs text-muted-foreground">Belum ada topik aktif. Tambahkan atau aktifkan topik di Topic Studio.</p>}
        </div>
        <button type="button" onClick={handleGenerateAI} disabled={aiPending || submitting || !topicId} className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">{aiPending ? 'AI sedang meracik...' : 'Generate dari Topik Pilihan'}</button>
        <div className="space-y-3 pt-1">
          <div>
            <label htmlFor="context" className="block text-xs font-medium text-foreground mb-1">
              Topik / Konteks Isu Hangat
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="context"
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder='Contoh: "tips produktivitas kerja remote", "dilema karier vs passion", "tren teknologi terkini"'
                className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                maxLength={1000}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiPending || submitting || !context.trim() || context.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50 shrink-0"
              >
                {aiPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Meracik...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Bantu Tulis AI
                  </>
                )}
              </button>
            </div>
          </div>

          {activeTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground font-medium mr-1">Pilih Cepat:</span>
              {activeTopics.slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTopicId(t.id)
                    setSuggestion(null)
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs transition border',
                    topicId === t.id
                      ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Kotak Usulan AI */}
          {suggestion && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Usulan Teks dari AI
                </span>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm font-medium text-foreground whitespace-pre-wrap bg-background/80 p-3 rounded-lg border border-border/60">
                {suggestion}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContent(suggestion)
                    setSuggestion(null)
                  }}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  Terapkan ke Postingan
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. AREA PENULISAN KONTEN UTAMA */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="content" className="text-sm font-semibold text-foreground">
            Isi Teks Postingan Threads
          </label>
          <span
            className={cn(
              'text-xs font-mono font-medium',
              charCount === 0
                ? 'text-muted-foreground'
                : charCount < 15
                ? 'text-amber-500'
                : charCount <= 500
                ? 'text-emerald-500'
                : 'text-destructive'
            )}
          >
            {charCount}/500 karakter
          </span>
        </div>

        <textarea
          id="content"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tulis apa yang ada di pikiranmu atau gunakan usulan AI di atas..."
          className="w-full rounded-xl border border-input bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y"
          maxLength={600}
          disabled={submitting}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Minimal 15 karakter, maksimal 500 karakter sesuai aturan Meta Threads.</span>
          {charCount > 0 && charCount < 15 && (
            <span className="text-amber-500 font-medium">Kurang {15 - charCount} karakter lagi.</span>
          )}
        </div>
      </div>

      {/* 3. GAMBAR OPSIONAL */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Lampiran Gambar (Opsional)
              </h2>
              <p className="text-xs text-muted-foreground">
                Unggah gambar JPEG/PNG/WebP statis maksimal 5 MB.
              </p>
            </div>
          </div>

          {file && (
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              <X className="h-3 w-3" />
              Lepas Gambar
            </button>
          )}
        </div>

        {imagePreview ? (
          <div className="space-y-3 pt-2">
            <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20 max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt={alt || 'Pratinjau lampiran postingan'}
                className="max-h-60 w-full object-contain"
              />
            </div>
            <div>
              <label htmlFor="alt" className="block text-xs font-medium text-foreground mb-1">
                Deskripsi Gambar / Alt Text (Aksesibilitas)
              </label>
              <input
                id="alt"
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Jelaskan isi gambar secara singkat..."
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                maxLength={500}
                disabled={submitting}
              />
            </div>
          </div>
        ) : (
          <div className="pt-1">
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 text-center transition hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-xs font-semibold text-foreground">
                Pilih file gambar dari perangkat
              </span>
              <span className="mt-0.5 text-[11px] text-muted-foreground">
                Maksimal 5 MB · JPEG, PNG, WebP
              </span>
              <input
                ref={fileInputRef}
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* 4. PILIHAN AKSI PENAYANGAN */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Pilihan Aksi Penayangan
          </h2>
          <p className="text-xs text-muted-foreground">
            Tentukan apakah postingan ini mau disimpan sebagai draf, dijadwalkan, atau langsung live.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Opsi 1: Simpan Draf */}
          <button
            type="button"
            onClick={() => setAction('draft')}
            className={cn(
              'flex flex-col text-left rounded-xl p-4 border transition-all',
              action === 'draft'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className={cn('h-4 w-4', action === 'draft' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-xs font-bold text-foreground">Simpan Draf</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Disimpan tanpa jadwal kaku. Bisa diedit kapan saja & tidak dipublish otomatis oleh worker.
            </p>
          </button>

          {/* Opsi 2: Jadwalkan */}
          <button
            type="button"
            onClick={() => setAction('schedule')}
            className={cn(
              'flex flex-col text-left rounded-xl p-4 border transition-all',
              action === 'schedule'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className={cn('h-4 w-4', action === 'schedule' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-xs font-bold text-foreground">Jadwalkan</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Pilih tanggal & jam tayang (WIB). Cron worker otomatis mempublikasikannya saat tiba waktunya.
            </p>
          </button>

          {/* Opsi 3: Publikasikan Sekarang */}
          <button
            type="button"
            onClick={() => setAction('publish_now')}
            className={cn(
              'flex flex-col text-left rounded-xl p-4 border transition-all',
              action === 'publish_now'
                ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-sm'
                : 'border-border bg-card hover:bg-muted/40'
            )}
          >
            <div className="flex items-center gap-2">
              <Send className={cn('h-4 w-4', action === 'publish_now' ? 'text-emerald-500' : 'text-muted-foreground')} />
              <span className="text-xs font-bold text-foreground">Publish Sekarang</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Langsung kirim ke Meta Threads dan dapatkan tautan postingan aktif seketika.
            </p>
          </button>
        </div>

        {/* Input Waktu jika Jadwalkan dipilih */}
        {action === 'schedule' && (
          <div className="grid gap-3 pt-2 sm:grid-cols-2 rounded-xl bg-muted/30 p-4 border border-border">
            <div>
              <label htmlFor="schedule-date" className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Tanggal Tayang (WIB)
              </label>
              <input
                id="schedule-date"
                type="date"
                value={date}
                min={defaultDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div>
              <label htmlFor="schedule-time" className="block text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Jam Tayang (WIB)
              </label>
              <input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>
        )}
      </div>

      {/* TOMBOL SUBMIT */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={!isContentValid || submitting}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-50',
            action === 'publish_now'
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
              : 'bg-primary hover:bg-primary/90 shadow-primary/20'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : action === 'publish_now' ? (
            <>
              <Send className="h-4 w-4" />
              Publikasikan Sekarang
            </>
          ) : action === 'schedule' ? (
            <>
              <Calendar className="h-4 w-4" />
              Jadwalkan Postingan
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Simpan sebagai Draf
            </>
          )}
        </button>
      </div>
    </form>
  )
}
