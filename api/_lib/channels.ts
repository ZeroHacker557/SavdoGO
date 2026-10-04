import type { CollectionReference } from 'firebase-admin/firestore'

/**
 * Bot qo'shilgan kanal va guruhlar — ommaviy xabarni ularga ham yuborish uchun.
 *
 * Telegram bot kanalga admin qilib qo'shilganda (yoki chiqarilganda)
 * `my_chat_member` hodisasini yuboradi. Shu yerda u ro'yxatga yoziladi:
 *   SavdoGO boti   → platformChannels/{chatId}
 *   do'kon boti    → shops/{id}/channels/{chatId}
 * Panel ro'yxatni o'qiydi, egasi kerakli kanallarni belgilab yuboradi.
 */

export type ChatMemberUpdate = {
  chat: { id: number; type: string; title?: string; username?: string }
  from?: { id: number; first_name?: string; username?: string }
  new_chat_member?: { status?: string; can_post_messages?: boolean }
}

export type ChannelRow = {
  id: string
  title: string
  username: string | null
  type: 'channel' | 'group' | 'supergroup'
  /** Xabar yoza oladimi: kanalda — «xabar joylash» huquqi bilan admin, guruhda — a'zo. */
  canPost: boolean
  updatedAt: string
}

const TYPES = ['channel', 'group', 'supergroup']

/** Kanal/guruhdagi holat o'zgarishi. Shaxsiy chat bo'lsa — false (chaqiruvchi o'zi ko'radi). */
export async function trackChat(collection: CollectionReference, member: ChatMemberUpdate): Promise<boolean> {
  const chat = member.chat
  if (!TYPES.includes(chat.type)) return false
  const ref = collection.doc(String(chat.id))
  const status = member.new_chat_member?.status || ''

  if (status === 'left' || status === 'kicked') {
    await ref.delete()
    return true
  }
  const admin = status === 'administrator' || status === 'creator'
  const canPost = chat.type === 'channel' ? admin && member.new_chat_member?.can_post_messages !== false : admin || status === 'member'
  await ref.set({
    title: String(chat.title || chat.username || chat.id).slice(0, 120),
    username: chat.username ?? null,
    type: chat.type,
    canPost,
    updatedAt: new Date().toISOString(),
    addedBy: member.from?.id ?? null,
  })
  return true
}

/** Bot API chaqiruvi (SavdoGO yoki do'kon boti): natija yoki xato matni. */
export type BotCall = (method: string, body: Record<string, unknown>) => Promise<{ ok: boolean; result?: unknown; description?: string }>

/**
 * Kanalni QO'LDA qo'shish: `@kanal` yoki `-100…` ID. Bot kanalga hodisa
 * yozilishidan oldin qo'shilgan bo'lsa (yoki Telegram xabar bermagan bo'lsa)
 * ham ishlaydi — Telegram'dan botning shu chatdagi huquqi so'raladi.
 */
export async function addChatManually(collection: CollectionReference, call: BotCall, botId: string, input: unknown): Promise<ChannelRow> {
  let raw = String(input || '').trim()
  const link = /^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{4,})\/?$/.exec(raw)
  if (link) raw = `@${link[1]}`
  if (/^[A-Za-z0-9_]{4,}$/.test(raw) && !/^-?\d+$/.test(raw)) raw = `@${raw}`
  if (!/^@[A-Za-z0-9_]{4,}$/.test(raw) && !/^-?\d{5,20}$/.test(raw)) {
    throw new Error('Kanal manzilini yozing: @kanal_nomi, t.me/kanal_nomi yoki yopiq kanal ID si (-100…)')
  }

  const chatRes = await call('getChat', { chat_id: raw })
  if (!chatRes.ok) throw new Error('Kanal topilmadi — manzil to‘g‘rimi va bot kanalga qo‘shilganmi?')
  const chat = chatRes.result as { id: number; type: string; title?: string; username?: string }
  if (!TYPES.includes(chat.type)) throw new Error('Bu kanal yoki guruh emas')

  const memberRes = await call('getChatMember', { chat_id: chat.id, user_id: Number(botId) })
  const member = (memberRes.result ?? {}) as { status?: string; can_post_messages?: boolean }
  if (!memberRes.ok || !member.status || member.status === 'left' || member.status === 'kicked') {
    throw new Error('Bot bu kanalda yo‘q — avval botni kanalga admin qilib qo‘shing')
  }
  await trackChat(collection, { chat, new_chat_member: member })
  const saved = (await listChannels(collection)).find((c) => c.id === String(chat.id))
  if (!saved) throw new Error('Kanal saqlanmadi')
  if (!saved.canPost) throw new Error('Bot kanalda bor, lekin «Xabar joylash» huquqi yo‘q — kanal sozlamalarida botga shu huquqni bering')
  return saved
}

export async function listChannels(collection: CollectionReference): Promise<ChannelRow[]> {
  const snap = await collection.get()
  return snap.docs
    .map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        title: String(d.title || doc.id),
        username: d.username ?? null,
        type: (TYPES.includes(d.type) ? d.type : 'channel') as ChannelRow['type'],
        canPost: d.canPost === true,
        updatedAt: String(d.updatedAt || ''),
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Yuborish uchun tanlangan kanallar: faqat ro'yxatda BOR va yoza oladiganlari (begona chat qo'shib bo'lmaydi). */
export async function pickChannels(collection: CollectionReference, ids: unknown): Promise<ChannelRow[]> {
  if (!Array.isArray(ids) || !ids.length) return []
  const wanted = new Set(ids.map((v) => String(v)))
  if (wanted.size > 20) throw new Error('Bir martada ko‘pi bilan 20 ta kanal')
  return (await listChannels(collection)).filter((c) => wanted.has(c.id) && c.canPost)
}
