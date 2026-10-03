import { randomUUID } from 'node:crypto'
import { adminBucket } from '../firebase-admin.js'
import { DraftError } from './draft.js'

/**
 * Brauzerdan kelgan data URL rasmni Storage'ga yuklaydi va ommaviy
 * yuklab olish havolasini qaytaradi (Firebase download token bilan —
 * bucket'ni ommaga ochish shart emas).
 */
// SVG ataylab yo'q: ichida skript bo'lishi mumkin. Forma SVG logoni
// brauzerda WebP ga aylantirib yuboradi (landing/onboarding/logo.ts).
const TYPES: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

export function parseDataUrl(dataUrl: string, maxBytes: number): { buffer: Buffer; contentType: string; ext: string } {
  const match = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl)
  if (!match) throw new DraftError('Rasm formati noto‘g‘ri')
  const contentType = match[1].toLowerCase()
  const ext = TYPES[contentType]
  if (!ext) throw new DraftError('Faqat PNG, JPG yoki WebP rasm yuklang')
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length > maxBytes) throw new DraftError(`Rasm ${Math.round(maxBytes / 1024 / 1024)} MB dan kichik bo‘lsin`)
  return { buffer, contentType, ext }
}

export async function uploadDataUrl(dataUrl: string, pathWithoutExt: string, maxBytes: number): Promise<string> {
  const { buffer, contentType, ext } = parseDataUrl(dataUrl, maxBytes)
  const bucket = await adminBucket()
  const path = `${pathWithoutExt}.${ext}`
  const token = randomUUID()
  await bucket.file(path).save(buffer, {
    resumable: false,
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
}
