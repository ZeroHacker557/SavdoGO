import { adminDb } from '../firebase-admin.js'
import { PlatformError } from './errors.js'
import { esc } from './notify.js'
import { publicBase, tgRequest, type TgResponse } from './tgbot.js'
import type { SuperUser } from './super.js'
import { PLATFORM } from '../../../src/platform/plans.js'
import { listChannels, pickChannels } from '../channels.js'

/**
 * /super → «Xabar»: SavdoGO botidagi hamma (yoki tanlangan guruh) ga
 * ommaviy xabar — rasm/video, matn, rangli inline tugmalar.
 *
 * Ro'yxat brauzerda hisoblanadi (`super.broadcast.audience` — kim do'kon
 * egasi, kim sinovda, kim hali do'kon ochmagan), server esa bo'laklab
 * yuboradi (`super.broadcast.send`, ≤ 40 ta) — Telegram soniyasiga ~30
 * xabar beradi, Vercel funksiyasi ham uzoq ishlamasin. Har bo'lakda faqat
 * `tgUsers` da BOR odamga yoziladi — ro'yxatga begona chat qo'shib bo'lmaydi.
 * Botni bloklaganlar belgilanadi va keyingi xabarlarda o'tkazib yuboriladi.
 *
 * Kanal va guruhlar: SavdoGO boti admin qilib qo'shilgan kanallar
 * (`platformChannels`, channels.ts) ro'yxatda chiqadi, tanlanganlariga ham
 * yuboriladi. Kanalda mini app tugmasi ishlamaydi — tugmalar botga yoki
 * saytga havola bo'ladi; `{ism}` o'rniga «do'stlar».
 */

const CAPTION_MAX = 1024
const TEXT_MAX = 4000
const MAX_BUTTONS = 8
const PER_ROW = 3
const CHUNK_MAX = 40
const DAY = 86_400_000

type Style = 'success' | 'primary' | 'danger'
type ButtonKind = 'url' | 'start' | 'admin' | 'menu' | 'bot'

type Media = { kind: 'photo' | 'video'; url: string; fileId: string | null }
type Button = { text: string; kind: ButtonKind; url: string; style: Style | null; sameRow: boolean }
type Options = { silent: boolean; protect: boolean; noPreview: boolean }

const STYLES: Style[] = ['success', 'primary', 'danger']
const KINDS: ButtonKind[] = ['url', 'start', 'admin', 'menu', 'bot']

const text = (value: unknown, max = 5000) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const plainLength = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&(lt|gt|amp|quot);/g, ' ').length

/* ─── Kimga ───────────────────────────────────────────────── */

export type AudienceRow = {
  id: string
  name: string
  username: string | null
  hasPhone: boolean
  blocked: boolean
  lastSeen: string | null
  createdAt: string | null
  /** Do'kon egasi bo'lsa — do'koni va uning holati. */
  shop: { id: string; name: string; state: 'trial' | 'active' | 'expired' | 'blocked' } | null
}

function shopState(data: Record<string, unknown>): 'trial' | 'active' | 'expired' | 'blocked' {
  if (data.status === 'blocked') return 'blocked'
  const until = typeof data.paidUntil === 'string' ? Date.parse(data.paidUntil) : 0
  if (data.status !== 'active' || (until && until <= Date.now())) return 'expired'
  return data.trial === true ? 'trial' : 'active'
}

export async function broadcastAudience() {
  const db = await adminDb()
  const [tg, index, shops, history, channels] = await Promise.all([
    db.collection('tgUsers').get(),
    db.collection('staffIndex').get(),
    db.collection('shops').get(),
    db.collection('platformBroadcasts').orderBy('createdAt', 'desc').limit(15).get(),
    listChannels(db.collection('platformChannels')),
  ])
  const shopOfUid = new Map(index.docs.map((doc) => [doc.id, String(doc.data().shopId || '')]))
  const shopById = new Map(shops.docs.map((doc) => [doc.id, doc.data()]))

  const users: AudienceRow[] = tg.docs.map((doc) => {
    const d = doc.data()
    const shopId = d.uid ? shopOfUid.get(String(d.uid)) || '' : ''
    const shop = shopId ? shopById.get(shopId) : undefined
    return {
      id: doc.id,
      name: [d.firstName, d.lastName].filter(Boolean).join(' ') || (d.username ? `@${d.username}` : `ID ${doc.id}`),
      username: d.username ?? null,
      hasPhone: Boolean(d.phone),
      blocked: d.blocked === true,
      lastSeen: d.lastSeen ?? d.updatedAt ?? null,
      createdAt: d.createdAt ?? null,
      shop: shop ? { id: shopId, name: String(shop.name || shopId), state: shopState(shop) } : null,
    }
  })

  return {
    users,
    channels,
    history: history.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    testChat: Boolean(process.env.PLATFORM_CHAT_ID),
    botUsername: PLATFORM.botUsername || null,
  }
}

/* ─── Nima ────────────────────────────────────────────────── */

function readMedia(value: unknown): Media | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const url = text(raw.url, 2000)
  if (!url) return null
  if (!/^https:\/\/\S+$/i.test(url)) throw new PlatformError('Rasm/video havolasi noto‘g‘ri')
  if (raw.type !== 'image' && raw.type !== 'video') throw new PlatformError('Faqat rasm yoki video')
  const fileId = text(raw.fileId, 400)
  return { kind: raw.type === 'image' ? 'photo' : 'video', url, fileId: /^[\w-]{10,400}$/.test(fileId) ? fileId : null }
}

function readButtons(value: unknown): Button[] {
  if (!Array.isArray(value)) return []
  if (value.length > MAX_BUTTONS) throw new PlatformError(`Ko‘pi bilan ${MAX_BUTTONS} ta tugma`)
  return value.map((item, index) => {
    const raw = (item ?? {}) as Record<string, unknown>
    const label = text(raw.text, 100)
    const kind = KINDS.includes(raw.kind as ButtonKind) ? (raw.kind as ButtonKind) : 'url'
    const url = text(raw.url, 2000)
    const n = index + 1
    if (!label) throw new PlatformError(`${n}-tugmaning matni bo‘sh`)
    if (label.length > 64) throw new PlatformError(`${n}-tugmaning matni juda uzun (64 belgigacha)`)
    if (kind === 'url' && !/^(https?:\/\/|tg:\/\/)\S+$/i.test(url)) throw new PlatformError(`${n}-tugmaning havolasi https:// bilan boshlansin`)
    const style = STYLES.includes(raw.style as Style) ? (raw.style as Style) : null
    return { text: label, kind, url: kind === 'url' ? url : '', style, sameRow: index > 0 && raw.sameRow === true }
  })
}

/**
 * Kanal postidagi tugma: mini app va callback u yerda ishlamaydi — o'rniga
 * botni kerakli joyda ochadigan havola (t.me/<bot>?start=…). Bot nomi
 * bo'lmasa — saytning o'zi.
 */
function channelLink(kind: ButtonKind): string {
  const bot = PLATFORM.botUsername
  if (!bot) return `${publicBase()}${kind === 'admin' ? '/admin' : '/start'}`
  return `https://t.me/${bot}?start=${kind === 'bot' ? 'bot' : kind === 'start' ? 'shop' : 'menu'}`
}

/** Tugmalar → Telegram qatorlari: «yonma-yon» belgilangani oldingisi bilan bir qatorda (≤ 3 ta). */
function keyboard(buttons: Button[], channel = false): unknown[][] {
  const base = publicBase()
  const rows: unknown[][] = []
  for (const b of buttons) {
    const button: Record<string, unknown> =
      b.kind === 'url' ? { text: b.text, url: b.url }
        : channel ? { text: b.text, url: channelLink(b.kind) }
          : b.kind === 'start' ? { text: b.text, web_app: { url: `${base}/start` } }
            : b.kind === 'admin' ? { text: b.text, web_app: { url: `${base}/admin` } }
              : { text: b.text, callback_data: b.kind === 'bot' ? 'bot' : 'm' }
    if (b.style) button.style = b.style
    const last = rows[rows.length - 1]
    if (b.sameRow && last && last.length < PER_ROW) last.push(button)
    else rows.push([button])
  }
  return rows
}

/** `{ism}` — qabul qiluvchining ismi (HTML xavfsiz). */
function personalize(template: string, firstName: string): string {
  return template.replace(/\{ism\}/gi, esc(firstName || 'do‘st'))
}

type Content = { body: string; media: Media | null; rows: unknown[][]; channelRows: unknown[][]; options: Options }

function readContent(input: Record<string, unknown>): Content {
  const body = text(input.text, TEXT_MAX + 100)
  const media = readMedia(input.media)
  if (!body && !media) throw new PlatformError('Xabar matni bo‘sh')
  if (body.length > TEXT_MAX) throw new PlatformError(`Xabar juda uzun (${TEXT_MAX} belgigacha)`)
  const raw = (input.options ?? {}) as Record<string, unknown>
  const buttons = readButtons(input.buttons)
  return {
    body,
    media,
    rows: keyboard(buttons),
    channelRows: keyboard(buttons, true),
    options: { silent: raw.silent === true, protect: raw.protect === true, noPreview: raw.noPreview === true },
  }
}

type Delivery = { ok: boolean; blocked: boolean; fileId: string | null; error: TgResponse<unknown> | null }

/**
 * Bitta odamga. Rasm/video bo'lsa matn uning izohi; izoh 1024 belgidan
 * oshsa — avval rasm, keyin matn tugmalar bilan alohida xabar.
 */
async function deliver(chatId: string, firstName: string, content: Content, fileId: string | null, channel = false): Promise<Delivery> {
  const body = personalize(content.body, firstName)
  const rows = channel ? content.channelRows : content.rows
  const common: Record<string, unknown> = {
    chat_id: chatId,
    parse_mode: 'HTML',
    ...(content.options.silent ? { disable_notification: true } : {}),
    ...(content.options.protect ? { protect_content: true } : {}),
  }
  const markup = rows.length ? { reply_markup: { inline_keyboard: rows } } : {}
  let result: TgResponse<Record<string, unknown>>
  let newFileId = fileId

  if (content.media) {
    const fits = plainLength(body) <= CAPTION_MAX
    const method = content.media.kind === 'photo' ? 'sendPhoto' : 'sendVideo'
    result = await tgRequest(method, {
      ...common,
      [content.media.kind]: fileId ?? content.media.url,
      ...(fits && body ? { caption: body } : {}),
      ...(fits || !body ? markup : {}),
      ...(content.media.kind === 'video' ? { supports_streaming: true } : {}),
    })
    if (result.ok) {
      const r = result.result ?? {}
      const photos = r.photo as { file_id: string }[] | undefined
      newFileId = (content.media.kind === 'photo' ? photos?.[photos.length - 1]?.file_id : (r.video as { file_id?: string } | undefined)?.file_id) ?? newFileId
      if (!fits && body) result = await tgRequest('sendMessage', { ...common, text: body, link_preview_options: { is_disabled: true }, ...markup })
    }
  } else {
    result = await tgRequest('sendMessage', { ...common, text: body, link_preview_options: { is_disabled: content.options.noPreview }, ...markup })
  }

  // HTML xato — hamma uchun bir xil bo'ladi: darhol to'xtatamiz
  if (!result.ok && result.error_code === 400 && /parse|entit/i.test(result.description || '')) {
    throw new PlatformError(`Telegram matnni o‘qiy olmadi (HTML xato): ${result.description}`)
  }
  if (!result.ok && result.error_code === 400 && /wrong.*(file|url)|failed to get http url|wrong type of the web page content/i.test(result.description || '')) {
    throw new PlatformError(`Telegram rasm/videoni yuklab ololmadi: ${result.description}`)
  }
  return {
    ok: result.ok,
    blocked: !result.ok && result.error_code === 403,
    fileId: newFileId,
    error: result.ok ? null : result,
  }
}

/** Bir bo'lak qabul qiluvchiga. `test: true` — faqat PLATFORM_CHAT_ID ga (sizga). */
export async function broadcastSend(_user: SuperUser, input: Record<string, unknown>) {
  const content = readContent(input)
  let fileId = content.media?.fileId ?? null

  if (input.test === true) {
    const chat = process.env.PLATFORM_CHAT_ID
    if (!chat) throw new PlatformError('Sinov uchun Vercel’da PLATFORM_CHAT_ID qo‘ying (botga /id yozing — raqamni beradi)')
    const result = await deliver(chat, 'Siz', content, fileId)
    if (!result.ok) throw new PlatformError(`Sinov xabari ketmadi: ${result.error?.description || 'Telegram rad etdi'}`)
    return { sent: 1, failed: 0, blocked: 0, skipped: 0, mediaId: result.fileId }
  }

  const db = await adminDb()

  // Kanal va guruhlar — faqat ro'yxatdagilari (bot o'zi qo'shilgan joylar)
  let channelsSent = 0
  const channelErrors: string[] = []
  const channels = await pickChannels(db.collection('platformChannels'), input.channels)
  for (const channel of channels) {
    const result = await deliver(channel.id, 'do‘stlar', content, fileId, true)
    fileId = result.fileId
    if (result.ok) channelsSent++
    else channelErrors.push(`${channel.title}: ${result.error?.description || 'Telegram rad etdi'}`)
  }

  const recipients = Array.isArray(input.recipients) ? input.recipients : []
  if (!channels.length && !Array.isArray(input.recipients)) throw new PlatformError('Qabul qiluvchilar ro‘yxati yo‘q')
  const ids = [...new Set(recipients.map((v) => String(v).trim()).filter((v) => /^\d{3,20}$/.test(v)))]
  if (ids.length > CHUNK_MAX) throw new PlatformError(`Bir bo‘lakda ${CHUNK_MAX} tadan ko‘p bo‘lmaydi`)

  const snaps = ids.length ? await db.getAll(...ids.map((id) => db.collection('tgUsers').doc(id))) : []
  let sent = 0
  let failed = 0
  let blocked = 0
  let skipped = recipients.length - ids.length

  for (const snap of snaps) {
    const data = snap.data()
    if (!snap.exists || data?.blocked === true) {
      skipped++
      continue
    }
    const result = await deliver(snap.id, String(data?.firstName || ''), content, fileId)
    fileId = result.fileId
    if (result.ok) sent++
    else if (result.blocked) {
      blocked++
      await snap.ref.set({ blocked: true, blockedAt: new Date().toISOString() }, { merge: true })
    } else failed++
    // Telegram: soniyasiga ~30 xabar
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  return { sent, failed, blocked, skipped, channelsSent, channelErrors, mediaId: fileId }
}

/** Yuborish tugagach (yoki to'xtatilganda) — tarixga. */
export async function broadcastLog(user: SuperUser, input: Record<string, unknown>) {
  const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))
  const body = text(input.text, TEXT_MAX)
  const db = await adminDb()
  const ref = await db.collection('platformBroadcasts').add({
    createdAt: new Date().toISOString(),
    by: user.email || user.uid,
    audience: text(input.audience, 80),
    total: n(input.total),
    sent: n(input.sent),
    failed: n(input.failed),
    blocked: n(input.blocked),
    skipped: n(input.skipped),
    stopped: input.stopped === true,
    preview: body.replace(/<[^>]+>/g, '').slice(0, 160),
    media: input.media === 'image' || input.media === 'video' ? input.media : null,
    buttons: n(input.buttons),
    channels: n(input.channels),
  })
  // Eski yozuvlar to'planib qolmasin
  const old = await db.collection('platformBroadcasts').where('createdAt', '<', new Date(Date.now() - 180 * DAY).toISOString()).limit(50).get()
  for (const doc of old.docs) await doc.ref.delete()
  return { id: ref.id }
}
