/**
 * Platforma egasiga Telegram xabari: yangi do'kon, yangi to'lov cheki.
 *
 * Ixtiyoriy — env'da PLATFORM_BOT_TOKEN va PLATFORM_CHAT_ID bo'lsa
 * ishlaydi, bo'lmasa jim o'tadi. Xabar yuborilmasa ham asosiy amal
 * (do'kon yaratish, chek yuborish) buzilmaydi.
 */
export async function notifyPlatform(text: string): Promise<void> {
  const token = process.env.PLATFORM_BOT_TOKEN
  const chatId = process.env.PLATFORM_CHAT_ID
  if (!token || !chatId) return
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    if (!response.ok) console.warn('[platform] Telegram xabari ketmadi:', response.status, await response.text())
  } catch (error) {
    console.warn('[platform] Telegram xabari ketmadi:', error)
  }
}

/** HTML parse_mode uchun matnni xavfsiz qiladi. */
export function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
