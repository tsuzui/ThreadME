'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Clock, Sparkles, X, Loader2 } from 'lucide-react'

export function AddSlotButton({ defaultDate }: { defaultDate?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('21:00')
  const [context, setContext] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/posts/create-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time,
          context: context.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Gagal membuat slot.')
      setOpen(false)
      router.push(`/posts/${data.postId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Koneksi gagal.')
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Tambah Slot Konten
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Tambah Slot Konten Terjadwal
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="slot_date" className="block text-xs font-semibold text-foreground mb-1">
                    Tanggal Rilis
                  </label>
                  <input
                    id="slot_date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:outline-primary font-medium"
                  />
                </div>
                <div>
                  <label htmlFor="slot_time" className="block text-xs font-semibold text-foreground mb-1">
                    Jam Posting (WIB)
                  </label>
                  <input
                    id="slot_time"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:outline-primary font-bold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="slot_context" className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Konteks / Isu Viral (Opsional)
                </label>
                <textarea
                  id="slot_context"
                  rows={3}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Contoh: fenomena hustle culture, dilema kerja vs passion, atau kejadian viral..."
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:outline-primary"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Konteks ini dapat diolah AI di editor draf untuk menghasilkan gaya ThreadMe yang relate.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Membuat Slot...
                    </>
                  ) : (
                    'Buat & Buka Editor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
