import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  Settings as SettingsIcon,
  Clock,
  Globe,
  Sliders,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type AppSettings = Database['public']['Tables']['app_settings']['Row']
type SocialAccount = Database['public']['Tables']['social_accounts']['Row']

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Fetch singleton settings
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('*')
    .eq('singleton', true)
    .single()
  const settings = settingsData as AppSettings | null

  // 2. Fetch connected Threads account metadata
  const { data: socialAccountData } = await supabase
    .from('social_accounts')
    .select('id, platform, external_user_id, username, is_active, connected_at, last_token_refresh_at, token_expires_at')
    .eq('platform', 'threads')
    .maybeSingle()
  const socialAccount = socialAccountData as Omit<SocialAccount, 'encrypted_access_token'> | null

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Pengaturan Sistem
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurasi jadwal, persona AI, dan integrasi akun Threads.
        </p>
      </div>

      {/* Akun Threads Terkoneksi */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Koneksi Threads API
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Menggunakan Meta Official Threads Graph API (OAuth). Kata sandi akun tidak pernah disimpan.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
          {socialAccount ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    @{socialAccount.username || socialAccount.external_user_id}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                    Tersambung
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Terhubung sejak: {new Date(socialAccount.connected_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-foreground">
                  Belum Ada Akun Threads Terhubung
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  OAuth flow akan diintegrasikan pada Phase D. Token akan dienkripsi secara aman di sisi server.
                </p>
              </div>
              <span className="inline-flex rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                Menunggu Phase D
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Jadwal & Waktu */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Jadwal Otomatisasi
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Zona Waktu</span>
            <div className="mt-1 text-base font-bold text-foreground">
              {settings?.timezone || 'Asia/Jakarta'}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Waktu Indonesia Barat (WIB)</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Waktu Generasi</span>
            <div className="mt-1 text-base font-bold text-foreground">
              {settings?.generation_time ? `${settings.generation_time.slice(0, 5)} WIB` : '18:40 WIB'}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Persiapan & validasi draf</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Waktu Posting</span>
            <div className="mt-1 text-base font-bold text-foreground">
              {settings?.posting_time ? `${settings.posting_time.slice(0, 5)} WIB` : '19:00 WIB'}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Publikasi live ke Threads</p>
          </div>
        </div>
      </div>

      {/* Preferensi Konten & AI */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Parameter Konten
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Target Rasio Gambar</span>
            <div className="mt-1 text-base font-bold text-foreground">
              {settings?.image_target_ratio ? `${(settings.image_target_ratio * 100).toFixed(0)}%` : '35%'}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ~65% teks, ~35% gambar original (gambar opsional).
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/10 p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Maksimal Retry</span>
            <div className="mt-1 text-base font-bold text-foreground">
              {settings?.max_generation_retries ?? 2} Kali
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Regenerasi jika kontrol kualitas/anti-repetisi gagal.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Persona & Suara ThreadMe (Default Prompt)
          </label>
          <div className="rounded-xl border border-border bg-muted/20 p-4 font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {settings?.persona_prompt || 'Anak muda Indonesia yang mengamati kehidupan sehari-hari. Santai, spontan, kadang receh, kadang galau, kadang sedikit puitis. Tidak klise motivasi, tidak korporat.'}
          </div>
        </div>
      </div>
    </div>
  )
}
