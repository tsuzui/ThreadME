import 'server-only'
import type { AngleCandidate, AngleCategory } from '@/lib/ai/types'
import type { ContentTopic } from '@/types/topic'

/**
 * Built-in bank template angle generator per topik bawaan V1.1
 * Menghasilkan 3-5 variasi sudut pandang unik untuk dievaluasi
 */
const TOPIC_ANGLE_TEMPLATES: Record<string, AngleCandidate[]> = {
  'tidak-dianggap': [
    {
      category: 'humor',
      angle: 'Layanan jam kantor untuk perhatian',
      description: 'Memperlakukan perhatian orang lain seperti loket kelurahan yang selalu tutup saat dibutuhkan.',
    },
    {
      category: 'vulnerable',
      angle: 'Hadir tapi tembus pandang',
      description: 'Keresahan saat fisik ada di tongkrongan tapi obrolan berjalan tanpa mengikutsertakan diri.',
    },
    {
      category: 'ironic',
      angle: 'Kontak darurat cadangan',
      description: 'Baru dichat ketika teman-teman utamanya sedang tidak bisa dihubungi.',
    },
    {
      category: 'self_reflection',
      angle: 'Sadar posisi tanpa marah',
      description: 'Menyadari bahwa tidak diprioritaskan sebenarnya adalah jawaban yang sangat jelas.',
    },
    {
      category: 'poetic',
      angle: 'Koma tanpa kelanjutan',
      description: 'Menjadi jeda dalam kalimat orang lain tanpa pernah menjadi kata utama.',
    },
  ],
  'baru-putus-cinta': [
    {
      category: 'humor',
      angle: 'Canggung berselancar di profil mantan',
      description: 'Ketakutan jempol terpeleset memencet tombol like pada foto lama.',
    },
    {
      category: 'everyday_observation',
      angle: 'Refleks membuka aplikasi chat',
      description: 'Membuka layar ponsel tanpa tujuan karena biasanya ada orang yang dikabari hal sepele.',
    },
    {
      category: 'self_reflection',
      angle: 'Membeli kembali waktu sendiri',
      description: 'Momen lega saat menyadari hari libur sekarang sepenuhnya milik diri sendiri.',
    },
    {
      category: 'vulnerable',
      angle: 'Lagu random di minimarket',
      description: 'Mendadak teringat memori hanya karena playlist kasir yang tidak tahu situasi hati.',
    },
    {
      category: 'satire',
      angle: 'Konsultasi cinta ke teman yang sama-sama jomblo',
      description: 'Dua orang gagal asmara saling memberi nasihat hubungan layaknya profesor.',
    },
  ],
  'excited-sendirian': [
    {
      category: 'humor',
      angle: 'Panjang vs Ya',
      description: 'Kontras ketikan cerita tiga paragraf penuh semangat yang hanya dibalas kata "Wkwk ya".',
    },
    {
      category: 'vulnerable',
      angle: 'Meredupkan antusiasme sendiri',
      description: 'Menarik kembali cerita seru karena lawan bicara terlihat melirik jam atau ponsel.',
    },
    {
      category: 'everyday_observation',
      angle: 'Nonton film seru sendirian',
      description: 'Pengalaman menikmati hal favorit tanpa perlu mencocokkan selera dengan siapapun.',
    },
    {
      category: 'self_reflection',
      angle: 'Menemukan frekuensi yang tepat',
      description: 'Belajar bahwa antusiasme tidak salah, hanya butuh pendengar yang tepat.',
    },
  ],
  overthinking: [
    {
      category: 'humor',
      angle: 'Skenario mustahil jam 1 malam',
      description: 'Otak menyusun strategi penyelamatan diri dari situasi yang kemungkinannya 0.001%.',
    },
    {
      category: 'everyday_observation',
      angle: 'Satu email tanpa emoji',
      description: 'Menganalisis tanda baca dan intonasi teks atasan padahal beliau hanya sedang sibuk.',
    },
    {
      category: 'self_reflection',
      angle: 'Lelah oleh pikiran sendiri',
      description: 'Menyadari musuh paling berat seharian ini ternyata isi kepala sendiri.',
    },
    {
      category: 'ironic',
      angle: 'Rencana hidup 5 tahun ke depan',
      description: 'Mikir masa depan terlalu jauh sampai lupa mematikan kompor di dapur.',
    },
  ],
  'cinta-bertepuk-sebelah-tangan': [
    {
      category: 'humor',
      angle: 'Support system tanpa imbalan',
      description: 'Selalu ada saat dia curhat tentang orang lain yang dia sukai.',
    },
    {
      category: 'vulnerable',
      angle: 'Menyimpan rasa dalam candaan',
      description: 'Takut mengungkapkan perasaan karena takut kehilangan obrolan santai yang ada.',
    },
    {
      category: 'self_reflection',
      angle: 'Pamit pelan-pelan',
      description: 'Berhenti memulai chat dan melihat apakah dia pernah mencari.',
    },
    {
      category: 'poetic',
      angle: 'Menyukai dari jarak aman',
      description: 'Cukup melihatnya bahagia meski bukan kita alasannya.',
    },
  ],
  'humor-kehidupan': [
    {
      category: 'everyday_observation',
      angle: 'Pengeluaran sepele yang membengkak',
      description: 'Hemat makan siang tapi jajan kopi dan ongkir tanpa rasa bersalah.',
    },
    {
      category: 'humor',
      angle: 'Badan minta tidur tapi jempol minta scroll',
      description: 'Pertarungan abadi antara kantung mata dan algoritma media sosial.',
    },
    {
      category: 'satire',
      angle: 'Pura-pura paham obrolan dewasa',
      description: 'Mengangguk saat orang bahas investasi padahal saldo tabungan pas-pasan.',
    },
  ],
  kesepian: [
    {
      category: 'vulnerable',
      angle: 'Kamar hening setelah hari ramai',
      description: 'Perbedaan kontras antara suara tawa di luar dan keheningan saat pulang.',
    },
    {
      category: 'everyday_observation',
      angle: 'Menemani diri sendiri makan',
      description: 'Momen menikmati semangkuk mie hangat di meja kecil tanpa ada yang menunggu.',
    },
    {
      category: 'self_reflection',
      angle: 'Damai bukan berarti hampa',
      description: 'Belajar berteman akrab dengan kesendirian tanpa merasa tertinggal.',
    },
  ],
  'random-thoughts': [
    {
      category: 'humor',
      angle: 'Misteri jemuran dan hujan',
      description: 'Hukum alam bahwa hujan baru turun lima menit setelah jemuran ditinggal pergi.',
    },
    {
      category: 'everyday_observation',
      angle: 'Lagu masa kecil yang liriknya ternyata aneh',
      description: 'Baru sadar makna lagu kartun setelah beranjak dewasa.',
    },
    {
      category: 'ironic',
      angle: 'Beli barang pelengkap sebelum barang utama',
      description: 'Sudah beli casing ponsel tapi ponsel barunya belum terbeli.',
    },
  ],
}

export function generateCandidateAngles(
  topic: ContentTopic,
  recentAngleFingerprints: string[] = [],
  desiredCount: number = 5
): {
  candidates: AngleCandidate[]
  chosenAngle: AngleCandidate
  fingerprint: string
} {
  const slug = topic.slug
  const pool = TOPIC_ANGLE_TEMPLATES[slug] || [
    {
      category: 'everyday_observation',
      angle: `Pengamatan seputar ${topic.name}`,
      description: `Hal-hal kecil yang sering dialami orang banyak tentang ${topic.name}.`,
    },
    {
      category: 'humor',
      angle: `Sisi lucu dari ${topic.name}`,
      description: `Melihat absurditas situasi ${topic.name} dengan senyuman.`,
    },
    {
      category: 'vulnerable',
      angle: `Keresahan jujur ${topic.name}`,
      description: `Mengakui perasaan yang sering disembunyikan terkait ${topic.name}.`,
    },
  ]

  // Filter out recently used angle fingerprints if alternatives exist
  const recentSet = new Set(recentAngleFingerprints)
  const freshPool = pool.filter((c) => !recentSet.has(createAngleFingerprint(c.angle)))
  const activePool = freshPool.length > 0 ? freshPool : pool

  // Shuffle and take desiredCount
  const shuffled = [...activePool].sort(() => Math.random() - 0.5)
  const candidates = shuffled.slice(0, desiredCount)

  const chosenAngle = candidates[0] || pool[0]
  const fingerprint = createAngleFingerprint(chosenAngle.angle)

  return {
    candidates,
    chosenAngle,
    fingerprint,
  }
}

export function createAngleFingerprint(angle: string): string {
  return angle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32)
}
