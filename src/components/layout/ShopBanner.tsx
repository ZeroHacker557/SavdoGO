import { ArrowLeft, Eye, Clock } from 'lucide-react'
import { useT } from '../../i18n'
import { canTakeOrders } from '../../platform/shop'
import { isPreview } from '../../shop/active'
import { useShop } from '../../shop/context'

/**
 * Sahifa tepasidagi holat qatori.
 *
 *   Oldindan ko'rish — do'kon hali yaratilmagan (formadagi qoralama):
 *     «Formaga qaytish» havolasi bilan.
 *   To'lanmagan / muddati tugagan — mijoz saytni ko'radi, lekin
 *     buyurtma bera olmasligini oldindan biladi (checkout'da kutilmagan
 *     xato chiqmasin).
 * Faol do'konda hech narsa chizilmaydi.
 */
export function ShopBanner() {
  const t = useT()
  const shop = useShop()
  const preview = isPreview()
  if (!preview && canTakeOrders(shop)) return null

  const Icon = preview ? Eye : Clock
  const text = preview
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
          <ArrowLeft size={12} /> {t('shop.previewBack')}
        </a>
      )}
    </div>
  )
}
