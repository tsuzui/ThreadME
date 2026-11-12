import 'server-only'
import sharp from 'sharp'

export const POST_IMAGE_BUCKET = 'post-images'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export async function prepareDraftImage(file: File): Promise<Buffer> {
  if (file.size > MAX_IMAGE_BYTES || file.size === 0) {
    throw new Error('Ukuran gambar harus lebih dari 0 dan maksimal 5 MB.')
  }
  const input = Buffer.from(await file.arrayBuffer())
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, animated: true })
    const metadata = await image.metadata()
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages ?? 1) > 1) {
      throw new Error('unsupported')
    }
    return await image.rotate().resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer()
  } catch {
    throw new Error('Gambar tidak valid. Gunakan JPEG, PNG, atau WebP statis maksimal 25 megapiksel.')
  }
}
