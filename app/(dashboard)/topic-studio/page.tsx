import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { Sparkles, Sliders, Shield, Tag, Star, Clock } from 'lucide-react'

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
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Mode Seleksi</span>
            <div className="mt-1 text-lg font-bold text-foreground capitalize">
              {settings?.topic_mode || 'Auto Mix'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Rotasi adil berbasis riwayat 30 hari.</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Cooldown Rotasi</span>
            <div className="mt-1 text-lg font-bold text-foreground">
              {settings?.topic_rotation_cooldown_days ?? 7} Hari
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Topik tidak diulang dalam masa jeda.</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Kandidat Angle</span>
            <div className="mt-1 text-lg font-bold text-foreground">
              {settings?.angle_candidates_count ?? 5} Sudut Pandang
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dievaluasi sebelum memilih post final.</p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Style Reference</span>
            <div className="mt-1 text-lg font-bold text-emerald-500">
              {settings?.style_reference_enabled ? 'Aktif' : 'Nonaktif'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Analisis karakteristik gaya tulisan.</p>
          </div>
        </div>
      </div>

      {/* Topic Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Perpustakaan Topik ({topics.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            8 Topik Bawaan Sistem terpasang dari migrasi
          </span>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            Gagal memuat topik: {error.message}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-foreground text-base">
                      {topic.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Shield className="h-2.5 w-2.5" />
                        {topic.source_type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          topic.is_active
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {topic.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {topic.description}
                  </p>
                </div>

                <div className="mt-5 border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    Prioritas {topic.priority}/5
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {topic.last_selected_at
                      ? new Date(topic.last_selected_at).toLocaleDateString('id-ID')
                      : 'Belum terpakai'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
