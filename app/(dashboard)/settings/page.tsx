import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { SettingsForm } from './settings-form'
import { RecurringRulesCard } from './recurring-rules-card'
import { ThreadsConnection } from './threads-connection'
import { threadsConfigurationError } from '@/lib/threads/config'
import { AutomationTest } from '../dashboard/automation-test'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

type AppSettings = Database['public']['Tables']['app_settings']['Row']
type RecurringRule = Database['public']['Tables']['recurring_rules']['Row']

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ threads?: string }> }) {
  const supabase = await createClient()
  const [settingsResult, accountResult, heartbeatResult, rulesResult, query] = await Promise.all([
    supabase.from('app_settings').select('*').eq('singleton', true).single(),
    supabase.from('social_accounts')
      .select('external_user_id, username, is_active, connected_at, last_token_refresh_at, token_expires_at')
      .eq('platform', 'threads').order('is_active', { ascending: false }).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('system_logs').select('created_at').eq('event', 'automation_heartbeat').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('recurring_rules').select('*').order('posting_time', { ascending: true }),
    searchParams,
  ])
  const settings = settingsResult.data as AppSettings | null
  const heartbeat = heartbeatResult.data as { created_at: string } | null
  const recurringRules = (rulesResult.data as RecurringRule[] | null) || []

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Pengaturan Sistem</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurasi jadwal publikasi multi-slot, jeda peninjauan draf AI, parameter rotasi topik, dan integrasi Threads.
        </p>
      </div>

      {/* Bagian 1: Akun Threads */}
      <ThreadsConnection
        account={accountResult.data}
        configurationError={threadsConfigurationError()}
        loadError={!!accountResult.error}
        outcome={query.threads}
      />

      {/* Bagian 2: Jadwal Harian Utama & Parameter AI */}
      <SettingsForm initialSettings={settings} />

      {/* Bagian 3: Jadwal Rutin Multi-Slot */}
      <RecurringRulesCard initialRules={recurringRules} />

      {/* Bagian 4: Diagnostik & Pengujian Worker Otomatisasi */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Diagnostik &amp; Pengujian Sistem
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Status server, denyut nadi worker (heartbeat), dan alat pengujian manual siklus otomatisasi.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
            <span className="font-semibold text-foreground block">Mode Publikasi Server</span>
            <p className="text-muted-foreground">
              {process.env.THREADS_PUBLISH_MODE === 'live'
                ? 'Live — Konten otomatis dipublikasikan ke Meta Threads.'
                : 'Simulasi (Dry-Run) — Hanya mencatat rencana publikasi.'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
            <span className="font-semibold text-foreground block">Denyut Nadi Worker (Heartbeat)</span>
            <p className="text-muted-foreground">
              {heartbeat?.created_at
                ? `Terakhir aktif: ${new Date(heartbeat.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
                : 'Belum ada denyut nadi yang tercatat.'}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <AutomationTest />
        </div>
      </section>
    </div>
  )
}
