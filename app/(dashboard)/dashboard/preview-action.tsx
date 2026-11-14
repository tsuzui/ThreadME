'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  ImageIcon,
  RefreshCw,
  Eye,
  Sliders,
} from 'lucide-react'

interface GenerateResultData {
  postId?: string
  topic: string
  angle: string
  content: string
  format: 'text' | 'image'
  qualityScore: number
  qualityNotes: {
    naturalness?: number
    originality?: number
    relevance?: number
    reason?: string
  }
}

export function DashboardPreviewAction() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerateResultData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleGeneratePreview = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/posts/generate-preview', {
        method: 'POST',
      })

      const json = await response.json()

      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses draf konten.')
      }

      setResult(json.data)
      setIsModalOpen(true)
      router.refresh()
    } catch (err: unknown) {
      const errorObj = err as Error
      setError(errorObj.message || 'Terjadi kesalahan saat membuat draf.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleGeneratePreview}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memproses Draf...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Generate Draf (Uji Preview)</span>
            </>
          )}
        </button>
      </div>

      {/* Banner Error jika ada */}
      {error && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-destructive/80 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modal Preview Konten yang Dihasilkan */}
      {isModalOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            {/* Header Modal */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Draf Berhasil Digenerate
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Auto Mix Topic Studio
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-foreground">
                  Hasil Preview Draf Konten
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Topik & Angle */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
              <div>
                <span className="text-muted-foreground block font-medium uppercase text-[10px]">
                  Topik Terpilih
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {result.topic}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block font-medium uppercase text-[10px]">
                  Sudut Pandang (Angle)
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  {result.angle}
                </span>
              </div>
            </div>

            {/* Kotak Konten Postingan Gaya Threads */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Teks Postingan Threads
              </span>
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-foreground leading-relaxed shadow-inner font-sans whitespace-pre-wrap">
                {result.content}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Panjang: {result.content.length} / 500 karakter</span>
                <span className="flex items-center gap-1">
                  {result.format === 'image' ? (
                    <>
                      <ImageIcon className="h-3 w-3 text-primary" />
                      Format: Teks + Ide Gambar
                    </>
                  ) : (
                    <>
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      Format: Teks Saja
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Metrik Kualitas */}
            <div className="rounded-xl border border-border bg-muted/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  Skor Kontrol Kualitas & Anti-Repetisi
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-500">
                  {result.qualityScore} / 100
                </span>
              </div>
              {result.qualityNotes.reason && (
                <p className="text-[11px] text-muted-foreground italic">
                  &ldquo;{result.qualityNotes.reason}&rdquo;
                </p>
              )}
            </div>

            {/* Footer Aksi */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground">
                Preview belum disimpan. <Link href="/posts/new" onClick={() => sessionStorage.setItem('threadme-proposal', result.content)} className="text-primary underline">Edit, tambah gambar, atau jadwalkan</Link>.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGeneratePreview}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
