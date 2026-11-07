export type ContentPillar =
  | 'galau_tapi_lucu'
  | 'realita_kehidupan'
  | 'random_thoughts'
  | 'humor_dan_meme'
  | 'puisi_pendek'
  | 'sindiran_halus'
  | 'topik_aktual'

export type AngleCategory =
  | 'humor'
  | 'vulnerable'
  | 'ironic'
  | 'poetic'
  | 'self_reflection'
  | 'everyday_observation'
  | 'satire'

export interface AngleCandidate {
  category: AngleCategory
  angle: string
  description: string
}

export interface TextGenerationRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface TextGenerationResult {
  rawText: string
  structuredContent: GeneratedPostContent
  provider: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface GeneratedPostContent {
  pillar: ContentPillar
  topic: string
  angle: string
  angle_category: AngleCategory
  content: string
  format: 'text' | 'image'
  image_prompt: string | null
  image_alt_text: string | null
  source_title: string | null
  source_url: string | null
  quality_notes: {
    naturalness: number
    originality: number
    relevance: number
    reason: string
  }
}
