'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Plus, Trash2, Power, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import {
  addRecurringRuleAction,
  toggleRecurringRuleAction,
  deleteRecurringRuleAction,
} from './actions'
import type { Database } from '@/types/database'

type RecurringRule = Database['public']['Tables']['recurring_rules']['Row']

interface RecurringRulesCardProps {
  initialRules: RecurringRule[]
  primaryPostingTime?: string | null
}

export function RecurringRulesCard({ initialRules, primaryPostingTime }: RecurringRulesCardProps) {
  const router = useRouter()
  const [rules, setRules] = useState<RecurringRule[]>(initialRules)
  const [newTime, setNewTime] = useState('')
  const [newLead, setNewLead] = useState(20)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  // Sync state if server revalidates or parent props update
  useEffect(() => {
    setRules(initialRules)
  }, [initialRules])

  const primaryNormalized = (primaryPostingTime || '19:00:00').slice(0, 5)

  // Calculate projected AI generation start time for the new rule form
  function getGenerationPreview(timeStr: string, leadMins: number) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return null
    const [h, m] = timeStr.split(':').map(Number)
    const totalMinutes = h * 60 + m
    const genTotal = totalMinutes - leadMins
    if (genTotal < 0) return null
    const genH = String(Math.floor(genTotal / 60)).padStart(2, '0')
    const genM = String(genTotal % 60).padStart(2, '0')
    return `${genH}:${genM} WIB`
  }

  const newRuleGenPreview = getGenerationPreview(newTime, newLead)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTime) return
    setError('')

    if (newTime === primaryNormalized) {
      setError(`Jam ${newTime} WIB sudah digunakan sebagai Jadwal Utama di form Pengaturan. Gunakan jam posting lain untuk jadwal tambahan.`)
      return
    }

    if (rules.some((r) => r.posting_time.slice(0, 5) === newTime)) {
      setError(`Jam posting ${newTime} WIB sudah terdaftar dalam jadwal rutin.`)
      return
    }

    const [h, m] = newTime.split(':').map(Number)
    if (newLead > h * 60 + m) {
      setError('Lead AI terlalu panjang; waktu generasi harus berada pada hari yang sama.')
      return
    }

    setPending(true)
    try {
      const res = await addRecurringRuleAction(newTime, newLead)
      if (res.error) {
        setError(res.error)
      } else {
        setNewTime('')
        setNewLead(20)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan jadwal.')
    } finally {
      setPending(false)
    }
  }

  async function handleToggle(id: string, currentStatus: boolean, isPrimary: boolean) {
    if (isPrimary) {
      setError('Jadwal utama dikelola melalui form Pengaturan Waktu Publikasi di bawah.')
      return
    }
    setPending(true)
    setError('')
    try {
      const res = await toggleRecurringRuleAction(id, !currentStatus)
      if (res.error) setError(res.error)
      else router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.')
    } finally {
      setPending(false)
    }
  }

  async function handleDelete(id: string, isPrimary: boolean) {
    if (isPrimary) {
      setError('Jadwal utama tidak dapat dihapus. Anda dapat mengubah jam rilisnya di form Pengaturan.')
      return
    }
    if (!confirm('Hapus jadwal rutin tambahan ini? Slot yang sudah dimaterialkan untuk hari ini tidak akan terhapus.')) return
    setPending(true)
    setError('')
    try {
      const res = await deleteRecurringRuleAction(id)
      if (res.error) setError(res.error)
      else router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus jadwal.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Jadwal Harian Rutin (Multi-Slot)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Daftar jam posting rutin harian. Jadwal Utama dikonfigurasi melalui form di bawah; Anda dapat menambah jam posting rutin tambahan untuk slot konten ekstra.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          WIB (Asia/Jakarta)
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List Rules */}
      <div className="space-y-2.5">
        {rules.map((rule) => {
          const timeFormatted = rule.posting_time.slice(0, 5)
          const isPrimary = timeFormatted === primaryNormalized

          return (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors ${
                isPrimary
                  ? 'border-primary/40 bg-primary/5'
                  : rule.enabled
                  ? 'border-border/80 bg-background'
                  : 'border-border/40 bg-muted/20 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={pending || isPrimary}
                  onClick={() => handleToggle(rule.id, rule.enabled, isPrimary)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    isPrimary
                      ? 'bg-primary/10 text-primary cursor-default'
                      : rule.enabled
                      ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  title={
                    isPrimary
                      ? 'Jadwal utama aktif (kelola di form pengaturan)'
                      : rule.enabled
                      ? 'Klik untuk jeda jadwal tambahan'
                      : 'Klik untuk aktifkan'
                  }
                >
                  {isPrimary ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-foreground">
                      {timeFormatted} WIB
                    </span>
                    {isPrimary ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Jadwal Utama
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          rule.enabled
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {rule.enabled ? 'Tambahan Aktif' : 'Dijeda'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Generasi AI {rule.generation_lead_minutes} menit sebelum rilis
                    {isPrimary && ' · Sinkron otomatis dengan Pengaturan Utama'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isPrimary && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleDelete(rule.id, isPrimary)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 transition-colors"
                    title="Hapus jadwal tambahan ini"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add New Additional Rule Form */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-border/60 space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tambah Jam Rilis Rutin Tambahan
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-36">
            <input
              type="time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold font-mono text-foreground focus:border-primary focus:outline-none"
              placeholder="HH:MM"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Lead AI:</span>
            <input
              type="number"
              min="1"
              max="1439"
              value={newLead}
              onChange={(e) => setNewLead(Number(e.target.value))}
              className="w-20 rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-mono text-foreground text-center focus:border-primary focus:outline-none"
            />
            <span>menit</span>
          </div>
          <button
            type="submit"
            disabled={pending || !newTime}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Tambah Jam Tambahan
          </button>
        </div>
        {newTime && (
          <p className="text-[11px] text-muted-foreground">
            {newRuleGenPreview
              ? `Jadwal tambahan ini akan digenerate AI pada pukul ${newRuleGenPreview} lalu terbit pada ${newTime} WIB.`
              : 'Waktu generasi harus berada pada hari yang sama dengan waktu publikasi.'}
          </p>
        )}
      </form>
    </div>
  )
}
