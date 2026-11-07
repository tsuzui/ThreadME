import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import {
  Globe,
} from 'lucide-react'
import { SettingsForm } from './settings-form'

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
          Konfigurasi jadwal publikasi, parameter rotasi topik Auto Mix, dan integrasi Threads.
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

      {/* Form Pengaturan Jadwal & Parameter Interaktif */}
      <SettingsForm initialSettings={settings} />
    </div>
  )
}
