import 'server-only'
import type { ContentTopic } from '@/types/topic'

export interface TopicSelectionResult {
  selectedTopic: ContentTopic
  selectionMode: 'mix' | 'focus' | 'schedule'
  reason: string
}

/**
 * Algoritma Auto Mix Rotation V1.1:
 * 1. Muat seluruh topik aktif.
 * 2. Hitung riwayat penggunaan topik dalam rentang 30 hari terakhir.
 * 3. Terapkan batas pendinginan (cooldown, default 7 hari).
 * 4. Jika seluruh topik berada dalam cooldown, relaksasi batas secara bertahap.
 * 5. Pilih topik dengan frekuensi paling rendah, bobotkan dengan priority (1-5).
 */
export function selectTopicAutoMix(
  activeTopics: ContentTopic[],
  usageHistory: { topic_id: string | null; topic: string; used_at: string }[],
  cooldownDays: number = 7
): TopicSelectionResult {
  if (activeTopics.length === 0) {
    throw new Error('Tidak ada topik aktif yang tersedia di Topic Studio.')
  }

  const now = new Date()
  const cooldownThreshold = new Date(now.getTime() - cooldownDays * 24 * 60 * 60 * 1000)

  // 1. Filter out topics used within cooldown
  const recentlyUsedTopicIds = new Set(
    usageHistory
      .filter((h) => new Date(h.used_at) >= cooldownThreshold)
      .map((h) => h.topic_id)
      .filter(Boolean)
  )

  let candidates = activeTopics.filter((t) => !recentlyUsedTopicIds.has(t.id))

  let reason = `Dipilih melalui Auto Mix dengan cooldown ${cooldownDays} hari.`

  // 2. Jika semua kandidat habis karena cooldown, relaksasi cooldown
  if (candidates.length === 0) {
    // Cari topik yang paling lama tidak digunakan
    candidates = [...activeTopics].sort((a, b) => {
      const aTime = a.last_selected_at ? new Date(a.last_selected_at).getTime() : 0
      const bTime = b.last_selected_at ? new Date(b.last_selected_at).getTime() : 0
      return aTime - bTime
    })
    reason = `Seluruh topik sedang dalam masa cooldown. Cooldown direlaksasi dan memilih topik paling lampau.`
  }

  // 3. Hitung penggunaan dalam 30 hari untuk setiap kandidat
  const thirtyDaysThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const usageCountMap = new Map<string, number>()

  for (const h of usageHistory) {
    if (new Date(h.used_at) >= thirtyDaysThreshold && h.topic_id) {
      usageCountMap.set(h.topic_id, (usageCountMap.get(h.topic_id) || 0) + 1)
    }
  }

  // 4. Skoring kandidat: bobot lebih tinggi untuk frekuensi pemakaian rendah dan prioritas tinggi
  const scored = candidates.map((topic) => {
    const usageCount = usageCountMap.get(topic.id) || 0
    // Score formula: (5 - usageCount * 1.5) + (topic.priority * 0.5)
    const baseScore = Math.max(0, 10 - usageCount * 2) + topic.priority
    // Small random jitter to prevent mechanical predictability among equal candidates
    const jitter = Math.random() * 0.5
    return {
      topic,
      score: baseScore + jitter,
      usageCount,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  const selected = scored[0].topic

  return {
    selectedTopic: selected,
    selectionMode: 'mix',
    reason,
  }
}
