/** Formadagi maydonlarni yozish davomida formatlash va tekshirish. */

/** «+998 90 123 45 67» ko'rinishiga keltiradi (yozish davomida). */
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '')
  // «+99» gacha o'chirilgan — prefiksning o'zi qoladi, qayta qo'shilib ketmaydi
  if ('998'.startsWith(digits)) return digits ? '+998' : ''
  // «90 123...» yozilsa prefiks qo'shiladi («99 ...» operatori ham to'g'ri qoladi)
  if (!digits.startsWith('998')) digits = '998' + digits
  digits = digits.slice(0, 12)
  const rest = digits.slice(3)
  const parts = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)].filter(Boolean)
  return '+998' + (parts.length ? ' ' + parts.join(' ') : '')
}

export function isPhoneValid(value: string): boolean {
  return /^998\d{9}$/.test(value.replace(/\D/g, ''))
}

export function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/** «8600 1234 5678 9012» — to'rttadan. */
export function maskCard(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Summa kiritish: «25 000». */
export function maskSum(value: string | number): string {
  const digits = String(value).replace(/\D/g, '').slice(0, 10)
  // 0 — «belgilanmagan»: maydon bo'sh turadi, placeholder ko'rinadi
  return Number(digits) ? Number(digits).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') : ''
}

export function parseSum(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0
}
