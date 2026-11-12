'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Plus, Trash2, Power, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import {
  addRecurringRuleAction,
  toggleRecurringRuleAction,
  deleteRecurringRuleAction,
} from './actions'
import type { Database } from '@/types/database'

type RecurringRule = Database['public']['Tables']['recurring_rules']['Row']

interface RecurringRulesCardProps {
  initialRules: RecurringRule[]
}

export function RecurringRulesCard({ initialRules }: RecurringRulesCardProps) {
  const router = useRouter()
  const [rules, setRules] = useState<RecurringRule[]>(initialRules)
  const [newTime, setNewTime] = useState('')
  const [newLead, setNewLead] = useState(20)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTime) return
    setPending(true)
    setError('')
    try {
      const res = await addRecurringRuleAction(newTime, newLead)
      if (res.error) {
        setError(res.error)
      } else {
        setNewTime('')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan jadwal.')
    } finally {
      setPending(false)
    }
  }

  async function handleToggle(id: string, currentStatus: boolean) {
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

  async function handleDelete(id: string) {
    if (!confirm('Hapus jadwal rutin ini? Slot yang sudah dimaterialkan untuk hari ini tidak akan terhapus.')) return
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
            Default 1 posting per hari (19:00 WIB). Anda bisa menambahkan jam rilis rutin tambahan (misal: 12:00 WIB siang) agar otomatis dibuatkan slot setiap harinya.
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          WIB (Asia/Jakarta)
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List Rules */}
      <div className="space-y-2.5">
        {initialRules.map((rule) => {
          const timeFormatted = rule.posting_time.slice(0, 5)
          return (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors ${
                rule.enabled
                  ? 'border-border/80 bg-background'
                  : 'border-border/40 bg-muted/20 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleToggle(rule.id, rule.enabled)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    rule.enabled
                      ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  title={rule.enabled ? 'Klik untuk jeda' : 'Klik untuk aktifkan'}
                >
                  <Power className="h-4 w-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-foreground">
                      {timeFormatted} WIB
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        rule.enabled
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {rule.enabled ? 'Aktif Tiap Hari' : 'Dijeda'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Generasi AI {rule.generation_lead_minutes} menit sebelum publikasi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || initialRules.length <= 1}
                  onClick={() => handleDelete(rule.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 transition-colors"
                  title="Hapus jadwal rutin ini"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add New Rule Form */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-border/60">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Tambah Jam Rilis Rutin Baru
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-36">
            <input
              type="time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Lead AI:</span>
            <input
              type="number"
              min="5"
              max="180"
              value={newLead}
              onChange={(e) => setNewLead(Number(e.target.value))}
              className="w-16 rounded-xl border border-border bg-background px-2 py-2 text-xs font-mono text-foreground text-center"
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
            Tambah Jam Rutin
          </button>
        </div>
      </form>
    </div>
  )
}
