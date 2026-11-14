import 'server-only'
import { randomUUID } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTextAIProvider } from '@/lib/ai/text-provider'
import { THREADME_SYSTEM_PERSONA, buildDailyUserPrompt } from '@/lib/ai/prompts/persona'
import { selectTopicAutoMix } from './topic-rotation'
import { generateCandidateAngles } from './angle-generator'
import { evaluateContentQuality } from './quality-check'
import { getTodayDateWIB } from '@/lib/utils'
import type { Database, Json } from '@/types/database'
import type { ContentTopic } from '@/types/topic'

type ContentPostRow = Database['public']['Tables']['content_posts']['Row']

export interface GeneratePostOptions {
  manualPreview?: boolean
  forcedTopicId?: string
  slotId?: string
  context?: string
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

  const proposalOnly = !!options.manualPreview && !options.slotId
  let existingPost: ContentPostRow | null = null
  let lease = ''

  if (!proposalOnly) {
    let existingPostQuery = supabase.from('content_posts').select('*').eq('scheduled_date', todayWIB)
    if (options.slotId) {
      existingPostQuery = existingPostQuery.eq('slot_id', options.slotId)
    } else {
      existingPostQuery = existingPostQuery.is('slot_id', null)
    }
    const { data: foundPost, error: existingError } = await existingPostQuery.maybeSingle()
    if (existingError) throw new Error('Gagal memeriksa draf hari ini.')
    existingPost = foundPost
    if (existingPost) {
      const metadata = existingPost.generation_metadata as Record<string, unknown> | null
      if (existingPost.status !== 'ready' || metadata?.manuallyEdited || existingPost.image_storage_path) {
        throw new Error('Postingan untuk jadwal ini sudah tersedia atau telah diedit manual. Buka kalender untuk melihat atau mengedit draf; generasi tidak menimpanya.')
      }
    }

    lease = randomUUID()
    const { data: claimed, error: claimError } = options.slotId
      ? await supabase.rpc('claim_slot_generation', {
          p_date: todayWIB,
          p_slot_id: options.slotId,
          p_lease: lease,
          p_manual: !!options.manualPreview,
          p_version: existingPost?.updated_at || null,
        })
      : await supabase.rpc('claim_daily_generation', {
          p_date: todayWIB,
          p_lease: lease,
          p_manual: !!options.manualPreview,
          p_version: existingPost?.updated_at || null,
        })
    if (claimError || !claimed) throw new Error('Generasi belum dapat diklaim: proses lain aktif, jadwal belum tiba, atau batas percobaan tercapai.')
  }

  try {
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

  // 4. Pilih topik: gunakan forcedTopicId jika disediakan, atau via Auto Mix
  const activeTopics = topicsData as ContentTopic[]
  let selectedTopic: ContentTopic
  if (options.forcedTopicId) {
    const forced = activeTopics.find((t) => t.id === options.forcedTopicId)
    if (!forced) {
      throw new Error('Topik yang dipilih tidak ditemukan atau sedang tidak aktif.')
    }
    selectedTopic = forced
  } else {
    const topicSelection = selectTopicAutoMix(
      activeTopics,
      usageHistory,
      settingsData.topic_rotation_cooldown_days ?? 7
    )
    selectedTopic = topicSelection.selectedTopic
  }

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
    manualContext: options.context || existingPost?.context || undefined,
  })

  let finalContent = null
  let attempts = 0
  const maxRetries = options.manualPreview ? (settingsData.max_generation_retries ?? 2) : 0

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
      finalContent = { ...genResult.structuredContent, format: 'text' as const, image_prompt: null, image_alt_text: null }
      break
    }
  }

  if (!finalContent) {
    throw new Error('Gagal menghasilkan konten setelah batas percobaan ulang.')
  }

  // Jika hanya uji coba / proposal manual tanpa slot kaku, kembalikan langsung tanpa menyentuh jadwal
  if (proposalOnly) {
    return {
      success: true,
      topic: selectedTopic.name,
      angle: chosenAngle.angle,
      content: finalContent.content,
      format: finalContent.format,
      qualityScore: finalContent.quality_notes.naturalness,
      qualityNotes: finalContent.quality_notes,
    }
  }

  // 8. Simpan ke database jika bukan simulasi murni
  // Target waktu posting: hari ini pukul posting_time WIB
  const postingTime = settingsData.posting_time || '19:00:00'
  const scheduledFor = new Date(`${todayWIB}T${postingTime}+07:00`).toISOString()

  // Simpan record ke topic_history
  const historyPayload = {
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
  }

  // Jika belum ada atau belum dipublikasi, simpan draf
  // Catatan: content_type harus 'text' jika belum ada image_storage_path karena constraint check image_post_has_asset
  const postPayload = {
    scheduled_date: todayWIB,
    scheduled_for: scheduledFor,
    updated_at: new Date().toISOString(),
    content: finalContent.content,
    content_type: 'text' as const,
    pillar: finalContent.pillar,
    tone: chosenAngle.category,
    topic_id: selectedTopic.id,
    angle: chosenAngle.angle,
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

  const { data: insertedPostId, error: finalizeError } = options.slotId
    ? await supabase.rpc('finalize_slot_generation', {
        p_date: todayWIB,
        p_slot_id: options.slotId,
        p_lease: lease,
        p_version: existingPost?.updated_at || null,
        p_manual: !!options.manualPreview,
        p_post: postPayload as unknown as Json,
        p_history: historyPayload as unknown as Json,
      })
    : await supabase.rpc('finalize_daily_generation', {
        p_date: todayWIB,
        p_lease: lease,
        p_version: existingPost?.updated_at || null,
        p_manual: !!options.manualPreview,
        p_post: postPayload as unknown as Json,
        p_history: historyPayload as unknown as Json,
      })
  if (finalizeError || !insertedPostId) throw new Error('Draf berubah atau klaim generasi berakhir. Hasil tidak menimpa perubahan terbaru.')

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
      slotId: options.slotId || null,
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
  } catch (error) {
    if (proposalOnly) throw error
    if (options.slotId) {
      await supabase.rpc('fail_slot_generation', { p_date: todayWIB, p_slot_id: options.slotId, p_lease: lease })
    } else {
      await supabase.rpc('fail_daily_generation', { p_date: todayWIB, p_lease: lease })
    }
    throw error
  }
}
