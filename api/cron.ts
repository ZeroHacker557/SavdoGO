import type { VercelRequest, VercelResponse } from '@vercel/node'
import { endExpiredShifts } from './_lib/actions/shift.js'
import { remindExpiring } from './_lib/platform/reminders.js'
import { fail } from './_lib/http.js'

/**
 * Kunlik jadval (Vercel Cron — vercel.json):
 *
 *   • kechagi kuryer smenalarini yopish (har do'kon o'z boti bilan);
 *   • obunasi 3 kun ichida tugaydigan do'kon egalariga eslatma va
 *     platforma egasiga ro'yxat.
 *
 * Vercel Cron `Authorization: Bearer <CRON_SECRET>` yuboradi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = String(process.env.CRON_SECRET || '')
  if (!secret) return fail(res, 500, 'CRON_SECRET sozlanmagan', 'CRON_SECRET_MISSING')

  const header = String(req.headers.authorization || '')
  const provided = header.startsWith('Bearer ') ? header.slice(7) : String(req.headers['x-cron-secret'] || '')
  if (provided !== secret) return fail(res, 401, 'Ruxsat yo‘q', 'FORBIDDEN')

  const result: Record<string, unknown> = {}

  // Har ish mustaqil: biri yiqilsa boshqasi baribir bajariladi
  try {
    result.shifts = await endExpiredShifts()
  } catch (error) {
    console.error('[cron] smenalar yopilmadi:', error)
    result.shifts = { error: error instanceof Error ? error.message : 'xato' }
  }

  try {
    result.reminders = await remindExpiring()
  } catch (error) {
    console.error('[cron] eslatmalar ketmadi:', error)
    result.reminders = { error: error instanceof Error ? error.message : 'xato' }
  }

  return res.status(200).json({ ok: true, ...result })
}
