import {
  ArrowRight, BadgeCheck, BellRing, Check, ExternalLink, Gift, LayoutDashboard, Package, Palette, Send, ShoppingBag, Sparkles, Store,
} from 'lucide-react'
import { createElement, useEffect, useRef, useState, type CSSProperties } from 'react'
import { businessType, type BusinessTypeId } from '../../platform/business-types'
import { typeIcon } from '../../platform/business-icons'
import { ShopPreview } from '../../platform/preview/ShopPreview'
import { TRIAL_DAYS, formatSum, platformBotLink, shopLink } from '../../platform/config'
import { initials } from '../../platform/shop'
import { goTo } from '../router'
import { prefersReducedMotion } from '../hooks'
import { ownerStatus, useOwnerShop, type OwnerShop } from '../owner'

/**
 * «Do'kon o'z-o'zidan yig'iladi».
 *
 * Bo'sh telefon ramkasi → atrofdan bo'laklar (logo, rang, mahsulotlar,
 * savat) uchib kirib joyiga tushadi → birinchi buyurtma bildirishnomasi
 * → do'kon sochilib, keyingi biznes turi bo'lib qayta yig'iladi.
 * Chapdagi qadamlar ro'yxati shu vaqt bilan belgilanadi (asosiy va'da —
 * «formani to'ldirasiz, qolganini platforma qiladi» — ko'z bilan).
 *
 * Vaqtlar preview.css (.sp-asm) bilan bir xil — birini o'zgartirsangiz
 * ikkinchisini ham.
 */
const SHOWCASE: { type: BusinessTypeId; shop: string; tagline: string; order: number }[] = [
  { type: 'clothing', shop: 'Moda House', tagline: 'Yangi kolleksiya', order: 838_000 },
  { type: 'restaurant', shop: 'Kafe Nur', tagline: 'Milliy va Yevropa taomlari', order: 185_000 },
  { type: 'flowers', shop: 'Gulzor', tagline: '2 soatda yetkazamiz', order: 350_000 },
  { type: 'furniture', shop: 'Uy Mebel', tagline: 'Yetkazish va yig‘ish bepul', order: 6_900_000 },
  { type: 'bakery', shop: 'Shirin Dunyo', tagline: 'Har kuni yangi', order: 320_000 },
  { type: 'electronics', shop: 'TechnoPark', tagline: 'Rasmiy kafolat', order: 6_900_000 },
  { type: 'cosmetics', shop: 'Beauty Lab', tagline: 'Original kosmetika', order: 459_000 },
]

/** Yig'ilish ~4 s, ko'rib turish, keyin sochilish — soniyalar (ms). */
const LEAVE_AT = 7000
const LEAVE_MS = 600

/** Telefonga uchib kiradigan bo'laklar: qachon chiqadi va qayerga uchadi. */
const TOKENS = [
  { key: 'logo', label: 'Logo va nom', icon: BadgeCheck, delay: 0, cls: 'asm-token--a' },
  { key: 'color', label: 'Rang', icon: Palette, delay: 0.7, cls: 'asm-token--b' },
  { key: 'items', label: 'Mahsulotlar', icon: Package, delay: 1.4, cls: 'asm-token--c' },
  { key: 'cart', label: 'Savat', icon: ShoppingBag, delay: 2.1, cls: 'asm-token--d' },
]

function preload(index: number) {
  const preset = businessType(SHOWCASE[index].type)
  const urls = [
    preset.hero.image.replace('w=1200', 'w=600'),
    ...preset.products.slice(0, 6).map((p) => p.image.replace('w=800', 'w=300')),
  ]
  for (const url of urls) {
    const img = new Image()
    img.src = url
  }
}

export function Hero() {
  const owner = useOwnerShop()
  const still = prefersReducedMotion()
  const [cycle, setCycle] = useState({ index: 0, n: 0 })
  const [leaving, setLeaving] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(true)

  // Ekrandan chiqqanda yoki yorliq yashirin bo'lsa — aylanish to'xtab turadi
  useEffect(() => {
    const el = stageRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (still) return
    preload((cycle.index + 1) % SHOWCASE.length)
    let leaveTimer = 0
    let nextTimer = 0
    const leave = () => {
      if (!visibleRef.current || document.hidden) {
        leaveTimer = window.setTimeout(leave, 700)
        return
      }
      setLeaving(true)
      nextTimer = window.setTimeout(() => {
        setLeaving(false)
        setCycle((c) => ({ index: (c.index + 1) % SHOWCASE.length, n: c.n + 1 }))
      }, LEAVE_MS)
    }
    leaveTimer = window.setTimeout(leave, LEAVE_AT)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(nextTimer)
    }
  }, [cycle, still])

  const pick = (index: number) => {
    setLeaving(false)
    setCycle((c) => ({ index, n: c.n + 1 }))
  }

  const item = SHOWCASE[cycle.index]
  const preset = businessType(item.type)
  const steps = [
    { t: 0.15, icon: Store, text: `Biznes turi: ${preset.name}` },
    { t: 1.0, icon: BadgeCheck, text: 'Logo va do‘kon nomi' },
    { t: 1.7, icon: Palette, text: 'Brend rangi va banner' },
    { t: 2.5, icon: Package, text: `${preset.products.length} ta mahsulot va kategoriyalar` },
    { t: 3.2, icon: ShoppingBag, text: 'Savat, buyurtma va admin panel' },
  ]
  const style = { '--hero-brand': preset.brand, '--cycle': `${LEAVE_AT + LEAVE_MS}ms` } as CSSProperties

  return (
    <section className={'lp-hero' + (still ? ' is-still' : '')} style={style} id="top">
      <div className="lp-hero__bg" aria-hidden="true">
        <div className="lp-hero__dots" />
        <div className="lp-hero__glow" />
      </div>

      <div className="lp-container lp-hero__inner">
        <div className="lp-hero__copy">
          {owner ? (
            <OwnerCard owner={owner} />
          ) : (
            <span className="lp-eyebrow" data-reveal>
              <b>Yangi</b> O‘zbekiston bizneslari uchun platforma
            </span>
          )}

          <h1 className="lp-h1" data-reveal style={{ '--d': '0.08s' } as CSSProperties}>
            Onlayn do‘koningiz <em>o‘zi yig‘iladi</em>
          </h1>

          <p className="lp-lead" data-reveal style={{ '--d': '0.16s' } as CSSProperties}>
            Biznes turini tanlang, logo va rangni qo‘ying — <b>sayt, savat, buyurtmalar va admin panel</b> bir necha
            daqiqada tayyor. Dasturchi ham, dizayner ham kerak emas.
          </p>

          <div className="lp-hero__ctas" data-reveal style={{ '--d': '0.24s' } as CSSProperties}>
            {owner ? (
              <>
                <a className="lp-btn lp-btn--primary" href="/admin">
                  <LayoutDashboard size={18} /> Admin panelga o‘tish
                </a>
                <a className="lp-btn lp-btn--ghost" href={shopLink(owner.id)} target="_blank" rel="noreferrer">
                  Saytni ochish <ExternalLink size={17} />
                </a>
              </>
            ) : (
              <>
                <button className="lp-btn lp-btn--primary lp-btn--shine" onClick={() => goTo('start')}>
                  Do‘konimni yaratish <ArrowRight size={19} />
                </button>
                {/* SavdoGO boti bo'lsa — do'konni Telegram'da ochish (saytdagi formaning o'zi, parolsiz) */}
                {platformBotLink() ? (
                  <a className="lp-btn lp-btn--ghost" href={platformBotLink()!} target="_blank" rel="noreferrer">
                    <Send size={17} /> Telegram orqali
                  </a>
                ) : (
                  <a className="lp-btn lp-btn--ghost" href="#how">
                    Qanday ishlaydi?
                  </a>
                )}
              </>
            )}
          </div>

          {!owner && (
            <p className="lp-hero__trial" data-reveal style={{ '--d': '0.28s' } as CSSProperties}>
              <span className="lp-hero__trial-icon"><Gift size={15} /></span>
              <b>{TRIAL_DAYS} kun bepul</b>
              <span className="lp-hero__trial-rest">to‘liq imkoniyatlar · karta kerak emas</span>
            </p>
          )}

          {/* Telefondagi yig'ilish bilan bir vaqtda belgilanadi. Paydo bo'lish
              (data-reveal) — o'ramda: ro'yxat har aylanishda qayta chiziladi */}
          <div data-reveal style={{ '--d': '0.32s' } as CSSProperties}>
            <ol className="asm-steps" key={`steps-${cycle.n}`}>
              {steps.map(({ t, icon, text }) => (
                <li key={text} style={{ '--t': `${t}s` } as CSSProperties}>
                  <span className="asm-steps__icon">
                    <Check size={13} strokeWidth={3} className="asm-steps__check" />
                    {createElement(icon, { size: 14, className: 'asm-steps__glyph' })}
                  </span>
                  {text}
                </li>
              ))}
              <li className="asm-steps__final" style={{ '--t': '3.95s' } as CSSProperties}>
                <span className="asm-steps__icon"><Sparkles size={13} /></span>
                Birinchi buyurtma keldi!
              </li>
            </ol>
          </div>
        </div>

        <div className="lp-hero__stage" ref={stageRef} data-reveal="zoom" style={{ '--d': '0.15s' } as CSSProperties}>
          <div className="asm-stage" key={`stage-${cycle.n}`}>
            <div className="lp-stage__phone">
              <ShopPreview
                name={item.shop}
                tagline={item.tagline}
                theme={{ brand: preset.brand, accent: preset.accent, font: preset.font }}
                type={item.type}
                swapKey={`${item.type}-${cycle.n}`}
                assemble={!still}
                leaving={leaving}
              />
            </div>

            {!still && TOKENS.map(({ key, label, icon, delay, cls }) => (
              <span key={key} className={`asm-token ${cls}`} style={{ '--delay': `${delay}s` } as CSSProperties} aria-hidden="true">
                <span>{createElement(icon, { size: 15 })}</span>
                {label}
              </span>
            ))}

            <div className={'asm-notify' + (leaving ? ' is-leaving' : '')} aria-hidden="true">
              <span className="asm-notify__icon"><BellRing size={16} /></span>
              <span>
                <small>{item.shop} · hozirgina</small>
                <b>Yangi buyurtma · {formatSum(item.order)}</b>
              </span>
            </div>

            {/* Telefonda — joriy qadam bitta qatorda */}
            <div className="asm-caption" aria-hidden="true">
              {steps.slice(1).map(({ t, text }, i) => (
                <span key={text} style={{ '--t': `${t}s`, '--len': `${(steps[i + 2]?.t ?? 3.95) - t}s` } as CSSProperties}>
                  <Check size={13} strokeWidth={3} /> {text}
                </span>
              ))}
              <span className="asm-caption__final" style={{ '--t': '3.95s' } as CSSProperties}>
                <Sparkles size={13} /> Birinchi buyurtma keldi!
              </span>
            </div>
          </div>

          <div className="lp-switch" role="tablist" aria-label="Biznes turi">
            {SHOWCASE.map((s, i) => {
              const t = businessType(s.type)
              const Icon = typeIcon(s.type)
              const active = i === cycle.index
              return (
                <button
                  key={s.type}
                  role="tab"
                  aria-selected={active}
                  aria-label={t.name}
                  title={t.name}
                  className={active ? 'is-active' : ''}
                  style={{ '--sw-color': t.brand } as CSSProperties}
                  onClick={() => pick(i)}
                >
                  <Icon size={18} />
                  {active && !still && <i key={cycle.n} className="lp-switch__progress" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Do'kon egasi kirganda — o'z do'koni, holati va tezkor havolalar. */
function OwnerCard({ owner }: { owner: OwnerShop }) {
  const status = ownerStatus(owner)
  const hello = owner.ownerName ? `Salom, ${owner.ownerName.split(' ')[0]}!` : 'Xush kelibsiz!'
  return (
    // data-reveal yo'q: karta kechroq (seans tekshirilgach) chiqadi — o'z animatsiyasi bor
    <div className="lp-owner">
      <span className="lp-owner__mark" style={{ background: owner.logo ? '#fff' : owner.brand }}>
        {owner.logo ? <img src={owner.logo} alt="" /> : initials(owner.name)}
      </span>
      <span className="lp-owner__text">
        <small>{hello} Sizning do‘koningiz</small>
        <b>{owner.name}</b>
      </span>
      <span className={`lp-owner__status is-${status.tone}`}><i /> {status.label}</span>
    </div>
  )
}
