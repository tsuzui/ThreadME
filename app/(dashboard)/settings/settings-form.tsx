'use client'

import { useActionState, useState } from 'react'
import { updateAppSettingsAction, type UpdateSettingsState } from './actions'
import type { Database } from '@/types/database'
import {
  Clock,
  Sliders,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'

type AppSettings = Database['public']['Tables']['app_settings']['Row']

interface SettingsFormProps {
  initialSettings: AppSettings | null
}

const initialState: UpdateSettingsState = {}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateAppSettingsAction,
    initialState
  )

  // Local state to format time HH:MM from HH:MM:SS
  const formatForInput = (time: string | null | undefined, fallback: string) => {
    if (!time) return fallback
    return time.slice(0, 5)
  }

  const [postingTime, setPostingTime] = useState(
    formatForInput(initialSettings?.posting_time, '19:00')
  )
  const [generationTime, setGenerationTime] = useState(
    formatForInput(initialSettings?.generation_time, '18:40')
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

  return (
    <form action={formAction} className="space-y-6">
      {/* Notifikasi Status */}
      {state.error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state.success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Pengaturan jadwal dan sistem berhasil diperbarui.</span>
        </div>
      )}

      {/* Jadwal & Waktu */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Jadwal & Waktu Publikasi
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            WIB (Asia/Jakarta)
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="posting_time"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              Waktu Publikasi Threads
            </label>
            <input
              id="posting_time"
              name="posting_time"
              type="time"
              value={postingTime}
              onChange={(e) => setPostingTime(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Target rilis live ke Threads (Default 19:00 WIB).
            </p>
          </div>

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
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Persiapan, validasi, dan kontrol kualitas (Default 18:40 WIB).
            </p>
          </div>
        </div>

        {/* Toggle Otomatisasi */}
        <div className="pt-2 border-t border-border/60">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Jalankan Otomatisasi Harian
              </span>
              <span className="text-xs text-muted-foreground block">
                Jika dinonaktifkan, Supabase cron tidak akan mempublikasikan draf otomatis.
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

      {/* Parameter Konten & Algoritma Auto Mix */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Parameter Konten & Rotasi Auto Mix
        </h2>

        <p className="text-sm text-muted-foreground">AI menyiapkan teks saja. Gambar opsional dapat diunggah manual melalui editor draf di kalender.</p>
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
              Jeda minimal sebuah topik boleh terpilih kembali (Default 7 hari).
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
              Regenerasi jika skor kemiripan tinggi atau ada frasa klise.
            </p>
          </div>
        </div>

        {/* Persona Prompt */}
        <div>
          <label
            htmlFor="persona_prompt"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between"
          >
            <span>Persona & Suara ThreadMe (System Prompt)</span>
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
          disabled={isPending}
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
