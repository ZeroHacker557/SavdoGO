import type { LucideIcon } from 'lucide-react'
import { BellRing, Bike, Headset, MapPinned, Megaphone, Send, Wallet } from 'lucide-react'
import type { ShopConfig } from './shop'

/**
 * «Telegram va kuryerlar» — do'konning o'z Telegram boti bilan ochiladigan
 * imkoniyatlar. Botni ulash BEPUL: ega BotFather'da bot yaratib, tokenini
 * admin panelga yoki SavdoGO botiga beradi.
 *
 * Kuryer bilan bog'liq HAMMA narsa (kuryer ilovasi, jonli xarita, kassa,
 * kuryer chati) va do'kon botidagi xabarlar bot ulangandan keyin ochiladi.
 * Ungacha admin panelda bu bo'limlar o'rnida shu ro'yxat va ulash yo'li turadi.
 *
 * Matn bitta joyda: landing, ro'yxatdan o'tish formasi, admin paneldagi
 * «Kuryerlar va Telegram» sahifasi va to'lov bo'limi shundan o'qiydi.
 */
export const ADDON_NAME = 'Telegram va kuryerlar'
export const ADDON_PRICE = 'Bepul'
export const ADDON_PITCH =
  'Yetkazib berishni o‘zi boshqaradigan tizim: kuryerlar ilovasi, jonli xarita va Telegram xabarlari. O‘z botingizni ulaysiz — bepul, 2 daqiqada.'

export type AddonBenefit = { icon: LucideIcon; title: string; text: string }

export const ADDON_BENEFITS: AddonBenefit[] = [
  {
    icon: Bike,
    title: 'Kuryerlar ilovasi',
    text: 'Kuryer buyurtmani telefonida oladi: «Oldim», manzilga yo‘l, «Yetib keldim», «Yetkazildi». Qog‘oz va qo‘ng‘iroqlarsiz.',
  },
  {
    icon: MapPinned,
    title: 'Jonli xarita',
    text: 'Har bir kuryer qayerdaligini xaritada ko‘rasiz. Mijoz ham kuryerni kuzatadi — «qachon keladi?» qo‘ng‘iroqlari kamayadi.',
  },
  {
    icon: BellRing,
    title: 'Buyurtmalar Telegram’ga',
    text: 'Yangi buyurtma sizga va kuryerlarga darhol keladi, panel yopiq bo‘lsa ham. «✅ Qabul qilindi» — bitta tugma.',
  },
  {
    icon: Send,
    title: 'Do‘kon Telegram ichida',
    text: 'Mijoz do‘koningizni botda ilovadek ochadi, buyurtma holati unga xabar bo‘lib keladi, baho qoldiradi.',
  },
  {
    icon: Megaphone,
    title: 'Ommaviy xabar',
    text: 'Yangi aksiya haqida barcha Telegram mijozlaringizga rasm va tugma bilan bir bosishda xabar yuboring.',
  },
  {
    icon: Wallet,
    title: 'Kuryerlar kassasi',
    text: 'Kuryer yig‘ilgan naqd pulni ilovadan topshiradi, siz tasdiqlaysiz — har bir so‘m hisobda.',
  },
  {
    icon: Headset,
    title: 'Kuryer bilan chat',
    text: 'Manzil topilmasa yoki mijoz javob bermasa — kuryer ilovadan yozadi, siz paneldan javob berasiz.',
  },
]

/**
 * Holat:
 *   none   — bot ulanmagan: kuryer bo'limlari yopiq, o'rnida ulash yo'li
 *   active — bot ulangan: hammasi ochiq
 */
export type AddonState = 'none' | 'active'

export function addonState(shop: Pick<ShopConfig, 'botUsername'>): AddonState {
  return shop.botUsername ? 'active' : 'none'
}
