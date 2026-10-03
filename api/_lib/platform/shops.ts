import { createHash } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '../firebase-admin.js'
import { PLANS, TRIAL_DAYS } from '../../../src/platform/plans.js'
import { businessType } from '../../../src/platform/business-types.js'
import { readDraft, readOwner, readSlug } from './draft.js'
import { seedCatalog } from './seed.js'
import { uploadDataUrl } from './files.js'
import { esc, notifyPlatform } from './notify.js'
import { PlatformError } from './errors.js'
import {
  OWNER_EXISTS_TEXT, bearerUid, claimInvite, finishInvite, phoneKey, releaseInvite, setActiveClaims, shopsOfIndex,
} from './owners.js'
import { createIfAbsent, runTx } from '../firestore-tx.js'

/** Xato klassi alohida faylda (aylana importsiz); eski importlar uchun shu yerdan ham. */
export { PlatformError }

/** Subdomen bo'shmi. */
export async function slugCheck(body: Record<string, unknown>) {
  let slug: string
  try {
    slug = readSlug(body.slug)
  } catch {
    return { available: false, reason: 'invalid' }
  }
  const db = await adminDb()
  const snap = await db.collection('shops').doc(slug).get()
  return { available: !snap.exists, slug }
}

/**
 * Bir IP dan kuniga ko'pi bilan shuncha do'kon — ochiq endpoint bot
 * bilan to'ldirilmasin. IP o'zi saqlanmaydi, faqat xeshi.
 */
const DAILY_LIMIT = 5

async function rateLimit(db: Firestore, ip: string) {
  if (!ip) return
  const day = new Date().toISOString().slice(0, 10)
  const key = createHash('sha256').update(`${ip}|${day}`).digest('hex').slice(0, 32)
  const ref = db.collection('rateLimits').doc(`shop-${key}`)
  await runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    const count = Number(snap.data()?.count || 0)
    if (count >= DAILY_LIMIT) {
      throw new PlatformError('Bugun juda ko‘p do‘kon yaratildi. Ertaga qayta urinib ko‘ring yoki biz bilan bog‘laning.', 429, 'rate-limit')
    }
    tx.set(ref, { count: count + 1, day, expireAt: new Date(Date.now() + 2 * 86_400_000) }, { merge: true })
  })
}

type Draft = ReturnType<typeof readDraft>
type OwnerInfo = { uid: string; name: string; email: string; phone: string }

/** Logo — Storage'ga; yuklab bo'lmasa kichik logo hujjatning o'zida qoladi. */
async function storeLogo(draft: Draft): Promise<string | null> {
  if (!draft.logoData) return null
  try {
    return await uploadDataUrl(draft.logoData, `shops/${draft.slug}/logo-${Date.now()}`, 1_000_000)
  } catch (error) {
    console.warn('[platform] logo Storage’ga yuklanmadi:', error)
    return draft.logoData.length < 250_000 ? draft.logoData : null
  }
}

/**
 * Do'kon hujjatlari: ommaviy qism, maxfiy qism, ega-xodim, sozlamalar.
 *
 * Yangi do'kon darhol `active` — TRIAL_DAYS kunlik bepul sinov: hamma
 * amallar ochiq, mijozlar buyurtma bera oladi. `paidUntil` — sinov
 * tugaydigan kun; birinchi to'lov tasdiqlanganda muddat shu kunning
 * ustiga qo'shiladi va `trial` o'chadi (super.ts → paymentApprove).
 */
function shopDocs(db: Firestore, draft: Draft, owner: OwnerInfo, logo: string | null, now: string, extraPrivate: Record<string, unknown> = {}) {
  const shopRef = db.collection('shops').doc(draft.slug)
  const { slug, logoData: _logoData, ...doc } = draft
  void _logoData
  const batch = db.batch()
  batch.set(shopRef, {
    ...doc,
    id: slug,
    logo,
    status: 'active',
    paidUntil: new Date(Date.parse(now) + TRIAL_DAYS * 86_400_000).toISOString(),
    trial: true,
    botUsername: null,
    customDomain: null,
    ownerUid: owner.uid,
    createdAt: now,
    updatedAt: now,
  })
  batch.set(db.collection('shopPrivate').doc(slug), {
    ownerUid: owner.uid,
    ownerName: owner.name,
    ownerEmail: owner.email,
    ownerPhone: owner.phone,
    plan: draft.plan,
    telegramAddon: draft.telegramAddon,
    createdAt: now,
    ...extraPrivate,
  })
  batch.set(shopRef.collection('staff').doc(owner.uid), {
    email: owner.email,
    name: owner.name,
    phone: owner.phone,
    role: 'owner',
    active: true,
    createdAt: now,
  })
  // Shablon kodi yetkazish va karta sozlamalarini shu hujjatlardan o'qiydi
  batch.set(shopRef.collection('settings').doc('delivery'), {
    fee: draft.delivery.fee,
    freeFrom: draft.delivery.freeFrom,
    minOrder: draft.delivery.minOrder,
  })
  batch.set(shopRef.collection('settings').doc('payment'), {
    cardNumber: draft.payments.cardNumber,
    cardOwner: draft.payments.cardOwner,
  })
  return batch
}

/** Yarim yaratilgan do'kon qolmasin. */
async function removeShopDocs(db: Firestore, slug: string, uid: string) {
  const shopRef = db.collection('shops').doc(slug)
  await Promise.allSettled([
    shopRef.collection('staff').doc(uid).delete(),
    shopRef.collection('settings').doc('delivery').delete(),
    shopRef.collection('settings').doc('payment').delete(),
    db.collection('shopPrivate').doc(slug).delete(),
  ])
  await db.recursiveDelete(shopRef).catch(() => shopRef.delete().catch(() => {}))
}

async function reserveSlug(db: Firestore, draft: Draft, now: string) {
  const created = await createIfAbsent(db, db.collection('shops').doc(draft.slug), { status: 'demo', createdAt: now, name: draft.name })
  if (!created) throw new PlatformError('Bu manzil band — boshqa nom tanlang', 409, 'slug-taken')
}

/**
 * Yangi do'kon: subdomen band qilinadi, ega hisobi ochiladi, namuna
 * katalog yoziladi. Do'kon TRIAL_DAYS kun bepul va to'liq ishlaydi,
 * keyin tanlangan tarif to'lanadi.
 *
 * Bitta ega — bitta do'kon (owners.ts): telefon raqami
 * `ownerPhones/{998...}` da, email esa Firebase Auth'da band qilinadi.
 * Ikkinchi do'kon faqat tasdiqlangan ariza (`invite`) bilan — u holda
 * yangi hisob ochilmaydi, do'kon egasining mavjud hisobiga qo'shiladi.
 *
 * Tartib muhim: avval telefon va subdomen `create()` bilan band
 * qilinadi (bir vaqtda ikki so'rov bir xil qiymatni ololmaydi), keyin
 * hisob. Biror qadam o'xshamasa, band qilinganlar bo'shatiladi.
 */
export async function shopCreate(body: Record<string, unknown>, ip: string, authorization = '') {
  const draft = readDraft(body.draft)
  const invite = typeof body.invite === 'string' ? body.invite.trim() : ''
  const db = await adminDb()

  await rateLimit(db, ip)

  const result = invite ? await createFromInvite(db, draft, invite, authorization) : await createWithAccount(db, draft, body)

  const plan = PLANS[draft.plan]
  void notifyPlatform(
    [
      invite ? '🆕 <b>Ikkinchi do‘kon</b> (tasdiqlangan ariza)' : '🆕 <b>Yangi do‘kon</b>',
      `${esc(draft.name)} — ${esc(businessType(draft.type).name)}`,
      `🌐 ${draft.slug}`,
      `👤 ${esc(result.owner.name)} · ${esc(result.owner.phone)}`,
      `✉️ ${esc(result.owner.email)}`,
      `🎁 ${TRIAL_DAYS} kunlik bepul sinov boshlandi`,
      `💳 Tanlangan tarif: ${plan.name}${draft.telegramAddon ? ' + Telegram' : ''}`,
    ].join('\n'),
  )

  return { shopId: draft.slug }
}

/** Birinchi do'kon: yangi ega hisobi bilan. */
async function createWithAccount(db: Firestore, draft: Draft, body: Record<string, unknown>) {
  const owner = readOwner(body.owner)
  const auth = await adminAuth()
  const now = new Date().toISOString()

  // 1. Telefon — bir kishi ikkinchi do'konni boshqa email bilan ocholmasin
  const phoneRef = db.collection('ownerPhones').doc(phoneKey(owner.phone) || '-')
  if (!(await createIfAbsent(db, phoneRef, { shopId: draft.slug, createdAt: now }))) {
    throw new PlatformError(OWNER_EXISTS_TEXT, 409, 'owner-exists')
  }

  // 2. Subdomen
  try {
    await reserveSlug(db, draft, now)
  } catch (error) {
    await phoneRef.delete().catch(() => {})
    throw error
  }

  // 3. Ega hisobi
  let uid: string
  try {
    const user = await auth.createUser({
      email: owner.email,
      password: owner.password,
      displayName: owner.name,
    })
    uid = user.uid
  } catch (error) {
    await Promise.allSettled([db.collection('shops').doc(draft.slug).delete(), phoneRef.delete()])
    const code = (error as { code?: string })?.code || ''
    if (code === 'auth/email-already-exists') {
      // Do'kon egasimi yoki boshqa do'kondagi xodimmi — javob shunga qarab
      const existing = await auth.getUserByEmail(owner.email).catch(() => null)
      if (existing?.customClaims?.role === 'owner') throw new PlatformError(OWNER_EXISTS_TEXT, 409, 'owner-exists')
      throw new PlatformError('Bu email boshqa do‘konda xodim sifatida ishlatilgan — boshqa email kiriting.', 409, 'email-taken')
    }
    if (code === 'auth/invalid-password') throw new PlatformError('Parol juda oddiy — kamida 8 ta belgi', 400)
    if (code === 'auth/invalid-email') throw new PlatformError('Email manzili noto‘g‘ri', 400)
    console.error('[platform] hisob ochilmadi:', error)
    throw new PlatformError('Hisob ochib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.', 500)
  }

  const info: OwnerInfo = { uid, name: owner.name, email: owner.email, phone: owner.phone }
  try {
    const logo = await storeLogo(draft)
    const batch = shopDocs(db, draft, info, logo, now)
    // Xodim indeksi — kirishda qaysi do'konligini topish uchun
    batch.set(db.collection('staffIndex').doc(uid), { shopId: draft.slug, role: 'owner', shops: [draft.slug], createdAt: now })
    batch.set(phoneRef, { uid, shopId: draft.slug, createdAt: now })
    await batch.commit()

    // Rol — Firestore Rules va admin panel shu belgiga qaraydi
    await auth.setCustomUserClaims(uid, { role: 'owner', shopId: draft.slug })
    await seedCatalog(db, draft.slug, draft.type)
  } catch (error) {
    console.error('[platform] do‘kon yaratilmadi:', error)
    await Promise.allSettled([
      auth.deleteUser(uid),
      removeShopDocs(db, draft.slug, uid),
      db.collection('staffIndex').doc(uid).delete(),
      phoneRef.delete(),
    ])
    throw new PlatformError('Do‘konni yaratib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.', 500)
  }
  return { owner: info }
}

/** Ikkinchi (va keyingi) do'kon: tasdiqlangan ariza, egasining mavjud hisobi bilan. */
async function createFromInvite(db: Firestore, draft: Draft, code: string, authorization: string) {
  const uid = await bearerUid(authorization)
  const invite = await claimInvite(db, uid, code)
  const now = new Date().toISOString()

  try {
    await reserveSlug(db, draft, now)
  } catch (error) {
    await releaseInvite(db, invite.id)
    throw error
  }

  const indexRef = db.collection('staffIndex').doc(uid)
  const previous = (await indexRef.get()).data()
  const info: OwnerInfo = { uid, name: invite.ownerName, email: invite.ownerEmail, phone: invite.ownerPhone }
  try {
    const logo = await storeLogo(draft)
    const batch = shopDocs(db, draft, info, logo, now, { requestId: invite.id })
    // Yangi do'kon ro'yxatga qo'shiladi va darhol faol bo'ladi — panel shuni ochadi
    batch.set(indexRef, { shopId: draft.slug, role: 'owner', shops: [...shopsOfIndex(previous), draft.slug] }, { merge: true })
    await batch.commit()
    await setActiveClaims(uid, draft.slug, 'owner')
    await seedCatalog(db, draft.slug, draft.type)
    await finishInvite(db, invite.id, draft.slug)
  } catch (error) {
    console.error('[platform] ariza bo‘yicha do‘kon yaratilmadi:', error)
    await removeShopDocs(db, draft.slug, uid)
    // Eski holat qaytadi: oldingi faol do'kon va uning claim'i
    if (previous) {
      await indexRef.set(previous).catch(() => {})
      if (previous.shopId) await setActiveClaims(uid, String(previous.shopId), String(previous.role || 'owner')).catch(() => {})
    }
    await releaseInvite(db, invite.id)
    if (error instanceof PlatformError) throw error
    throw new PlatformError('Do‘konni yaratib bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.', 500)
  }
  return { owner: info }
}
