import 'server-only'
import type { GeneratedPostContent } from '@/lib/ai/types'

export interface QualityCheckResult {
  passed: boolean
  score: number
  issues: string[]
  similarityScore: number
}

// Pola kata klise / AI motivasi yang dilarang
const BANNED_PATTERNS = [
  /hidup ini seperti/i,
  /jangan pernah menyerah/i,
  /semangat pantang menyerah/i,
  /kalian ngerasa gitu juga gak\??$/i,
  /setuju gak\??$/i,
  /siapa yang relate\??$/i,
  /drop di kolom komentar/i,
]

export function evaluateContentQuality(
  content: GeneratedPostContent,
  recentPosts: string[]
): QualityCheckResult {
  const text = content.content.trim()
  const issues: string[] = []
  let score = 95

  // 1. Length check
  if (text.length < 15) {
    issues.push('Teks terlalu pendek (minimal 15 karakter untuk sebuah ide).')
    score -= 30
  }
  if (text.length > 500) {
    issues.push('Teks melebihi batas 500 karakter Threads.')
    score -= 50
  }

  // 2. Banned Cliché Checks
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(`Mengandung frasa klise atau pola motivasi yang dilarang (${pattern.source}).`)
      score -= 25
    }
  }

  // 3. Question hook check (hindari pertanyaan di akhir secara berulang)
  if (text.endsWith('?')) {
    score -= 5
  }

  // 4. Similarity against recent posts (Jaccard token similarity)
  let maxSimilarity = 0
  const currentTokens = tokenize(text)

  for (const pastText of recentPosts) {
    const pastTokens = tokenize(pastText)
    const sim = calculateJaccardSimilarity(currentTokens, pastTokens)
    if (sim > maxSimilarity) {
      maxSimilarity = sim
    }
  }

  const similarityScore = Math.round(maxSimilarity * 100)

  if (similarityScore > 65) {
    issues.push(`Kemiripan terlalu tinggi dengan postingan terdahulu (${similarityScore}%).`)
    score -= 35
  } else if (similarityScore > 45) {
    score -= 15
  }

  const finalScore = Math.max(0, Math.min(100, score))
  const passed = issues.length === 0 && finalScore >= 70

  return {
    passed,
    score: finalScore,
    issues,
    similarityScore,
  }
}

function tokenize(str: string): Set<string> {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9\s]/g, '')
  return new Set(cleaned.split(/\s+/).filter((w) => w.length > 2))
}

function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}
