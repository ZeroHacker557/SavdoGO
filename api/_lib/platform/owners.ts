import { randomBytes } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'
import type { Staff } from '../admin-auth.js'
import { adminAuth, adminDb } from '../firebase-admin.js'
import { BUSINESS_TYPES, businessType } from '../../../src/platform/business-types.js'
import { RESERVED_SLUGS, normalizeSlug } from '../../../src/platform/plans.js'
import { PlatformError } from './errors.js'
import { esc, notifyPlatform } from './notify.js'
import { runTx } from '../firestore-tx.js'

/**
 * Egalar: «bitta ega — bitta do'kon» qoidasi va ikkinchi do'kon arizasi.
 *
 * QOIDA. Ro'yxatdan o'tish formasi orqali bir kishi faqat BITTA do'kon
 * ocha oladi. Kishi email (Firebase Auth'da yagona) va telefon raqami
 * (`ownerPhones/{998XXXXXXXXX}`) bo'yicha taniladi — ikkalasidan biri
 * band bo'lsa, server yangi do'kon ochmaydi.
 *
 * IKKINCHI DO'KON. Ega admin panelda ariza qoldiradi
 * (`shopRequests`), platforma egasi tasdiqlaydi — shunda bir martalik
 * taklif kodi paydo bo'ladi. Ega shu kod bilan formani to'ldiradi va
 * yangi do'kon O'SHA hisobga qo'shiladi: yangi login kerak emas.
 *
 * BIR NECHTA DO'KON. Hisobning do'konlari — `staffIndex/{uid}.shops`,
 * ayni paytda ochiq turgani — `staffIndex/{uid}.shopId` va token
 * claim'idagi `shopId`. Panel, server va Firestore qoidalari faqat
 * faol do'konga qaraydi, shuning uchun do'kon almashtirish = shu ikki
 * joyni yangilash (`switchShop`). Qolgan kod bir do'konli bo'lib qoladi.
 */

const DAY = 86_400_000
/** Tasdiqlangan arizaning taklif kodi shuncha kun amal qiladi. */
const INVITE_DAYS = 14

export const OWNER_EXISTS_TEXT =
  'Bu telefon raqami yoki email bilan do‘kon allaqachon ochilgan. Bitta egaga bitta do‘kon — ikkinchisi uchun admin panelning «Yangi do‘kon» bo‘limida ariza qoldiring.'

/** Telefonni kalitga aylantiradi: faqat raqamlar, `998XXXXXXXXX` (noto'g'ri bo'lsa — bo'sh). */
export function phoneKey(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '')
  return /^998\d{9}$/.test(digits) ? digits : ''
}

/** Hisob kira oladigan do'konlar. Eski yozuvlarda `shops` yo'q — faqat `shopId`. */
export function shopsOfIndex(data: Record<string, unknown> | undefined): string[] {
  const list = Array.isArray(data?.shops) ? data.shops.map(String) : []
  const active = String(data?.shopId || '')
  return [...new Set([active, ...list])].filter(Boolean)
}

/**
 * Faol do'konni token claim'iga yozadi. Boshqa claim'lar (masalan
 * platforma egasining `super` belgisi) saqlanib qoladi —
 * `setCustomUserClaims` hammasini almashtiradi.
 */
export async function setActiveClaims(uid: string, shopId: string, role: string) {
  const auth = await adminAuth()
  const user = await auth.getUser(uid)
  await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), role, shopId })
}

/** `Authorization: Bearer <token>` → foydalanuvchi uid'i. */
export async function bearerUid(authorization: string): Promise<string> {
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) throw new PlatformError('Avval hisobingizga kiring', 401, 'login-required')
  try {
    return (await (await adminAuth()).verifyIdToken(token, true)).uid
  } catch {
    throw new PlatformError('Seans muddati tugagan — qaytadan kiring', 401, 'login-required')
  }
}

/* ── Do'konlar ro'yxati va almashtirish ────────────────────────── */

export type OwnedShop = {
  id: string
  name: string
  status: string
  logo: string | null
  brand: string
  role: string
  current: boolean
}

/** Hisob xodimi bo'lgan (faol) do'konlar — panelda almashtirish uchun. */
export async function shopsOf(uid: string, activeShopId: string): Promise<OwnedShop[]> {
  const db = await adminDb()
  const index = await db.collection('staffIndex').doc(uid).get()
  const ids = shopsOfIndex(index.data())
  const rows = await Promise.all(
    ids.map(async (id) => {
      const [shop, member] = await Promise.all([
        db.collection('shops').doc(id).get(),
        db.collection('shops').doc(id).collection('staff').doc(uid).get(),
      ])
      if (!shop.exists || !member.exists || member.data()?.active === false) return null
      const data = shop.data() ?? {}
      const logo = typeof data.logo === 'string' && !data.logo.startsWith('data:') ? data.logo : null
      return {
        id,
        name: String(data.name || id),
        // Ro'yxatdagi yorliq uchun: bepul sinov alohida ko'rinadi
        status: data.status === 'active' && data.trial === true ? 'trial' : String(data.status || 'demo'),
        logo,
        brand: String((data.theme as Record<string, unknown> | undefined)?.brand || '#5B4CF5'),
        role: String(member.data()?.role || 'admin'),
        current: id === activeShopId,
      }
    }),
  )
  return rows.filter((row): row is OwnedShop => row !== null)
}

/** Panelda boshqa do'konga o'tish. Keyin mijoz tokenni yangilaydi (getIdToken(true)). */
export async function switchShop(staff: Staff, body: Record<string, unknown>) {
  const target = normalizeSlug(typeof body.shopId === 'string' ? body.shopId : '')
  if (!target) throw new PlatformError('Do‘kon tanlanmagan')
  const shops = await shopsOf(staff.uid, staff.shopId)
  const shop = shops.find((s) => s.id === target)
  if (!shop) throw new PlatformError('Bu do‘konga ruxsatingiz yo‘q', 403)

  const db = await adminDb()
  await db.collection('staffIndex').doc(staff.uid).set(
    { shopId: target, role: shop.role, shops: shops.map((s) => s.id) },
    { merge: true },
  )
  await setActiveClaims(staff.uid, target, shop.role)
  return { shopId: target }
}

/* ── Ikkinchi do'kon arizasi ────────────────────────────────────── */

type RequestStatus = 'pending' | 'approved' | 'creating' | 'used' | 'rejected' | 'cancelled'

export type ShopRequestRow = {
  id: string
  status: RequestStatus
  name: string
  type: string
  slug: string
  note: string
  ownerUid: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  fromShopId: string
  fromShopName: string
  createdAt: string
  reviewedAt: string | null
  reviewNote: string
  inviteCode: string | null
  inviteExpiresAt: string | null
  createdShopId: string | null
}

function requestRow(id: string, d: Record<string, unknown>): ShopRequestRow {
  return {
    id,
    status: (String(d.status || 'pending') as RequestStatus),
    name: String(d.name || ''),
    type: String(d.type || 'other'),
    slug: String(d.slug || ''),
    note: String(d.note || ''),
    ownerUid: String(d.ownerUid || ''),
    ownerName: String(d.ownerName || ''),
    ownerEmail: String(d.ownerEmail || ''),
    ownerPhone: String(d.ownerPhone || ''),
    fromShopId: String(d.fromShopId || ''),
    fromShopName: String(d.fromShopName || ''),
    createdAt: String(d.createdAt || ''),
    reviewedAt: d.reviewedAt ? String(d.reviewedAt) : null,
    reviewNote: String(d.reviewNote || ''),
    inviteCode: d.inviteCode ? String(d.inviteCode) : null,
    inviteExpiresAt: d.inviteExpiresAt ? String(d.inviteExpiresAt) : null,
    createdShopId: d.createdShopId ? String(d.createdShopId) : null,
  }
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

/** Egani ko'rsatadigan arizalar: o'ziniki, yangisi birinchi. */
async function requestsOf(db: Firestore, uid: string): Promise<ShopRequestRow[]> {
  // Faqat bitta maydon bo'yicha — qo'shimcha indeks kerak bo'lmasin; tartib xotirada
  const snap = await db.collection('shopRequests').where('ownerUid', '==', uid).limit(50).get()
  return snap.docs
    .map((doc) => requestRow(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Panelning «Yangi do'kon» sahifasi: arizalar va hisobning do'konlari. */
export async function ownerOverview(staff: Staff) {
  const db = await adminDb()
  const [requests, shops] = await Promise.all([requestsOf(db, staff.uid), shopsOf(staff.uid, staff.shopId)])
  return { requests, shops }
}

export async function requestSubmit(staff: Staff, body: Record<string, unknown>) {
  const name = text(body.name, 60)
  if (name.length < 2) throw new PlatformError('Yangi do‘kon nomini kiriting')
  const type = text(body.type, 30)
  if (!BUSINESS_TYPES.some((t) => t.id === type)) throw new PlatformError('Biznes turini tanlang')
  const note = text(body.note, 500)
  const slug = normalizeSlug(text(body.slug, 40))
  const db = await adminDb()

  if (slug) {
    if (slug.length < 3 || RESERVED_SLUGS.has(slug)) throw new PlatformError('Manzil kamida 3 ta belgi — lotin harfi, raqam yoki chiziqcha')
    if ((await db.collection('shops').doc(slug).get()).exists) throw new PlatformError('Bu manzil band — boshqasini yozing yoki bo‘sh qoldiring', 409)
  }

  const open = (await requestsOf(db, staff.uid)).find((r) => r.status === 'pending' || r.status === 'approved' || r.status === 'creating')
  if (open) {
    throw new PlatformError(
      open.status === 'pending'
        ? 'Sizda ko‘rib chiqilayotgan ariza bor — javobni kuting'
        : 'Arizangiz tasdiqlangan — avval o‘sha do‘konni yarating',
      409,
    )
  }

  const [shop, owner] = await Promise.all([
    db.collection('shops').doc(staff.shopId).get(),
    db.collection('shopPrivate').doc(staff.shopId).get(),
  ])
  const now = new Date().toISOString()
  const doc = {
    status: 'pending' as RequestStatus,
    name,
    type,
    slug,
    note,
    ownerUid: staff.uid,
    ownerName: staff.name || String(owner.data()?.ownerName || ''),
    ownerEmail: staff.email || String(owner.data()?.ownerEmail || ''),
    ownerPhone: String(owner.data()?.ownerPhone || staff.phone || ''),
    fromShopId: staff.shopId,
    fromShopName: String(shop.data()?.name || staff.shopId),
    createdAt: now,
  }
  const ref = await db.collection('shopRequests').add(doc)

  void notifyPlatform(
    [
      '📝 <b>Ikkinchi do‘kon uchun ariza</b>',
      `${esc(name)} — ${esc(businessType(type).name)}${slug ? ` (${slug})` : ''}`,
      `👤 ${esc(doc.ownerName)} · ${esc(doc.ownerPhone)}`,
      `🏪 Hozirgi do‘koni: ${esc(doc.fromShopName)} (${staff.shopId})`,
      note ? `💬 ${esc(note)}` : '',
    ].filter(Boolean).join('\n'),
  )
  return { id: ref.id }
}

export async function requestCancel(staff: Staff, body: Record<string, unknown>) {
  const db = await adminDb()
  const ref = db.collection('shopRequests').doc(text(body.id, 60) || '-')
  const snap = await ref.get()
  if (!snap.exists || snap.data()?.ownerUid !== staff.uid) throw new PlatformError('Ariza topilmadi', 404)
  if (snap.data()?.status !== 'pending') throw new PlatformError('Faqat ko‘rib chiqilmagan arizani bekor qilish mumkin')
  await ref.update({ status: 'cancelled', cancelledAt: new Date().toISOString() })
  return { ok: true }
}

/* ── Platforma egasi: tasdiqlash / rad etish ───────────────────── */

export async function superRequests(): Promise<ShopRequestRow[]> {
  const db = await adminDb()
  const snap = await db.collection('shopRequests').orderBy('createdAt', 'desc').limit(150).get()
  return snap.docs.map((doc) => requestRow(doc.id, doc.data()))
}

export async function requestApprove(reviewer: { email: string }, body: Record<string, unknown>) {
  const db = await adminDb()
  const ref = db.collection('shopRequests').doc(text(body.id, 60) || '-')
  const inviteCode = randomBytes(18).toString('base64url')
  const now = new Date()
  await runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new PlatformError('Ariza topilmadi', 404)
    if (snap.data()?.status !== 'pending') throw new PlatformError('Bu ariza allaqachon ko‘rib chiqilgan', 409)
    tx.update(ref, {
      status: 'approved',
      inviteCode,
      inviteExpiresAt: new Date(now.getTime() + INVITE_DAYS * DAY).toISOString(),
      reviewedAt: now.toISOString(),
      reviewedBy: reviewer.email,
      reviewNote: text(body.note, 300),
    })
  })
  return { inviteCode }
}

export async function requestReject(reviewer: { email: string }, body: Record<string, unknown>) {
  const db = await adminDb()
  const ref = db.collection('shopRequests').doc(text(body.id, 60) || '-')
  await runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new PlatformError('Ariza topilmadi', 404)
    if (snap.data()?.status !== 'pending') throw new PlatformError('Bu ariza allaqachon ko‘rib chiqilgan', 409)
    tx.update(ref, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer.email,
      reviewNote: text(body.note, 300),
    })
  })
  return { ok: true }
}

/* ── Taklif kodi (tasdiqlangan ariza) ───────────────────────────── */

const INVITE_INVALID = 'Taklif havolasi yaroqsiz yoki muddati o‘tgan. Admin panelning «Yangi do‘kon» bo‘limini oching.'

async function findInvite(db: Firestore, code: string) {
  const clean = text(code, 64)
  if (clean.length < 16) throw new PlatformError(INVITE_INVALID, 403, 'invite-invalid')
  const snap = await db.collection('shopRequests').where('inviteCode', '==', clean).limit(1).get()
  if (snap.empty) throw new PlatformError(INVITE_INVALID, 403, 'invite-invalid')
  return snap.docs[0]
}

/** «Yaratilmoqda» holatida osilib qolgan kod (funksiya yiqilgan) shuncha vaqtdan keyin yana ishlaydi. */
const CLAIM_TTL = 10 * 60_000

function usable(d: Record<string, unknown> | undefined, uid: string, now: number): boolean {
  if (!d || d.ownerUid !== uid) return false
  if (d.inviteExpiresAt && new Date(String(d.inviteExpiresAt)).getTime() < now) return false
  if (d.status === 'approved') return true
  return d.status === 'creating' && now - new Date(String(d.claimedAt || 0)).getTime() > CLAIM_TTL
}

/** Forma ochilganda: kod shu egaga tegishli va hali ishlatilmaganmi. */
export async function inviteCheck(authorization: string, body: Record<string, unknown>) {
  const uid = await bearerUid(authorization)
  const db = await adminDb()
  const doc = await findInvite(db, String(body.invite || ''))
  const d = doc.data()
  if (!usable(d, uid, Date.now())) {
    throw new PlatformError(
      d.ownerUid !== uid ? 'Bu taklif boshqa hisobga berilgan — o‘z hisobingiz bilan kiring' : INVITE_INVALID,
      403,
      'invite-invalid',
    )
  }
  return {
    name: String(d.name || ''),
    type: String(d.type || 'other'),
    slug: String(d.slug || ''),
    ownerName: String(d.ownerName || ''),
    ownerEmail: String(d.ownerEmail || ''),
  }
}

export type ClaimedInvite = { id: string; ownerUid: string; ownerName: string; ownerEmail: string; ownerPhone: string }

/** Do'kon yaratish boshlanishida kod band qilinadi — ikki marta ishlatilmasin. */
export async function claimInvite(db: Firestore, uid: string, code: string): Promise<ClaimedInvite> {
  const doc = await findInvite(db, code)
  return runTx(db, async (tx) => {
    const snap = await tx.get(doc.ref)
    const d = snap.data()
    if (!usable(d, uid, Date.now())) throw new PlatformError(INVITE_INVALID, 403, 'invite-invalid')
    tx.update(doc.ref, { status: 'creating', claimedAt: new Date().toISOString() })
    return {
      id: doc.id,
      ownerUid: uid,
      ownerName: String(d?.ownerName || ''),
      ownerEmail: String(d?.ownerEmail || ''),
      ownerPhone: String(d?.ownerPhone || ''),
    }
  })
}

/** Yaratish muvaffaqiyatsiz — kod yana ishlatilishi mumkin. */
export async function releaseInvite(db: Firestore, id: string) {
  await db.collection('shopRequests').doc(id).update({ status: 'approved', claimedAt: null }).catch(() => {})
}

export async function finishInvite(db: Firestore, id: string, shopId: string) {
  await db.collection('shopRequests').doc(id).update({ status: 'used', usedAt: new Date().toISOString(), createdShopId: shopId })
}
