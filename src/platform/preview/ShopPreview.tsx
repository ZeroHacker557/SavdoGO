import { Bell, Heart, House, LayoutGrid, Plus, Search, ShoppingBag, Star, User } from 'lucide-react'
import type { CSSProperties } from 'react'
import { businessType, type BusinessTypeId } from '../business-types'
import { ensureContrast, scopedThemeStyle, type ShopTheme } from '../palette'
import { EMPTY_HERO, heroImageOf, initials, type ShopHero } from '../shop'
import { formatSum } from '../config'
import './preview.css'

type Props = {
  name: string
  tagline?: string
  logo?: string | null
  theme: ShopTheme
  type: BusinessTypeId
  /** Bosh sahifa banneri (admin paneldagi dizayn sahifasi). */
  hero?: ShopHero
  /** Almashganda ekran silliq yangilanadi (landingdagi aylanuvchi namoyish). */
  swapKey?: string
  className?: string
  /**
   * «O'z-o'zidan yig'iladigan do'kon» (landing hero): bo'laklar bo'sh
   * ramkaga birma-bir tushadi — preview.css → .sp-asm. `leaving` —
   * do'kon sochilib ketadi (keyingi biznes turidan oldin).
   */
  assemble?: boolean
  leaving?: boolean
}

/**
 * Telefon ichidagi kichik do'kon — haqiqiy saytning soddalashtirilgan
 * nusxasi. Landingda va ro'yxatdan o'tish formasida ishlatiladi.
 *
 * Ranglar faqat shu element ichiga qo'llanadi (inline CSS
 * o'zgaruvchilari) — sahifaning qolgan qismiga ta'sir qilmaydi.
 */
export function ShopPreview({ name, tagline, logo, theme, type, hero, swapKey, className = '', assemble = false, leaving = false }: Props) {
  const preset = businessType(type)
  const products = [...preset.products].sort((a, b) => Number(!!b.popular) - Number(!!a.popular)).slice(0, 4)
  const style = scopedThemeStyle(theme) as CSSProperties
  const title = name.trim() || 'Do‘koningiz'
  const heroPhoto = heroImageOf({ type, hero: hero ?? EMPTY_HERO })
  const heroColor = hero?.color ? ensureContrast(hero.color, '#ffffff', 3) : null

  return (
    <div className={`sp-phone ${className}${assemble ? ' sp-asm' : ''}${leaving ? ' is-leaving' : ''}`} style={style}>
      <div className="sp-notch" />
      <div className="sp-screen" key={swapKey}>
        <div className="sp-status">
          <span>9:41</span>
          <span className="sp-status__icons">
            <i /><i /><i />
          </span>
        </div>

        <header className="sp-head">
          <span className="sp-logo">
            {logo ? <img src={logo} alt="" /> : <b>{initials(title)}</b>}
          </span>
          <span className="sp-head__text">
            <b>{title}</b>
            <small>{tagline?.trim() || preset.name}</small>
          </span>
          <span className="sp-head__icon">
            <Bell size={14} />
            <em />
          </span>
        </header>

        <div className="sp-search">
          <Search size={12} />
          <span>Qidirish...</span>
        </div>

        <div
          className="sp-hero"
          style={{
            backgroundImage: heroPhoto ? `url(${heroPhoto.replace('w=1200', 'w=600')})` : undefined,
            ...(heroColor ? { '--brand': heroColor } : {}),
          } as CSSProperties}
        >
          <div className="sp-hero__shade" />
          <div className="sp-hero__text">
            <b>{hero?.title || preset.hero.title}</b>
            <span className="sp-hero__btn">Buyurtma berish</span>
          </div>
        </div>

        <div className="sp-chips">
          <span className="is-active">Barchasi</span>
          {preset.categories.slice(0, 4).map((c) => (
            <span key={c.name}>{c.name}</span>
          ))}
        </div>

        <div className="sp-section">
          <b>Mashhur</b>
          <span>Hammasi →</span>
        </div>

        <div className="sp-grid">
          {products.map((p, i) => (
            <div className="sp-card" key={p.name} style={{ '--i': i } as CSSProperties}>
              <div className="sp-card__img">
                <img src={p.image.replace('w=800', 'w=300')} alt="" loading="lazy" decoding="async" />
                {p.oldPrice && (
                  <em className="sp-card__badge">-{Math.round((1 - p.price / p.oldPrice) * 100)}%</em>
                )}
                <span className="sp-card__like"><Heart size={10} /></span>
              </div>
              <div className="sp-card__body">
                <span className="sp-card__name">{p.name}</span>
                <span className="sp-card__rate"><Star size={8} fill="currentColor" /> 4.9</span>
                <div className="sp-card__row">
                  <b>{formatSum(p.price)}</b>
                  <span className="sp-card__add"><Plus size={11} /></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <nav className="sp-nav">
          <span className="is-active"><House size={14} /></span>
          <span><LayoutGrid size={14} /></span>
          <span className="sp-nav__cart"><ShoppingBag size={15} /><em>2</em></span>
          <span><Heart size={14} /></span>
          <span><User size={14} /></span>
        </nav>
      </div>
    </div>
  )
}
