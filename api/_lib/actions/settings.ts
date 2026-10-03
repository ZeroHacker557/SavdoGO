import { adminDb } from '../firebase-admin.js'
import { escapeHtml, sendMessage } from '../telegram.js'
import type { Staff } from '../admin-auth.js'
import { currentShop, shopDoc } from '../context.js'
import { readBrandPatch } from '../platform/draft.js'

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function num(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

/**
 * Sozlamalar `settings/{doc}` hujjatlarida:
 *   payment  — karta raqami va egasi (mini app checkout'da ko'rsatadi)
 *   delivery — yetkazish narxi va bepul chegarasi
 *   courier  — buyurtma kuryerlarga qanday yetkaziladi
 *   brand    — nom, logo, ranglar, shrift va aloqa (shops/{id} hujjati)
 *
 * To'lov va yetkazish do'konning ommaviy hujjatiga ham yoziladi: sayt
 * ochilganda shartlarni shu hujjatdan oladi (qo'shimcha so'rovsiz).
 */
export async function settingsSave(actor: Staff, body: Record<string, unknown>) {
  if (actor.role !== 'owner') throw new Error('Faqat ega sozlamalarni o‘zgartira oladi')

  const db = await adminDb()
  const tenant = await shopDoc()
  const section = text(body.section)

  if (section === 'payment') {
    const cash = body.cash !== false
    const card = body.card !== undefined ? body.card === true : true
    const digits = text(body.cardNumber).replace(/\D/g, '')
    const cardOwner = text(body.cardOwner).toUpperCase().slice(0, 80)
    if (!cash && !card) throw new Error('Kamida bitta to‘lov usuli yoqilgan bo‘lsin')
    if (card && digits.length !== 16) throw new Error('Karta raqami 16 ta raqamdan iborat bo‘lsin')
    const cardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
    const batch = db.batch()
    batch.set(tenant.collection('settings').doc('payment'), { cardNumber, cardOwner }, { merge: true })
    batch.set(tenant, { payments: { cash, card, cardNumber, cardOwner }, updatedAt: new Date().toISOString() }, { merge: true })
    await batch.commit()
    return { ok: true }
  }

  if (section === 'delivery') {
    const fee = num(body.fee)
    const freeFrom = num(body.freeFrom)
    // 0 — minimal summa yo'q, buyurtma har qanday summada o'tadi
    const minOrder = num(body.minOrder)
    const enabled = body.enabled !== false
    const pickup = body.pickup !== false
    if (!enabled && !pickup) throw new Error('Yetkazish yoki olib ketishdan kamida bittasi yoqilgan bo‘lsin')
    const batch = db.batch()
    batch.set(tenant.collection('settings').doc('delivery'), { fee, freeFrom, minOrder }, { merge: true })
    batch.set(tenant, { delivery: { enabled, pickup, fee, freeFrom, minOrder }, updatedAt: new Date().toISOString() }, { merge: true })
    await batch.commit()
    return { ok: true }
  }

  if (section === 'brand') {
    const patch = await readBrandPatch(body, tenant.id)
    await tenant.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true })
    return { ok: true, logo: patch.logo }
  }

  if (section === 'courier') {
    /*
     * Kanal BITTA: shaxsiy xabar YOKI guruh.
     *
     * Ilgari ikkalasi mustaqil belgilanardi. Ikkalasi yoqilganda kuryer
     * bir buyurtmani ikki marta olardi va har nusxada o'z «Oldim»
     * tugmasi bo'lardi — biri bosilsa, ikkinchisi eskirib qolardi.
     */
    const channel = text(body.channel) === 'group' ? 'group' : 'couriers'
    const groupChatId = text(body.groupChatId) || null

    if (channel === 'group' && !groupChatId) {
      throw new Error('Guruhga yuborish uchun guruh ID si kerak')
    }

    await tenant.collection('settings').doc('courier').set(
      {
        channel,
        groupChatId,
        notifyAdmins: body.notifyAdmins !== false,
        // Eski maydonlar — mos qolishi uchun
        toCouriers: channel === 'couriers',
        toGroup: channel === 'group',
      },
      { merge: true },
    )
    return { ok: true }
  }

  throw new Error('Noma’lum sozlama bo‘limi')
}

/**
 * Guruh ulanishini tekshiradi — sinov xabari yuboradi.
 *
 * Guruh ID sini qo'lda yozishda xato qilish oson (masalan minus belgisi
 * tushib qoladi), shuning uchun saqlashdan oldin sinab ko'rish kerak.
 */
export async function settingsTestGroup(actor: Staff, body: Record<string, unknown>) {
  if (actor.role !== 'owner') throw new Error('Faqat ega sinovdan o‘tkaza oladi')

  const chatId = text(body.groupChatId)
  if (!chatId) throw new Error('Guruh ID si kerak')

  const result = await sendMessage(
    chatId,
    `✅ <b>${escapeHtml(currentShop().shopName)} — admin panel</b>\n\nGuruh ulandi — yangi buyurtmalar shu yerga tushadi.`,
  )
  if (!result.ok) throw new Error(`Yuborib bo‘lmadi: ${result.error}`)
  return { ok: true }
}
