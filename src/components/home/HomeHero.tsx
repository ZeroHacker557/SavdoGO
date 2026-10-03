import { ArrowRight, Clock, Flame, LayoutGrid, Store, Truck } from 'lucide-react'
import { createElement, useMemo, type CSSProperties, type ReactNode } from 'react'
import { formatPrice } from '../../data'
import { categoryIcon } from '../../utils/category-icons'
import { categoryLabel } from '../../config/categories'
import { productThumb } from '../../utils/product-image'
import { heroImageOf, type ShopConfig } from '../../platform/shop'
import { ensureContrast } from '../../platform/palette'
import { useShop } from '../../shop/context'
import { useI18n, type TranslationKey } from '../../i18n'
import type { Promotion } from '../../utils/promotions'
import type { AppPage, Category, Product } from '../../types/domain'

type Props = {
  products: Product[]
  categories: Category[]
  promotions: Promotion[]
  onNavigate: (page: AppPage) => void
  onOpenCategory: (category: string) => void
  onOpenProduct: (product: Product) => void
}

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string

type ViewProps = Props & {
  shop: Pick<ShopConfig, 'type' | 'hero' | 'delivery' | 'contacts'>
  t: Translate
  lang: string
  /** Sahifadagi chekinishlar — admin namunasida kerak emas. */
  inset?: boolean
}

type Perk = { key: string; icon: typeof Truck; title: string; text: string }

/**
 * Bosh sahifa banneri — to'rt ko'rinish (admin: «Dizayn va aloqa» →
 * «Bosh sahifa banneri» → Ko'rinish):
 *
 *   classic   — rangli karta, o'ngda rasm (avvalgi ko'rinish)
 *   immersive — butun karta rasm, matn pastda, shisha chiplar
 *   split     — chapda matn va raqamlar, o'ngda rasm va suzuvchi kartalar
 *   bento     — katta banner + kategoriya + yetkazish/aksiya plitalari
 *
 * Matn, rasm va rang hamma ko'rinishda bir xil manbadan (shop.hero),
 * qo'shimcha ma'lumot (yetkazish sharti, ish vaqti, mahsulotlar soni)
 * do'konning haqiqiy sozlamalaridan olinadi — o'ylab topilgan raqam yo'q.
 */
export function HomeHero(props: Props) {
  const shop = useShop()
  const { t, lang } = useI18n()
  return <HeroView {...props} shop={shop} t={t} lang={lang} />
}

/**
 * Bannerning o'zi — kontekstsiz: do'kon sayti (HomeHero) va admin
 * paneldagi namuna (HeroEditor) bitta komponentni chizadi.
 */
export function HeroView({
  shop, t, lang, inset = true, products, categories, promotions, onNavigate, onOpenCategory, onOpenProduct,
}: ViewProps) {
  const pad = inset ? ' mx-5 mt-6 sm:mx-10' : ''
  const layout = shop.hero.layout
  const image = heroImageOf(shop)
  // Ega tanlagan fon — oq matn o'qilishi uchun yetarlicha to'q
  const color = shop.hero.color ? ensureContrast(shop.hero.color, '#ffffff', 3) : null

  const perks = useMemo<Perk[]>(() => {
    const list: Perk[] = []
    const { delivery, contacts } = shop
    if (delivery.enabled) {
      list.push(
        delivery.freeFrom > 0
          ? { key: 'free', icon: Truck, title: t('hero.freeDelivery'), text: t('hero.from', { amount: formatPrice(delivery.freeFrom) }) }
          : delivery.fee > 0
            ? { key: 'fee', icon: Truck, title: t('checkout.delivery'), text: formatPrice(delivery.fee) }
            : { key: 'free', icon: Truck, title: t('hero.freeDelivery'), text: t('hero.always') },
      )
    }
    if (delivery.pickup) list.push({ key: 'pickup', icon: Store, title: t('checkout.pickup.option'), text: t('hero.pickupFree') })
    if (contacts.workHours) list.push({ key: 'hours', icon: Clock, title: t('hero.hours'), text: contacts.workHours })
    return list
  }, [shop, t])

  const content = {
    badge: t('home.heroBadge'),
    title: t('home.heroTitle'),
    subtitle: t('home.heroSubtitle'),
    cta: t('home.heroCta'),
    catalog: t('nav.catalog'),
  }
  const toCatalog = () => onNavigate('catalog')

  if (layout === 'immersive') {
    return (
      <section className={'hx hx--immersive' + pad}>
        <div className="hx-imm" style={color ? ({ '--hx-tint': color } as CSSProperties) : undefined}>
          {image ? (
            <img className="hx-imm__photo" src={image} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />
          ) : (
            <span className="hx-imm__fallback" aria-hidden="true" />
          )}
          <span className="hx-imm__shade" aria-hidden="true" />
          <div className="hx-imm__body">
            <div className="hx-imm__copy">
              <span className="hx-badge hx-badge--glass hx-in" style={{ '--i': 0 } as CSSProperties}><i /> {content.badge}</span>
              <h2 className="hx-title hx-in" style={{ '--i': 1 } as CSSProperties}>{content.title}</h2>
              <p className="hx-sub hx-in" style={{ '--i': 2 } as CSSProperties}>{content.subtitle}</p>
              <div className="hx-actions hx-in" style={{ '--i': 3 } as CSSProperties}>
                <button className="hx-btn hx-btn--light" onClick={toCatalog}>{content.cta} <ArrowRight size={18} /></button>
                <button className="hx-btn hx-btn--glass" onClick={toCatalog}><LayoutGrid size={17} /> {content.catalog}</button>
              </div>
            </div>
            {perks.length > 0 && (
              <ul className="hx-perks hx-in" style={{ '--i': 4 } as CSSProperties}>
                {perks.map(({ key, icon, title, text }) => (
                  <li key={key}>
                    <span>{createElement(icon, { size: 17 })}</span>
                    <b>{title}</b>
                    <small>{text}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (layout === 'split') {
    const featured = products.find((p) => p.popular) ?? products[0]
    const perk = perks[0]
    return (
      <section className={'hx hx--split' + pad}>
        <div className="hx-split" style={color ? ({ '--hx-tint': color } as CSSProperties) : undefined}>
          <div className="hx-split__copy">
            <span className="hx-badge hx-badge--soft hx-in" style={{ '--i': 0 } as CSSProperties}><i /> {content.badge}</span>
            <h2 className="hx-title hx-in" style={{ '--i': 1 } as CSSProperties}>{content.title}</h2>
            <p className="hx-sub hx-in" style={{ '--i': 2 } as CSSProperties}>{content.subtitle}</p>
            <div className="hx-actions hx-in" style={{ '--i': 3 } as CSSProperties}>
              <button className="hx-btn hx-btn--brand" onClick={toCatalog}>{content.cta} <ArrowRight size={18} /></button>
              <button className="hx-btn hx-btn--outline" onClick={toCatalog}>{content.catalog}</button>
            </div>
            <dl className="hx-stats hx-in" style={{ '--i': 4 } as CSSProperties}>
              <div><dt>{products.length}</dt><dd>{t('hero.items')}</dd></div>
              {categories.length > 0 && <div><dt>{categories.length}</dt><dd>{t('hero.sections')}</dd></div>}
              {perk && <div><dt>{createElement(perk.icon, { size: 20 })}</dt><dd>{perk.title}</dd></div>}
            </dl>
          </div>

          <div className="hx-split__media">
            <div className="hx-split__frame">
              {image ? <img src={image} alt="" aria-hidden="true" decoding="async" fetchPriority="high" /> : <span className="hx-imm__fallback" />}
            </div>
            {featured && (
              <button className="hx-float hx-float--product" onClick={() => onOpenProduct(featured)}>
                {productThumb(featured) && <img src={productThumb(featured)} alt="" />}
                <span>
                  <small>{t('home.popular')}</small>
                  <b>{featured.name}</b>
                  <em>{formatPrice(featured.price)}</em>
                </span>
              </button>
            )}
            {perk && (
              <div className="hx-float hx-float--perk">
                <span>{createElement(perk.icon, { size: 18 })}</span>
                <span><b>{perk.title}</b><small>{perk.text}</small></span>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (layout === 'bento') {
    const counts = new Map<string, number>()
    for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    const topCategory = [...categories].sort((a, b) => (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0))[0]
    const promo = promotions[0]
    const perk = perks[0]
    const side: ReactNode[] = []
    if (topCategory) {
      side.push(
        <button key="cat" className="hx-tile hx-tile--cat hx-in" style={{ '--i': 2 } as CSSProperties} onClick={() => onOpenCategory(topCategory.name)}>
          <span className="hx-tile__icon">{createElement(categoryIcon(topCategory.icon, topCategory.name), { size: 26 })}</span>
          <span className="hx-tile__text">
            <b>{categoryLabel(topCategory, lang)}</b>
            <small>{t('hero.itemsCount', { n: counts.get(topCategory.name) ?? 0 })}</small>
          </span>
          <ArrowRight size={18} className="hx-tile__go" />
        </button>,
      )
    }
    if (promo) {
      side.push(
        <button key="promo" className="hx-tile hx-tile--promo hx-in" style={{ '--i': 3 } as CSSProperties} onClick={toCatalog}>
          <span className="hx-tile__icon"><Flame size={24} /></span>
          <span className="hx-tile__text"><b>−{promo.percent}%</b><small>{promo.title}</small></span>
        </button>,
      )
    } else if (perk) {
      side.push(
        <div key="perk" className="hx-tile hx-tile--perk hx-in" style={{ '--i': 3 } as CSSProperties}>
          <span className="hx-tile__icon">{createElement(perk.icon, { size: 24 })}</span>
          <span className="hx-tile__text"><b>{perk.title}</b><small>{perk.text}</small></span>
        </div>,
      )
    }

    return (
      <section className={'hx hx--bento' + pad}>
        <div className={'hx-bento' + (side.length ? '' : ' hx-bento--solo')}>
          <button
            className="hx-tile hx-tile--main hx-in"
            style={{ '--i': 0, ...(color ? { '--hx-tint': color } : {}) } as CSSProperties}
            onClick={toCatalog}
          >
            {image ? <img className="hx-imm__photo" src={image} alt="" aria-hidden="true" decoding="async" fetchPriority="high" /> : <span className="hx-imm__fallback" />}
            <span className="hx-imm__shade" aria-hidden="true" />
            <span className="hx-tile__main">
              <span className="hx-badge hx-badge--glass"><i /> {content.badge}</span>
              <span className="hx-title">{content.title}</span>
              <span className="hx-sub">{content.subtitle}</span>
              <span className="hx-btn hx-btn--light">{content.cta} <ArrowRight size={18} /></span>
            </span>
          </button>
          {side}
        </div>
      </section>
    )
  }

  // classic — avvalgi ko'rinish
  return (
    <section className={'hx hx--classic' + pad}>
      <div
        className="hero-banner"
        style={color ? { background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 52%, black) 100%)` } : undefined}
      >
        <div className="relative min-h-[260px] p-6 sm:min-h-[340px] sm:p-9">
          <span className="hero-glow" aria-hidden="true" />
          <div className={'relative z-10 ' + (image ? 'max-w-[62%] sm:max-w-[380px]' : 'max-w-[520px]')}>
            <span className="inline-block rounded-full px-3 py-1 text-xs font-bold" style={{ background: '#ffffff', color: 'var(--brand-strong)' }}>
              {content.badge}
            </span>
            <h2 className="wordmark mt-4 text-[1.5rem] leading-[1.15] sm:text-[2.4rem]" style={{ color: '#ffffff', textWrap: 'balance' }}>
              {content.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base" style={{ color: 'rgb(255 255 255 / 0.78)' }}>{content.subtitle}</p>
            <button
              onClick={toCatalog}
              className="mt-5 flex w-fit items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 font-bold transition active:scale-[0.98]"
              style={{ background: '#ffffff', color: 'var(--brand-strong)' }}
            >
              {content.cta} <ArrowRight size={18} />
            </button>
          </div>
          {image && <img className="hero-photo" src={image} alt="" aria-hidden="true" decoding="async" fetchPriority="high" />}
        </div>
      </div>
    </section>
  )
}
