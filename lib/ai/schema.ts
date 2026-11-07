import { z } from 'zod'

export const contentPillarSchema = z.enum([
  'galau_tapi_lucu',
  'realita_kehidupan',
  'random_thoughts',
  'humor_dan_meme',
  'puisi_pendek',
  'sindiran_halus',
  'topik_aktual',
])

export const angleCategorySchema = z.enum([
  'humor',
  'vulnerable',
  'ironic',
  'poetic',
  'self_reflection',
  'everyday_observation',
  'satire',
])

export const angleCandidateSchema = z.object({
  category: angleCategorySchema,
  angle: z.string().min(3),
  description: z.string().min(5),
})

export const generatedPostContentSchema = z.object({
  pillar: contentPillarSchema,
  topic: z.string().min(2),
  angle: z.string().min(3),
  angle_category: angleCategorySchema.default('everyday_observation'),
  content: z
    .string()
    .min(10, 'Konten postingan terlalu pendek (minimal 10 karakter)')
    .max(500, 'Konten postingan melebihi batas Threads 500 karakter'),
  format: z.enum(['text', 'image']),
  image_prompt: z.string().nullable().default(null),
  image_alt_text: z.string().nullable().default(null),
  source_title: z.string().nullable().default(null),
  source_url: z.string().nullable().default(null),
  quality_notes: z.object({
    naturalness: z.number().min(0).max(100).default(85),
    originality: z.number().min(0).max(100).default(85),
    relevance: z.number().min(0).max(100).default(85),
    reason: z.string().default('Evaluasi otomatis persona ThreadMe.'),
  }),
})

export type GeneratedPostContentValidated = z.infer<typeof generatedPostContentSchema>
