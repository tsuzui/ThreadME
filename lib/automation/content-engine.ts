import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTextAIProvider } from '@/lib/ai/text-provider'
import { THREADME_SYSTEM_PERSONA, buildDailyUserPrompt } from '@/lib/ai/prompts/persona'
import { selectTopicAutoMix } from './topic-rotation'
import { generateCandidateAngles } from './angle-generator'
import { evaluateContentQuality } from './quality-check'
import { getTodayDateWIB } from '@/lib/utils'
import type { Database } from '@/types/database'
import type { ContentTopic } from '@/types/topic'

type ContentPostRow = Database['public']['Tables']['content_posts']['Row']

export interface GeneratePostOptions {
  manualPreview?: boolean
  forcedTopicId?: string
}

export interface GeneratePostResult {
  success: boolean
  postId?: string
  topic: string
  angle: string
  content: string
  format: 'text' | 'image'
  qualityScore: number
  qualityNotes: Record<string, unknown>
  error?: string
}

export async function runDailyContentEngine(
  options: GeneratePostOptions = {}
): Promise<GeneratePostResult> {
  const supabase = createServiceRoleClient()
  const todayWIB = getTodayDateWIB()

  // 1. Ambil pengaturan singleton
  const { data: settingsData, error: settingsError } = await supabase
    .from('app_settings')
    .select('*')
    .eq('singleton', true)
    .single()

  if (settingsError || !settingsData) {
    throw new Error('Gagal memuat konfigurasi app_settings.')
  }

  // 2. Muat topik aktif
  const { data: topicsData, error: topicsError } = await supabase
    .from('content_topics')
    .select('*')
    .eq('is_active', true)

  if (topicsError || !topicsData || topicsData.length === 0) {
    throw new Error('Tidak ada topik aktif di Topic Studio.')
  }

  // 3. Muat riwayat topik 30 hari terakhir
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: historyData } = await supabase
    .from('topic_history')
    .select('topic_id, topic, used_at, angle_fingerprint')
    .gte('used_at', thirtyDaysAgo)

  const usageHistory = (historyData || []).map((h) => ({
    topic_id: h.topic_id,
    topic: h.topic,
    used_at: h.used_at,
  }))

  const recentAngleFingerprints = (historyData || [])
    .map((h) => h.angle_fingerprint)
    .filter(Boolean) as string[]

  // 4. Pilih topik via Auto Mix
  const activeTopics = topicsData as ContentTopic[]
  const topicSelection = selectTopicAutoMix(
    activeTopics,
    usageHistory,
    settingsData.topic_rotation_cooldown_days ?? 7
  )
  const selectedTopic = topicSelection.selectedTopic

  // 5. Generate kandidat angle & pilih yang terkuat
  const angleSelection = generateCandidateAngles(
    selectedTopic,
    recentAngleFingerprints,
    settingsData.angle_candidates_count ?? 5
  )
  const chosenAngle = angleSelection.chosenAngle

  // 6. Muat konten postingan terakhir untuk anti-repetisi
  const { data: recentPostsData } = await supabase
    .from('content_posts')
    .select('content')
    .order('created_at', { ascending: false })
    .limit(30)

  const recentPostsContent = (recentPostsData || []).map((p) => p.content)

  // 7. Siapkan prompt & jalankan Text AI Provider
  const textProvider = getTextAIProvider()
  const now = new Date()
  const dayOfWeek = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
  }).format(now)

  const userPrompt = buildDailyUserPrompt({
    dateStr: todayWIB,
    dayOfWeek,
    topic: {
      name: selectedTopic.name,
      description: selectedTopic.description,
    },
    angle: chosenAngle.angle,
    angleCategory: chosenAngle.category,
    recentPostsContent,
    recentTopics: usageHistory.map((u) => u.topic),
  })

  let finalContent = null
  let attempts = 0
  const maxRetries = settingsData.max_generation_retries ?? 2

  while (attempts <= maxRetries) {
    attempts++
    const genResult = await textProvider.generate({
      systemPrompt: THREADME_SYSTEM_PERSONA,
      userPrompt,
      temperature: 0.85,
    })

    const validation = evaluateContentQuality(
      genResult.structuredContent,
      recentPostsContent
    )

    if (validation.passed) {
      finalContent = genResult.structuredContent
      break
    }
  }

  if (!finalContent) {
    throw new Error('Gagal menghasilkan konten setelah batas percobaan ulang.')
  }

  // 8. Simpan ke database jika bukan simulasi murni
  // Target waktu posting: hari ini pukul posting_time WIB
  const postingTime = settingsData.posting_time || '19:00:00'
  const scheduledFor = new Date(`${todayWIB}T${postingTime}+07:00`).toISOString()

  // Simpan record ke topic_history
  const { data: insertedTopicHistory } = await supabase
    .from('topic_history')
    .insert({
      topic_id: selectedTopic.id,
      topic: selectedTopic.name,
      pillar: finalContent.pillar,
      angle: chosenAngle.angle,
      angle_type: chosenAngle.category,
      angle_fingerprint: angleSelection.fingerprint,
      selection_mode: 'mix',
      candidate_angles: angleSelection.candidates as unknown as Database['public']['Tables']['topic_history']['Insert']['candidate_angles'],
      source_title: finalContent.source_title,
      source_url: finalContent.source_url,
      used_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  // Perbarui last_selected_at pada topik terpilih
  await supabase
    .from('content_topics')
    .update({ last_selected_at: new Date().toISOString() })
    .eq('id', selectedTopic.id)

  // Simpan record draf konten ke content_posts
  // Cek apakah postingan untuk hari ini sudah ada
  const { data: existingPost } = await supabase
    .from('content_posts')
    .select('id, status')
    .eq('scheduled_date', todayWIB)
    .maybeSingle()

  let insertedPostId: string | undefined = existingPost?.id

  // Jika belum ada atau belum dipublikasi, simpan draf
  // Catatan: content_type harus 'text' jika belum ada image_storage_path karena constraint check image_post_has_asset
  const postPayload = {
    scheduled_date: todayWIB,
    scheduled_for: scheduledFor,
    content: finalContent.content,
    content_type: 'text' as const,
    pillar: finalContent.pillar,
    tone: chosenAngle.category,
    topic_id: selectedTopic.id,
    angle: chosenAngle.angle,
    topic_history_id: insertedTopicHistory?.id || null,
    content_fingerprint: angleSelection.fingerprint,
    quality_score: finalContent.quality_notes.naturalness,
    quality_notes: finalContent.quality_notes,
    status: 'ready' as const,
    generation_metadata: {
      provider: textProvider.name,
      attempts,
      candidatesCount: angleSelection.candidates.length,
      manualPreview: !!options.manualPreview,
      intendedFormat: finalContent.format,
      imagePrompt: finalContent.image_prompt,
      imageAltText: finalContent.image_alt_text,
    },
  }

  if (existingPost && existingPost.status !== 'published') {
    const { error: updateError } = await supabase
      .from('content_posts')
      .update(postPayload)
      .eq('id', existingPost.id)

    if (updateError) {
      throw new Error(`Gagal memperbarui draf konten: ${updateError.message}`)
    }
    insertedPostId = existingPost.id
  } else if (!existingPost) {
    const { data: createdPost, error: insertError } = await supabase
      .from('content_posts')
      .insert(postPayload)
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`Gagal menyimpan draf konten ke database: ${insertError.message}`)
    }
    insertedPostId = createdPost?.id
  }

  // Catat audit ke system_logs
  await supabase.from('system_logs').insert({
    content_post_id: insertedPostId || null,
    level: 'info',
    event: options.manualPreview ? 'manual_preview_generated' : 'daily_content_generated',
    message: `Draf konten berhasil dibuat untuk topik "${selectedTopic.name}" dengan sudut pandang "${chosenAngle.angle}".`,
    details: {
      topic: selectedTopic.name,
      angle: chosenAngle.angle,
      format: finalContent.format,
      attempts,
    },
  })

  return {
    success: true,
    postId: insertedPostId,
    topic: selectedTopic.name,
    angle: chosenAngle.angle,
    content: finalContent.content,
    format: finalContent.format,
    qualityScore: finalContent.quality_notes.naturalness,
    qualityNotes: finalContent.quality_notes,
  }
}
