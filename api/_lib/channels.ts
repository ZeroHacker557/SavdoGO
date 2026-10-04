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
