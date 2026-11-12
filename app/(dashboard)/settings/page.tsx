import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { SettingsForm } from './settings-form'
import { ThreadsConnection } from './threads-connection'
import { threadsConfigurationError } from '@/lib/threads/config'

export const dynamic = 'force-dynamic'

type AppSettings = Database['public']['Tables']['app_settings']['Row']

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ threads?: string }> }) {
  const supabase = await createClient()
  const [settingsResult, accountResult, heartbeatResult, query] = await Promise.all([
    supabase.from('app_settings').select('*').eq('singleton', true).single(),
    supabase.from('social_accounts')
      .select('external_user_id, username, is_active, connected_at, last_token_refresh_at, token_expires_at')
      .eq('platform', 'threads').order('is_active', { ascending: false }).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('system_logs').select('created_at').eq('event', 'automation_heartbeat').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    searchParams,
  ])
  const settings = settingsResult.data as AppSettings | null
  const heartbeat = heartbeatResult.data as { created_at: string } | null
  return <div className="max-w-4xl space-y-8">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Pengaturan Sistem</h1>
      <p className="mt-1 text-sm text-muted-foreground">Konfigurasi jadwal publikasi, parameter rotasi topik Auto Mix, dan integrasi Threads.</p>
    </div>
    <ThreadsConnection account={accountResult.data} configurationError={threadsConfigurationError()} loadError={!!accountResult.error} outcome={query.threads} />
    <section className="space-y-2 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-base font-semibold">Status otomatisasi</h2>
      <p className="text-sm">Mode server: {process.env.THREADS_PUBLISH_MODE === 'live' ? 'Live — dapat menerbitkan ke Threads' : 'Simulasi — tidak menerbitkan'}</p>
      <p className="text-sm">Jadwal harian: {settings?.automation_enabled ? 'Aktif' : 'Dijeda'} · Generasi {settings?.generation_time.slice(0, 5)} · Publikasi {settings?.posting_time.slice(0, 5)} WIB</p>
      <p className="text-xs text-muted-foreground">{heartbeat ? `Worker terakhir terpantau: ${new Date(heartbeat.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB.` : 'Belum ada heartbeat worker yang tercatat.'}</p>
      <p className="text-xs text-muted-foreground">Hasil publikasi yang belum pasti tidak dikirim ulang otomatis. Periksa status draf dan akun Threads sebelum melanjutkan.</p>
    </section>
    <SettingsForm initialSettings={settings} />
  </div>
}
