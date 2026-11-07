import 'server-only'
import type { TextGenerationRequest, TextGenerationResult, GeneratedPostContent } from './types'
import { generatedPostContentSchema, contentPillarSchema, angleCategorySchema } from './schema'

export interface TextAIProvider {
  name: string
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>
}

/**
 * Anthropic Claude API Provider
 * Menggunakan direct fetch ke endpoint messages Anthropic dengan prompt caching support.
 */
export class AnthropicProvider implements TextAIProvider {
  name = 'anthropic'
  private apiKey: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || ''
    this.model = model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured.')
    }
  }

  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature ?? 0.8,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const contentBlock = data.content?.[0]

    if (!contentBlock || contentBlock.type !== 'text') {
      throw new Error('Anthropic API returned invalid or empty content block.')
    }

    const rawText = contentBlock.text
    const structuredContent = this.parseAndValidate(rawText)

    return {
      rawText,
      structuredContent,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
      },
    }
  }

  private parseAndValidate(raw: string): GeneratedPostContent {
    // Strip markdown code fences if present (e.g., ```json ... ```)
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error(`Gagal parse JSON dari model Anthropic: ${raw.slice(0, 150)}...`)
    }

    const validation = generatedPostContentSchema.safeParse(parsed)
    if (!validation.success) {
      throw new Error(
        `Validasi skema konten gagal: ${validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      )
    }

    return validation.data
  }
}

/**
 * Mock Provider
 * Fallback cerdas saat ANTHROPIC_API_KEY belum disetel di .env.local,
 * menjamin seluruh pipeline dan preview UI dapat diuji secara natural.
 */
export class MockProvider implements TextAIProvider {
  name = 'mock'

  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    // Generate realistic sample post in Indonesian ThreadMe voice
    const samplePosts: GeneratedPostContent[] = [
      {
        pillar: 'realita_kehidupan',
        topic: 'Overthinking',
        angle: 'Skenario hidup jam satu pagi',
        angle_category: 'humor',
        content: 'Niatnya cuma rebahan 5 menit sebelum tidur. Tiba-tiba otak muter ulang percakapan tahun 2018 dan nanya kenapa waktu itu jawabnya begitu.',
        format: 'text',
        image_prompt: null,
        image_alt_text: null,
        source_title: null,
        source_url: null,
        quality_notes: {
          naturalness: 94,
          originality: 90,
          relevance: 95,
          reason: 'Natural, relatable, tidak klise motivasi.',
        },
      },
      {
        pillar: 'galau_tapi_lucu',
        topic: 'Tidak dianggap',
        angle: 'Notifikasi sepi tapi kuota habis',
        angle_category: 'vulnerable',
        content: 'Nungguin kabar dari orang yang bahkan gak inget kita ada di kontaknya itu ibarat nunggu busway di bandara. Gak nyambung dan capek sendiri.',
        format: 'text',
        image_prompt: null,
        image_alt_text: null,
        source_title: null,
        source_url: null,
        quality_notes: {
          naturalness: 92,
          originality: 88,
          relevance: 91,
          reason: 'Humor getir khas anak muda.',
        },
      },
      {
        pillar: 'random_thoughts',
        topic: 'Humor kehidupan',
        angle: 'Misteri belanja online jam malam',
        angle_category: 'everyday_observation',
        content: 'Di keranjang belanja ada barang yang gue sendiri gak tau fungsinya buat apa, tapi pas checkout ngerasa hidup bakal hampa kalo gak beli.',
        format: 'text',
        image_prompt: null,
        image_alt_text: null,
        source_title: null,
        source_url: null,
        quality_notes: {
          naturalness: 95,
          originality: 93,
          relevance: 96,
          reason: 'Observasi spontan dan sangat relate.',
        },
      },
    ]

    const selected = samplePosts[Math.floor(Math.random() * samplePosts.length)]

    return {
      rawText: JSON.stringify(selected, null, 2),
      structuredContent: selected,
      provider: this.name,
      model: 'mock-engine-v1',
      usage: {
        promptTokens: 120,
        completionTokens: 80,
      },
    }
  }
}

/**
 * Factory helper untuk mendapatkan TextAIProvider aktif
 */
export class GeminiProvider implements TextAIProvider {
  name = 'gemini'
  private apiKey: string
  private model: string

  constructor(apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL) {
    if (!apiKey?.trim()) {
      throw new Error('Isi GEMINI_API_KEY di .env.local untuk menggunakan Gemini.')
    }
    this.apiKey = apiKey.trim()
    this.model = model?.trim() || 'gemini-3.5-flash-lite'
  }

  async generate(request: TextGenerationRequest): Promise<TextGenerationResult> {
    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          signal: AbortSignal.timeout(60_000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
            generationConfig: {
              temperature: request.temperature ?? 0.85,
              maxOutputTokens: request.maxTokens ?? 4096,
              responseMimeType: 'application/json',
              responseJsonSchema: {
                type: 'object',
                properties: {
                  pillar: { type: 'string', enum: contentPillarSchema.options },
                  topic: { type: 'string' },
                  angle: { type: 'string' },
                  angle_category: { type: 'string', enum: angleCategorySchema.options },
                  content: { type: 'string', description: 'Postingan Threads berbahasa Indonesia, 15–500 karakter.' },
                  format: { type: 'string', enum: ['text', 'image'] },
                  image_prompt: { type: ['string', 'null'] },
                  image_alt_text: { type: ['string', 'null'] },
                  source_title: { type: ['string', 'null'] },
                  source_url: { type: ['string', 'null'] },
                  quality_notes: {
                    type: 'object',
                    properties: {
                      naturalness: { type: 'number', minimum: 0, maximum: 100 },
                      originality: { type: 'number', minimum: 0, maximum: 100 },
                      relevance: { type: 'number', minimum: 0, maximum: 100 },
                      reason: { type: 'string' },
                    },
                    required: ['naturalness', 'originality', 'relevance', 'reason'],
                  },
                },
                required: ['pillar', 'topic', 'angle', 'angle_category', 'content', 'format',
                  'image_prompt', 'image_alt_text', 'source_title', 'source_url', 'quality_notes'],
              },
            },
          }),
        }
      )
    } catch {
      throw new Error('Tidak dapat menghubungi Gemini atau waktu permintaan habis. Silakan coba lagi.')
    }

    if (!response.ok) {
      const guidance = response.status === 429
        ? 'Gagal membuat draf: kuota Gemini habis atau terlalu banyak permintaan dalam waktu singkat. Tunggu beberapa saat lalu coba lagi. Jika masih gagal, periksa Usage di Google AI Studio dan tunggu hingga kuota tersedia kembali. Draf yang sudah tersimpan tidak diubah.'
        : response.status === 400 || response.status === 401 || response.status === 403
          ? 'Periksa API key, akses project, dan konfigurasi model Gemini.'
          : response.status === 404
            ? 'Model Gemini tidak tersedia. Periksa GEMINI_MODEL.'
            : 'Layanan Gemini mengalami kendala. Silakan coba lagi.'
      throw new Error(`Gemini API (${response.status}): ${guidance}`)
    }

    const data = await response.json() as {
      promptFeedback?: { blockReason?: string }
      candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[]
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }
    const candidate = data.candidates?.[0]
    if (data.promptFeedback?.blockReason || (candidate?.finishReason && candidate.finishReason !== 'STOP')) {
      throw new Error('Gemini tidak menyelesaikan konten (filter keamanan atau batas output). Silakan coba lagi.')
    }
    const rawText = candidate?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text ?? '').join('').trim()
    if (!rawText) throw new Error('Gemini mengembalikan konten kosong.')

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      throw new Error('Respons Gemini bukan JSON valid. Silakan coba lagi.')
    }
    const validated = generatedPostContentSchema.safeParse(parsed)
    if (!validated.success) {
      throw new Error('Struktur konten Gemini tidak sesuai skema ThreadMe. Silakan coba lagi.')
    }
    return {
      rawText,
      structuredContent: validated.data,
      provider: this.name,
      model: this.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  }
}

export function getTextAIProvider(): TextAIProvider {
  const provider = process.env.TEXT_AI_PROVIDER || 'anthropic'
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (provider === 'gemini') return new GeminiProvider()

  if (provider === 'anthropic' && apiKey) {
    return new AnthropicProvider(apiKey)
  }

  // Fallback to mock if API key is missing
  return new MockProvider()
}
