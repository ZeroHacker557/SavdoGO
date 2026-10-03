/**
 * Tasdiqlangan «ikkinchi do'kon» arizasi — forma shu ma'lumot bilan
 * ochiladi (api/_lib/platform/owners.ts → inviteCheck). Yangi do'kon
 * egasining MAVJUD hisobiga qo'shiladi: email va parol so'ralmaydi.
 */
export type InviteInfo = {
  code: string
  name: string
  type: string
  slug: string
  ownerName: string
  ownerEmail: string
}

/** Ariza qoldiriladigan joy — admin panelning «Yangi do'kon» bo'limi. */
export const NEW_SHOP_URL = '/admin#/newshop'
