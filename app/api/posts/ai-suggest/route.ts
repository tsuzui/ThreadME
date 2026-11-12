import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getTextAIProvider } from '@/lib/ai/text-provider'
import { THREADME_SYSTEM_PERSONA } from '@/lib/ai/prompts/persona'

export const runtime = 'nodejs'

const suggestSchema = z.object({
  context: z.string().trim().min(3, 'Konteks minimal 3 karakter.').max(1000, 'Konteks maksimal 1000 karakter.'),
  currentContent: z.string().trim().max(1000).optional(),
  pillar: z.string().trim().max(100).optional(),
})

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  }

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 })

  const { data: isAdmin, error: adminError } = await auth.rpc('is_threadme_admin')
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: 'Akses admin diperlukan.' }, { status: 403 })
  }

  try {
    const json = await request.json()
    const parsed = suggestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { context, currentContent, pillar } = parsed.data
    const textProvider = getTextAIProvider()

    const userPrompt = `Tugas: Buat atau sesuaikan 1 postingan Threads dalam bahasa Indonesia kasual santai (gaya khas ThreadMe) menggunakan konteks berikut.

KONTEKS / ISU VIRAL DARI PENGGUNA:
"${context}"
${currentContent ? `\nDRAF TEKS SAAT INI (sebagai acuan):\n"${currentContent}"` : ''}
${pillar ? `\nPILAR / TEMA: ${pillar}` : ''}

PETUNJUK:
- Bawa konteks tersebut sebagai analogi, sudut pandang jenaka, atau sindiran halus yang sangat relate dengan kehidupan sehari-hari (contoh analogi: "gibran aja tau kapan harus mundur, masa lu enggak").
- Tetap gunakan gaya santai, singkat (1-3 kalimat, 20-300 karakter), tidak kaku seperti berita.
- Jangan gunakan kutipan formal, kata mutiara klise, atau pertanyaan retoris di akhir.

KEMBALIKAN HANYA OBJEK JSON:
{
  "content": "Isi postingan Threads dalam bahasa Indonesia",
  "pillar": "${pillar || 'realita_kehidupan'}",
  "topic": "Isu Viral",
  "angle": "Konteks Khusus Pengguna",
  "angle_category": "relatable",
  "format": "text",
  "image_prompt": null,
  "image_alt_text": null,
  "source_title": null,
  "source_url": null,
  "quality_notes": {
    "naturalness": 95,
    "originality": 95,
    "relevance": 95,
    "reason": "Disesuaikan dengan konteks viral pengguna"
  }
}`

    const genResult = await textProvider.generate({
      systemPrompt: THREADME_SYSTEM_PERSONA,
      userPrompt,
      temperature: 0.85,
    })

    const suggestion = genResult.structuredContent.content.trim()

    return NextResponse.json({
      success: true,
      suggestion,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Gagal menghasilkan usulan AI.' },
      { status: 500 }
    )
  }
}
