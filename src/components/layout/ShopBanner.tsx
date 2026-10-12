import { ArrowLeft, ArrowRight, Clock, Eye, Sparkles } from 'lucide-react'
import { useT } from '../../i18n'
import { canTakeOrders } from '../../platform/shop'
import { isDemo, isPreview } from '../../shop/active'
import { useShop } from '../../shop/context'

/**
 * Sahifa tepasidagi holat qatori.
 *
 *   Oldindan ko'rish — do'kon hali yaratilmagan (formadagi qoralama):
 *     «Formaga qaytish» havolasi bilan.
 *   Demo do'kon (landingdan `/?demo`) — «O'zimnikini ochish» havolasi
 *     bilan ro'yxatdan o'tish formasiga.
 *   To'lanmagan / muddati tugagan — mijoz saytni ko'radi, lekin
 *     buyurtma bera olmasligini oldindan biladi (checkout'da kutilmagan
 *     xato chiqmasin).
 * Faol do'konda hech narsa chizilmaydi.
 */
export function ShopBanner() {
  const t = useT()
  const shop = useShop()
  const preview = isPreview()
  const demo = isDemo()
  if (!preview && canTakeOrders(shop)) return null

  const Icon = demo ? Sparkles : preview ? Eye : Clock
  const text = demo
    ? t('shop.showcaseBanner')
    : preview
    ? t('shop.previewBanner')
    : shop.status === 'demo' ? t('shop.demoBanner') : t('shop.expiredBanner')

  return (
    <div
      role="status"
      className="relative z-30 flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-bold"
      style={{ background: 'var(--ink)', color: 'var(--surface)' }}
    >
      <Icon size={14} className="shrink-0" />
      <span>{text}</span>
      {preview && (
        <a
          href="/start"
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1"
          style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
        >
          {demo ? <>{t('shop.showcaseCta')} <ArrowRight size={12} /></> : <><ArrowLeft size={12} /> {t('shop.previewBack')}</>}
        </a>
      )}
    </div>
  )
}
