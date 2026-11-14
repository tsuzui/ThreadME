import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { Sliders } from 'lucide-react'
import { TopicManager } from './topic-manager'

export const dynamic = 'force-dynamic'

type ContentTopic = Database['public']['Tables']['content_topics']['Row']
type AppSettings = Database['public']['Tables']['app_settings']['Row']

export default async function TopicStudioPage() {
  const supabase = await createClient()

  // 1. Fetch settings for Topic Studio configuration
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('*')
    .eq('singleton', true)
    .single()
  const settings = settingsData as AppSettings | null

  // 2. Fetch seeded topics from content_topics
  const { data: rawTopics, error } = await supabase
    .from('content_topics')
    .select('*')
    .order('priority', { ascending: false })
    .order('name', { ascending: true })

  const topics = (rawTopics as ContentTopic[] | null) || []

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Topic Studio
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              V1.1
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Perpustakaan topik editorial dan konfigurasi rotasi Auto Mix harian.
          </p>
        </div>
      </div>

      {/* Rotation Settings Summary Banner */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Konfigurasi Rotasi Topik (Auto Mix)
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-primary/10 bg-accent p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Mode Seleksi</span>
            <div className="mt-1 text-lg font-bold text-foreground capitalize">
              {settings?.topic_mode || 'Auto Mix'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Rotasi adil berbasis riwayat 30 hari.</p>
          </div>

          <div className="rounded-xl border border-primary/10 bg-accent p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Cooldown Rotasi</span>
            <div className="mt-1 text-lg font-bold text-foreground">
              {settings?.topic_rotation_cooldown_days ?? 7} Hari
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Topik tidak diulang dalam masa jeda.</p>
          </div>

          <div className="rounded-xl border border-primary/10 bg-accent p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Kandidat Angle</span>
            <div className="mt-1 text-lg font-bold text-foreground">
              {settings?.angle_candidates_count ?? 5} Sudut Pandang
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dievaluasi sebelum memilih post final.</p>
          </div>

          <div className="rounded-xl border border-primary/10 bg-accent p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Style Reference</span>
            <div className="mt-1 text-lg font-bold text-emerald-500">
              {settings?.style_reference_enabled ? 'Aktif' : 'Nonaktif'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Analisis karakteristik gaya tulisan.</p>
          </div>
        </div>
      </div>

      {/* Topic Library with CRUD Manager */}
      <TopicManager initialTopics={topics} loadError={error ? error.message : null} />
    </div>
  )
}
