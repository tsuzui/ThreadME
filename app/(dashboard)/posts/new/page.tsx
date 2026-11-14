import { createClient } from '@/lib/supabase/server'
import { ComposerForm } from './composer-form'
import { getTodayDateWIB } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  const supabase = await createClient()

  // Ambil pengaturan singleton untuk jam default
  const { data: settingsData } = await supabase
    .from('app_settings')
    .select('posting_time')
    .eq('singleton', true)
    .maybeSingle()

  const settings = settingsData as { posting_time: string } | null

  // Ambil daftar pilar / topik aktif untuk rekomendasi
  const { data: topics } = await supabase
    .from('content_topics')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
    .limit(1000)

  const todayWIB = getTodayDateWIB()
  const defaultTime = (settings?.posting_time || '19:00:00').slice(0, 5)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Buat Postingan Baru
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tulis manual atau minta bantuan AI dengan konteks isu viral. Pilih draf bebas, jadwalkan waktu tayang, atau langsung publikasikan sekarang.
        </p>
      </div>

      <ComposerForm
        defaultDate={todayWIB}
        defaultTime={defaultTime}
        activeTopics={topics || []}
      />
    </div>
  )
}
