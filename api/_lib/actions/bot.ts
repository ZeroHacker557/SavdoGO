import type { Staff } from '../admin-auth.js'
import { attachBot, detachBot } from '../platform/bot.js'

/**
 * Admin paneldan o'z Telegram botini ulash/uzish (bepul).
 *
 * Faqat do'kon egasi: bot — do'konning yuzi, mijozlar va kuryerlar
 * shu bot bilan ishlaydi. Tekshiruv va webhook — platform/bot.ts.
 */
function requireOwner(staff: Staff) {
  if (staff.role !== 'owner') throw new Error('Botni faqat do‘kon egasi ulaydi')
}

export async function botConnect(staff: Staff, body: Record<string, unknown>) {
  requireOwner(staff)
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) throw new Error('BotFather bergan tokenni kiriting')
  return attachBot(staff.shopId, token, staff.email || staff.uid)
}

export async function botDisconnect(staff: Staff) {
  requireOwner(staff)
  return detachBot(staff.shopId, staff.email || staff.uid)
}
