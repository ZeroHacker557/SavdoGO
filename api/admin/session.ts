import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireStaff } from '../_lib/admin-auth.js'
import { adminDb } from '../_lib/firebase-admin.js'
import { shopsOf } from '../_lib/platform/owners.js'

/**
 * GET /api/admin/session
 * → { staff: { uid, email, name, role, ... } }
 *
 * Kirgandan keyin birinchi so'rov: brauzerdagi Firebase seansi haqiqiy
 * xodimga tegishlimi va u hali bloklanmaganmi — shuni aniqlaydi.
 * Rol ham shu yerdan keladi, mijoz tomonidagi rolga ishonilmaydi.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Faqat GET' })
  }

  // Eng past rol — kuryer ham o'z seansini tekshira olishi kerak
  const staff = await requireStaff(req, res, 'courier')
  if (!staff) return

  /*
   * Do'konning ommaviy hujjati ham qaytadi: panel shu bilan egasining
   * logosi va ranglarida chiziladi, to'lov holatiga qarab «ko'rish
   * rejimi» bannerini ko'rsatadi. Bot tokeni bu hujjatda yo'q
   * (shopSecrets'da), shuning uchun hammasini berish xavfsiz.
   */
  const snap = await (await adminDb()).collection('shops').doc(staff.shopId).get()
  if (!snap.exists) return res.status(404).json({ error: 'Do‘kon topilmadi' })

  // Hisobda bir nechta do'kon bo'lsa — panelda almashtirish ro'yxati (owners.ts)
  const shops = staff.role === 'courier' ? [] : await shopsOf(staff.uid, staff.shopId).catch(() => [])

  return res.status(200).json({ staff, shop: { ...snap.data(), id: snap.id }, shops })
}
