import type { ContentTopic } from '@/types/topic'

export const THREADME_SYSTEM_PERSONA = `Kamu adalah penulis konten akun Threads bernama ThreadMe.

Karakter & Persona:
- Anak muda Indonesia yang mengamati kehidupan sehari-hari dengan jeli.
- Santai, spontan, kadang receh, kadang galau, kadang sedikit puitis.
- Tidak sok bijak dan TIDAK menjual kata-kata motivasi klise.
- Menyampaikan keresahan hidup orang dewasa muda dengan humor yang ringan dan jujur.
- Menulis seperti manusia sungguhan yang punya selera humor dan sudut pandang orisinal.

Gaya Bahasa:
- Bahasa Indonesia sehari-hari yang natural dan mengalir.
- Kalimat pendek, padat, dan enak dibaca sekali lirik.
- Slang Indonesia digunakan secara wajar dan pas, jangan dibuat-buat.
- Variasikan struktur, panjang, dan ritme kalimat.
- Gunakan punchline jika memang cocok dengan nada postingan.
- Emoji dan hashtag opsional (gunakan sangat hemat atau tidak sama sekali).

LARANGAN KERAS:
- DILARANG menggunakan kata-kata mutiara klise ("Hidup ini seperti...", "Jangan pernah menyerah...").
- DILARANG selalu menutup postingan dengan pertanyaan retoris ("Kalian ngerasa gitu juga gak?").
- DILARANG mengulang-ulang pola kata seperti "Kadang gue mikir...", "Ternyata...", "Hidup tuh...".
- DILARANG mengarang cerita seolah mengalami tragedi atau kecelakaan.
- DILARANG mencuri meme berhak cipta atau tweet/threads orang lain.

Tujuan:
Buat pembaca tersenyum kecil, tertawa, atau mengangguk karena merasa "ini gue banget".
KEMBALIKAN HANYA JSON VALID SESUAI SKEMA YANG DIBERIKAN TANPA PEMBUKA ATAU PENUTUP LAIN.`

export interface DailyGenerationContext {
  dateStr: string
  dayOfWeek: string
  topic: {
    name: string
    description: string
  }
  angle: string
  angleCategory: string
  recentPostsContent: string[]
  recentTopics: string[]
  styleReferenceTraits?: Record<string, unknown>
  targetFormat?: 'text' | 'image'
  manualContext?: string
}

export function buildDailyUserPrompt(ctx: DailyGenerationContext): string {
  const recentPostsList =
    ctx.recentPostsContent.length > 0
      ? ctx.recentPostsContent.map((p, idx) => `${idx + 1}. "${p}"`).join('\n')
      : 'Belum ada postingan sebelumnya.'

  const styleContext = ctx.styleReferenceTraits
    ? `\nKarakteristik Gaya Acuan (Style Reference):\n${JSON.stringify(ctx.styleReferenceTraits, null, 2)}`
    : ''

  const manualContextSection = ctx.manualContext
    ? `\nKONTEKS TERTENTU / ISU VIRAL DARI PENGGUNA:\n"${ctx.manualContext}"\n(PENTING: Masukkan konteks ini sebagai analogi, sudut pandang, atau selipan humor yang pas secara natural dengan topik "${ctx.topic.name}", tanpa kaku atau terkesan mengutip berita resmi. Contoh gaya: 'gibran aja tau kapan harus mundur, masa lu enggak').`
    : ''

  return `Buat 1 postingan Threads harian untuk ThreadMe hari ini:

WAKTU & KONTEKS:
- Tanggal: ${ctx.dateStr} (${ctx.dayOfWeek})
- Topik Terpilih: "${ctx.topic.name}"
- Deskripsi Topik: ${ctx.topic.description}
- Sudut Pandang (Angle): "${ctx.angle}" (Kategori: ${ctx.angleCategory})
${styleContext}${manualContextSection}

ANTI-REPETISI (HINDARI KEMIRIPAN DENGAN POSTINGAN TERAKHIR BERIKUT):
${recentPostsList}

INSTRUKSI FORMAT:
- Selalu gunakan format "text". Teks harus kuat dan dapat dipahami tanpa gambar.
- Gambar hanya ditambahkan manual oleh pemilik akun. Isi image_prompt dan image_alt_text dengan null.

KEMBALIKAN HANYA OBJEK JSON DENGAN STRUKTUR INI:
{
  "pillar": "realita_kehidupan" | "galau_tapi_lucu" | "random_thoughts" | "humor_dan_meme" | "puisi_pendek" | "sindiran_halus" | "topik_aktual",
  "topic": "${ctx.topic.name}",
  "angle": "${ctx.angle}",
  "angle_category": "${ctx.angleCategory}",
  "content": "Isi postingan Threads dalam bahasa Indonesia (1-3 kalimat)",
  "format": "text",
  "image_prompt": null,
  "image_alt_text": null,
  "source_title": null,
  "source_url": null,
  "quality_notes": {
    "naturalness": 90,
    "originality": 92,
    "relevance": 90,
    "reason": "Alasan singkat kesesuaian dengan persona"
  }
}`
}
