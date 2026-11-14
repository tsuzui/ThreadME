'use client'

import { useActionState, useState, useEffect } from 'react'
import { updateAppSettingsAction, type UpdateSettingsState } from './actions'
import type { Database } from '@/types/database'
import {
  Clock,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react'

type AppSettings = Database['public']['Tables']['app_settings']['Row']

interface SettingsFormProps {
  initialSettings: AppSettings | null
}

const initialState: UpdateSettingsState = {}

function timeToMinutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(totalMins: number): string | null {
  if (totalMins < 0 || totalMins >= 1440) return null
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0')
  const m = String(totalMins % 60).padStart(2, '0')
  return `${h}:${m}`
}

function formatLeadDuration(leadMins: number): string {
  const hours = Math.floor(leadMins / 60)
  const remainingMins = leadMins % 60
  if (hours > 0 && remainingMins > 0) {
    return `${hours} jam ${remainingMins} menit (${leadMins} menit)`
  }
  if (hours > 0) {
    return `${hours} jam (${leadMins} menit)`
  }
  return `${remainingMins} menit`
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateAppSettingsAction,
    initialState
  )

  const formatForInput = (time: string | null | undefined, fallback: string) => {
    if (!time) return fallback
    return time.slice(0, 5)
  }

  const [postingTime, setPostingTime] = useState(
    formatForInput(initialSettings?.posting_time, '19:00')
  )
  const [generationTime, setGenerationTime] = useState(
    formatForInput(initialSettings?.generation_time, '08:00')
  )
  const [automationEnabled, setAutomationEnabled] = useState(
    initialSettings?.automation_enabled ?? true
  )
  const [cooldownDays, setCooldownDays] = useState(
    initialSettings?.topic_rotation_cooldown_days ?? 7
  )
  const [maxRetries, setMaxRetries] = useState(
    initialSettings?.max_generation_retries ?? 2
  )
  const [personaPrompt, setPersonaPrompt] = useState(
    initialSettings?.persona_prompt ?? ''
  )

  // Sync state whenever initialSettings props update (e.g. after refresh/revalidation)
  useEffect(() => {
    if (initialSettings) {
      setPostingTime(formatForInput(initialSettings.posting_time, '19:00'))
      setGenerationTime(formatForInput(initialSettings.generation_time, '08:00'))
      setAutomationEnabled(initialSettings.automation_enabled ?? true)
      setCooldownDays(initialSettings.topic_rotation_cooldown_days ?? 7)
      setMaxRetries(initialSettings.max_generation_retries ?? 2)
      setPersonaPrompt(initialSettings.persona_prompt ?? '')
    }
  }, [initialSettings])

  // Derive lead time
  const postMins = timeToMinutes(postingTime)
  const genMins = timeToMinutes(generationTime)
  const currentLead =
    postMins !== null && genMins !== null ? postMins - genMins : null
  const isValidLead = currentLead !== null && currentLead >= 1 && currentLead <= 1439

  // Handler for user directly adjusting lead in minutes
  function handleLeadChange(newLeadMinutes: number) {
    if (postMins === null) return
    const calculatedGenMins = postMins - newLeadMinutes
    if (calculatedGenMins >= 0) {
      const formatted = minutesToTime(calculatedGenMins)
      if (formatted) setGenerationTime(formatted)
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Notifikasi Status */}
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {state.success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>
            {state.message || 'Pengaturan jadwal dan sistem berhasil diperbarui.'}
          </span>
        </div>
      )}

      {/* Jadwal Utama & Lead Waktu */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Jadwal Utama Publikasi
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Konfigurasi jam rilis utama harian serta lead waktu persiapan draf oleh AI.
            </p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            WIB (Asia/Jakarta)
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="generation_time"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Waktu Mulai Generasi AI
            </label>
            <input
              id="generation_time"
              name="generation_time"
              type="time"
              value={generationTime}
              onChange={(e) => setGenerationTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              AI mulai meracik topik &amp; menyusun draf (Rekomendasi pagi 08:00 WIB).
            </p>
          </div>

          <div>
            <label
              htmlFor="posting_time"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Waktu Publikasi Threads (Jadwal Utama)
            </label>
            <input
              id="posting_time"
              name="posting_time"
              type="time"
              value={postingTime}
              onChange={(e) => setPostingTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Target publikasi live ke Threads (Rekomendasi malam 19:00 WIB).
            </p>
          </div>
        </div>

        {/* Lead Preview & Editable Control */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Jeda Waktu Persiapan (Lead AI)
              </span>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {isValidLead ? (
                  formatLeadDuration(currentLead)
                ) : (
                  <span className="text-destructive font-normal">
                    Generasi harus minimal 1 menit sebelum publikasi di hari yang sama.
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="lead_adjust" className="text-xs text-muted-foreground">
                Ubah jeda:
              </label>
              <input
                id="lead_adjust"
                type="number"
                min="1"
                max={postMins !== null ? postMins : 1439}
                value={currentLead !== null && currentLead > 0 ? currentLead : 660}
                onChange={(e) => handleLeadChange(Number(e.target.value))}
                className="w-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-mono font-bold text-foreground text-center focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">menit</span>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border/40 pt-2.5">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Dengan jadwal ini, draf sudah siap sejak pagi ({generationTime} WIB) sehingga Anda leluasa meninjau, mengedit narasi, atau menambahkan foto sebelum terbit otomatis pukul {postingTime} WIB.
            </span>
          </div>
        </div>

        {/* Global Automation Switch */}
        <div className="pt-2 border-t border-border/60">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Jalankan Otomatisasi Harian (Global)
              </span>
              <span className="text-xs text-muted-foreground block">
                Mengontrol aktif/tidaknya seluruh eksekusi worker cron harian tanpa mengubah jadwal rutin yang tersimpan.
              </span>
            </div>
            <input
              type="checkbox"
              name="automation_enabled"
              checked={automationEnabled}
              onChange={(e) => setAutomationEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Advanced AI & Quality Control Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Parameter Konten &amp; AI Lanjutan
        </h2>
        <p className="text-xs text-muted-foreground">
          Atur parameter rotasi bank topik Auto Mix dan batas kontrol kualitas draf otomatis.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="topic_rotation_cooldown_days"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Cooldown Rotasi Topik (Hari)
            </label>
            <input
              id="topic_rotation_cooldown_days"
              name="topic_rotation_cooldown_days"
              type="number"
              min="1"
              max="30"
              value={cooldownDays}
              onChange={(e) => setCooldownDays(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Jeda minimal sebuah topik boleh terpilih kembali oleh Auto Mix (1–30 hari).
            </p>
          </div>

          <div>
            <label
              htmlFor="max_generation_retries"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Batas Retry Kontrol Kualitas
            </label>
            <input
              id="max_generation_retries"
              name="max_generation_retries"
              type="number"
              min="0"
              max="5"
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Batas percobaan regenerasi jika skor kemiripan tinggi atau draf klise (0–5 kali).
            </p>
          </div>
        </div>

        {/* Persona Prompt */}
        <div>
          <label
            htmlFor="persona_prompt"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Persona &amp; Suara ThreadMe (System Prompt)
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Disarankan tetap mempertahankan suara anak muda santai
            </span>
          </label>
          <textarea
            id="persona_prompt"
            name="persona_prompt"
            rows={4}
            value={personaPrompt}
            onChange={(e) => setPersonaPrompt(e.target.value)}
            placeholder="Persona default akan digunakan jika dikosongkan..."
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tombol Simpan */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || !isValidLead}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>
    </form>
  )
}
