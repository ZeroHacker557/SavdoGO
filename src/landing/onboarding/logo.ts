/**
 * Logoni kvadrat, 512×512 WebP (shaffoflik saqlanadi) ga keltiradi.
 *
 * Asl fayl bir necha MB bo'lishi mumkin — u localStorage'ga ham,
 * serverga ham sig'maydi. Shu yerda kichraytiriladi: natija odatda
 * 20–80 KB. Rasm kvadrat bo'lmasa markazga joylanadi (kesilmaydi).
 */
const SIZE = 512
const MAX_INPUT = 12 * 1024 * 1024

export async function processLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Faqat rasm fayl yuklang (PNG, JPG, WebP, SVG)')
  if (file.size > MAX_INPUT) throw new Error('Rasm juda katta — 12 MB dan kichik fayl tanlang')

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Brauzer rasmni qayta ishlay olmadi')

    const w = img.naturalWidth || SIZE
    const h = img.naturalHeight || SIZE
    const scale = Math.min(SIZE / w, SIZE / h)
    const dw = w * scale
    const dh = h * scale
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh)

    const webp = canvas.toDataURL('image/webp', 0.9)
    // Eski Safari WebP yozolmaydi — PNG ga tushamiz
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Rasmni ochib bo‘lmadi — boshqa fayl tanlang'))
    img.src = src
  })
}
