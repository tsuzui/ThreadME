import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function keyBytes() {
  const key = process.env.TOKEN_ENCRYPTION_KEY || ''
  if (!/^[a-fA-F0-9]{64}$/.test(key)) throw new Error('TOKEN_ENCRYPTION_KEY harus berupa 64 karakter hex.')
  return Buffer.from(key, 'hex')
}

export function encryptToken(token: string, identity: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv)
  cipher.setAAD(Buffer.from(identity))
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return ['v1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted.toString('hex')].join('.')
}

export function decryptToken(envelope: string, identity: string) {
  try {
    const [version, iv, tag, ciphertext, extra] = envelope.split('.')
    if (version !== 'v1' || extra !== undefined || !/^[a-f0-9]{24}$/.test(iv || '') || !/^[a-f0-9]{32}$/.test(tag || '') || !/^(?:[a-f0-9]{2})+$/.test(ciphertext || '')) throw new Error('format')
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(iv, 'hex'))
    decipher.setAAD(Buffer.from(identity))
    decipher.setAuthTag(Buffer.from(tag, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8')
  } catch { throw new Error('Token tersimpan tidak dapat dibaca. Hubungkan ulang akun Threads.') }
}
