import {
  ArrowRight, BadgeCheck, Bell, Check, CreditCard, Gift, LayoutDashboard, MapPin, Package, Palette, Search, Send,
  ShoppingBag, ShoppingCart, Sparkles, Truck, X,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { ShopPreview } from '../src/platform/preview/ShopPreview'
import { businessType, type BusinessTypeId } from '../src/platform/business-types'
import { typeIcon } from '../src/platform/business-icons'
import { CONFETTI, d } from './motion'
import { Particles, Subtitles, Wordmark } from './Promo'
import { LAYERS, SUBTITLES, SWAPS, type LayerId } from './short-timeline'

/**
 * 30 soniyalik tezkor versiya. Sahnalar kesilmaydi — bir-biriga «oqib»
 * o'tadi: lime doira matnni yutadi va telefon ekraniga aylanadi, o'sha
 * telefon ichida do'konlar almashadi, buyurtma bildirishnomasi admin
 * panelga aylanadi va h.k. Joylashuv: short.css (`ps-`), 9:16 — `.ps--v`.
 */

function Layer({ id, className = '', children }: { id: LayerId; className?: string; children: ReactNode }) {
  const { start, len, z } = LAYERS[id]
  return (
    <section className={`ps-layer ${className}`} data-start={start} data-len={len} style={{ zIndex: z }}>
      {children}
    </section>
  )
}

/** Qatlam ichidagi bo'lak o'z vaqtiga ega — animatsiyalari shu lahzadan hisoblanadi. */
function At({ start, len, className = '', style, children }: { start: number; len: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={className} data-start={start} data-len={len.toFixed(2)} style={style}>
      {children}
    </div>
  )
}

/** Telefon — hamma sahnalarda bir xil joyda (--cx, --cy, --ps), shuning uchun o'tishlar choksiz. */
function Phone({ type, name, tagline, assemble = false, still = false, children }: {
  type: BusinessTypeId
  name: string
  tagline: string
  assemble?: boolean
  still?: boolean
  children?: ReactNode
}) {
  const preset = businessType(type)
  return (
    <div className="ps-phone">
      <div className="ps-phone__body">
        <ShopPreview
          name={name}
          tagline={tagline}
          theme={{ brand: preset.brand, accent: preset.accent, font: preset.font }}
          type={type}
          assemble={assemble}
          className={still ? 'ps-still' : ''}
        />
        {children}
      </div>
    </div>
  )
}

/* ── 0–2 s: savol ─────────────────────────────────────────── */
const HOOK: [string, number, boolean?][] = [['Onlayn', 0.05], ['do‘kon', 0.25], ['ochish', 0.45], ['qiyinmi?', 0.9, true]]
const PAINS = ['Qimmat', 'Uzoq', 'Murakkab']
function Hook() {
  return (
    <Layer id="hook" className="pv-dark">
      <div className="pv-orb pv-orb--a" />
      <div className="pv-orb pv-orb--b" />
      <div className="pv-floor" />
      <div className="ps-hook">
        <h1 className="ps-hook__title">
          {HOOK.map(([word, t, hot]) => (
            <span key={word} className={hot ? 'ps-slam ps-hook__hot' : 'ps-slam'} style={d(t)}>{word}</span>
          ))}
        </h1>
        <div className="ps-hook__pains">
          {PAINS.map((p, i) => (
            <span key={p} className="ps-pain a-pop" style={d(1.15 + i * 0.15)}><span><X size={30} strokeWidth={3} /></span>{p}</span>
          ))}
        </div>
      </div>
    </Layer>
  )
}

/* ── 2–4 s: lime doira → SavdoGO → telefon ekrani ─────────── */
function Brand() {
  return (
    <Layer id="brand" className="ps-brand">
      <div className="ps-brand__burst" />
      <div className="ps-brand__panel">
        <div className="ps-brand__logo">
          <Wordmark size="xl" delay={0.3} />
          <p className="ps-brand__tag">5 daqiqada — tayyor onlayn do‘kon</p>
        </div>
      </div>
    </Layer>
  )
}

/* ── 4–8 s: do'kon o'zi yig'iladi ─────────────────────────── */
const TOKENS = [
  { label: 'Logo va nom', icon: BadgeCheck, t: 1.0 },
  { label: 'Brend rangi', icon: Palette, t: 1.5 },
  { label: 'Mahsulotlar', icon: Package, t: 2.0 },
  { label: 'Savat va to‘lov', icon: ShoppingCart, t: 2.5 },
]
function Build() {
  const clothing = businessType('clothing')
  return (
    <>
      <Layer id="buildBg" className="pv-soft">
        <div className="pv-dots" />
        <div className="ps-glow" style={{ background: clothing.brand }} />
      </Layer>
      <Layer id="build">
        <div className="ps-copy ps-out" style={d(4.0)}>
          <h2 className="pv-h2 ps-h2">
            <span className="a-rise" style={d(0.7)}>Do‘koningiz</span>
            <em className="a-rise" style={d(0.85)}>o‘zi yig‘iladi</em>
          </h2>
        </div>
        {TOKENS.map(({ label, icon: Icon, t }, i) => (
          <span key={label} className={`ps-token ps-token--${i + 1}`} style={{ '--delay': `${t}s` } as CSSProperties}>
            <span><Icon size={30} /></span>
            {label}
          </span>
        ))}
        <Phone type="clothing" name="Moda House" tagline="Yangi kolleksiya" assemble>
          <span className="ps-ready"><Check size={22} strokeWidth={3} /> Tayyor!</span>
        </Phone>
      </Layer>
    </>
  )
}

/* ── 8–12 s: har zarbda yangi biznes ──────────────────────── */
const SWAP_SHOPS: { type: BusinessTypeId; shop: string; tagline: string }[] = [
  { type: 'flowers', shop: 'Gulzor', tagline: '2 soatda yetkazamiz' },
  { type: 'bakery', shop: 'Shirin Dunyo', tagline: 'Har kuni yangi' },
  { type: 'furniture', shop: 'Uy Mebel', tagline: 'Yig‘ish bepul' },
  { type: 'cosmetics', shop: 'Nafis', tagline: 'Original mahsulotlar' },
  { type: 'electronics', shop: 'Texno Market', tagline: 'Rasmiy kafolat' },
  { type: 'restaurant', shop: 'Kafe Nur', tagline: 'Milliy taomlar' },
]
function Types() {
  const bg = LAYERS.typesBg
  const fg = LAYERS.types
  const last = SWAPS.length - 1
  const copyOut = 11.65
  return (
    <>
      <Layer id="typesBg" className="pv-dark ps-wipe">
        <div className="pv-orb pv-orb--c" />
        <div className="pv-orb pv-orb--d" />
        <At start={bg.start} len={0.8} className="ps-glow" style={{ background: businessType('clothing').brand }} />
        {SWAP_SHOPS.map(({ type }, i) => (
          <At
            key={type}
            start={SWAPS[i]}
            len={(i < last ? SWAPS[i + 1] + 0.45 : bg.start + bg.len - 0.01) - SWAPS[i]}
            className="ps-glow ps-glow--in"
            style={{ background: businessType(type).brand }}
          />
        ))}
      </Layer>
      <Layer id="types">
        <div className="ps-copy ps-out" style={d(copyOut - fg.start)}>
          <h2 className="pv-h2 ps-h2 ps-h2--light">
            <span className="a-rise" style={d(0.2)}>Har qanday</span>
            <em className="a-rise" style={d(0.35)}>biznes uchun</em>
          </h2>
        </div>
        <span className="ps-badge ps-out" style={d(copyOut - fg.start)}>
          <span className="a-pop" style={d(3.0)}><Sparkles size={28} /> 11 ta tayyor andoza</span>
        </span>
        {SWAP_SHOPS.map(({ type, shop, tagline }, i) => {
          const preset = businessType(type)
          const Icon = typeIcon(type)
          const start = SWAPS[i]
          const end = i < last ? SWAPS[i + 1] + 0.4 : fg.start + fg.len - 0.01
          const out = (i < last ? SWAPS[i + 1] : copyOut) - start
          return (
            <At key={type} start={start} len={end - start} className="ps-swap">
              <Phone type={type} name={shop} tagline={tagline} />
              <span className="ps-typechip" style={{ '--out-at': `${out}s` } as CSSProperties}>
                <span style={{ background: preset.brand }}><Icon size={30} /></span>
                {preset.name}
              </span>
            </At>
          )
        })}
      </Layer>
    </>
  )
}

/* ── 12–16 s: mijoz uchun — kamera telefonga yaqinlashadi ─── */
const FEATS = [
  { icon: Search, text: 'Tezkor qidiruv' },
  { icon: ShoppingCart, text: 'Savat va promokod' },
  { icon: Truck, text: 'Yetkazib berish' },
  { icon: MapPin, text: 'Buyurtma kuzatuvi' },
]
function Client() {
  const restaurant = businessType('restaurant')
  return (
    <>
      <Layer id="clientBg" className="pv-soft pv-soft--warm ps-wipe">
        <div className="pv-dots" />
        <div className="ps-glow" style={{ background: restaurant.brand }} />
      </Layer>
      <Layer id="client" className="ps-push">
        <div className="ps-copy ps-out" style={d(3.4)}>
          <h2 className="pv-h2 ps-h2">
            <span className="a-rise" style={d(0.3)}>Mijozga —</span>
            <em className="a-rise" style={d(0.45)}>ilovadek qulay</em>
          </h2>
        </div>
        <div className="ps-feats ps-out" style={d(3.4)}>
          {FEATS.map(({ icon: Icon, text }, i) => (
            <span key={text} className={`ps-feat ps-feat--${i + 1} a-pop`} style={d(0.4 + i * 0.3)}>
              <span><Icon size={28} /></span>
              {text}
            </span>
          ))}
        </div>
        <Phone type="restaurant" name="Kafe Nur" tagline="Milliy taomlar" still>
          <span className="pv-tap" style={d(2.2)} />
          <span className="pv-plus" style={d(2.35)}>+1</span>
          <div className="ps-notify" style={d(2.8)}>
            <span className="ps-notify__icon"><Bell size={15} /></span>
            <span>
              <small>Kafe Nur · hozirgina</small>
              <b>Yangi buyurtma · 529 000 so‘m</b>
            </span>
          </div>
        </Phone>
      </Layer>
    </>
  )
}

/* ── 16–20 s: bildirishnoma → admin panel ─────────────────── */
const ORDERS = [
  { no: '#1049', who: 'Dilnoza · 3 ta', sum: '529 000', badge: 'new', label: 'Yangi' },
  { no: '#1048', who: 'Sardor · 5 ta', sum: '412 000', badge: 'go', label: 'Yo‘lda' },
  { no: '#1047', who: 'Aziza · 1 ta', sum: '96 000', badge: 'done', label: 'Yetkazildi' },
]
const BARS = [32, 48, 41, 63, 55, 74, 66, 88, 71, 92, 84, 100]
const SIDE: [typeof Package, string][] = [
  [LayoutDashboard, 'Boshqaruv paneli'],
  [ShoppingBag, 'Buyurtmalar'],
  [Package, 'Mahsulotlar'],
  [Sparkles, 'Aksiyalar'],
  [Palette, 'Dizayn'],
]
function Admin() {
  return (
    <Layer id="admin">
      <div className="pv-dark ps-wipe ps-wipe--notify" />
      <div className="ps-zoomout" style={d(4.0)}>
        <span className="ps-label a-drop" style={d(0.55)}><LayoutDashboard size={26} /> Admin panel · real vaqtda</span>
        <div className="ps-admin">
          <div className="pv-window ps-window">
            <div className="pv-window__bar"><i /><i /><i /><span>admin · Kafe Nur</span></div>
            <div className="pv-window__body">
              <aside className="pv-side">
                <b className="pv-side__brand">Kafe Nur</b>
                {SIDE.map(([Icon, label], i) => (
                  <span key={label} className={'pv-side__item' + (i === 0 ? ' is-active' : '')}><Icon size={20} /> {label}</span>
                ))}
              </aside>
              <div className="pv-dash">
                <div className="pv-dash__stats">
                  <div className="pv-stat a-rise" style={d(0.4)}><small>Bugungi tushum</small><b><span data-count="4850000" data-at="0.5" data-dur="1.7">0</span> so‘m</b><em>+32%</em></div>
                  <div className="pv-stat a-rise" style={d(0.5)}><small>Buyurtmalar</small><b data-count="27" data-at="0.6" data-dur="1.5">0</b><em>+6</em></div>
                  <div className="pv-stat a-rise" style={d(0.6)}><small>Yangi mijozlar</small><b data-count="14" data-at="0.7" data-dur="1.4">0</b><em>+4</em></div>
                </div>
                <div className="pv-dash__row">
                  <div className="pv-chart a-rise" style={d(0.7)}>
                    <small>Oxirgi 12 kun</small>
                    <div className="pv-chart__bars">
                      {BARS.map((h, i) => <i key={i} style={{ height: `${h}%`, ...d(0.85 + i * 0.05) }} />)}
                    </div>
                  </div>
                  <div className="pv-orders">
                    {ORDERS.map((o, i) => (
                      <div key={o.no} className="pv-order a-right" style={d(1.0 + i * 0.15)}>
                        <span><b>{o.no}</b> · {o.who}</span>
                        <span className="pv-order__sum">{o.sum} so‘m</span>
                        <span className={`pv-badge pv-badge--${o.badge}`}>{o.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pv-toast ps-tg" style={d(2.5)}>
          <span className="pv-toast__icon"><Send size={24} /></span>
          <span><small>Telegram · hozirgina</small><b>Yangi buyurtma #1050 · 238 000 so‘m</b></span>
        </div>
        <span className="ps-courier a-pop" style={d(3.0)}><span><Truck size={26} /></span> Kuryer yo‘lda · ~12 daqiqa</span>
      </div>
    </Layer>
  )
}

/* ── 20–24 s: 10 kun bepul — kamera ichkariga «kirib» keladi ── */
const PERKS = [
  { icon: CreditCard, text: 'Karta kerak emas' },
  { icon: Sparkles, text: 'Hamma imkoniyat ochiq' },
]
function Trial() {
  return (
    <Layer id="trial">
      <div className="ps-zoomin">
        <div className="pv-trial ps-fill">
          <div className="pv-rays pv-rays--lime" />
          <div className="pv-trial__glow" />
        </div>
        <span className="pv-trial__kicker a-drop" style={d(0.25)}><Gift size={30} /> Maxsus taklif</span>
        <div className="pv-trial__stage">
          <div className="pv-gift a-pop" style={d(0.35)}>
            <div className="pv-gift__shake" style={d(0.6)}>
              <div className="pv-gift__drop" style={d(1.05)}>
                <span className="pv-gift__lid" style={d(0.95)} />
                <span className="pv-gift__box" />
              </div>
            </div>
          </div>
          <div className="pv-burst pv-trial__burst a-burst" style={d(0.98)} />
          <div className="pv-confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <i
                key={i}
                style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.rot}deg`, '--d': `${c.delay - 0.17}s`, background: c.color, width: c.w, height: c.w * 0.55 } as CSSProperties}
              />
            ))}
          </div>
          <div className="pv-trial__big a-zoom" style={d(1.1)}>
            <b data-count="10" data-at="1.1" data-dur="0.6">10</b>
            <span>kun<em>bepul</em></span>
          </div>
        </div>
        <div className="pv-days">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={d(1.75 + i * 0.06)}>{i + 1}</i>
          ))}
        </div>
        <div className="pv-perks">
          {PERKS.map(({ icon: Icon, text }, i) => (
            <span key={text} className="pv-perk a-pop" style={d(2.6 + i * 0.15)}>
              <span><Icon size={28} /></span> {text}
            </span>
          ))}
        </div>
        <Particles count={20} />
      </div>
    </Layer>
  )
}

/* ── 24–26 s: narx — karta butun ekranni qoplaydi ─────────── */
function Price() {
  return (
    <Layer id="price" className="ps-whip">
      <div className="pv-light ps-fill"><div className="pv-dots" /></div>
      <h2 className="pv-h2 ps-price__title ps-out" style={d(1.9)}>
        <span className="a-rise" style={d(0.25)}>Oddiy narx —</span> <em className="a-rise" style={d(0.35)}>yashirin to‘lovsiz</em>
      </h2>
      <div className="ps-mini ps-mini--a ps-out" style={d(1.9)}>
        <div className="a-card" style={d(0.5)}><small>Haftalik</small><b>89 000</b><small>so‘m / hafta</small></div>
      </div>
      <div className="ps-mini ps-mini--b ps-out" style={d(1.9)}>
        <div className="a-card" style={d(0.6)}><small>Yillik · −16%</small><b>2 000 000</b><small>so‘m / yil</small></div>
      </div>
      <div className="ps-plan">
        <span className="ps-plan__kicker">Oylik tarif · eng ko‘p tanlanadi</span>
        <span className="ps-plan__price"><b data-count="199000" data-at="0.45" data-dur="0.7">0</b><small>so‘m / oy</small></span>
        <span className="ps-plan__note"><Gift size={24} /> Avval 10 kun bepul</span>
        <span className="ps-plan__btn">Bepul boshlash <ArrowRight size={26} /></span>
      </div>
    </Layer>
  )
}

/* ── 26–30 s: yakun ───────────────────────────────────────── */
function Cta() {
  return (
    <Layer id="cta" className="pv-dark ps-cta">
      <div className="pv-rays" />
      <div className="pv-orb pv-orb--b" />
      <div className="ps-cta__melt" />
      <div className="pv-center pv-cta__col ps-cta__col">
        <Wordmark size="xl" delay={0.15} />
        <span className="pv-cta__url a-rise" style={d(0.9)}><span className="pv-type" style={d(1.05)}>savdogo.shop</span></span>
        <span className="pv-cta__btn a-pop" style={d(1.6)}><Gift size={34} /> 10 kun bepul boshlash <ArrowRight size={30} /></span>
        <p className="pv-cta__tag a-rise" style={d(2.0)}>5 daqiqada tayyor · Telefonda qulay · Karta kerak emas</p>
      </div>
      <Particles count={30} />
    </Layer>
  )
}

/** 30 soniyalik versiya. vertical — 9:16 (1080×1920). */
export function Short({ subtitles, vertical = false }: { subtitles: boolean; vertical?: boolean }) {
  return (
    <div className={'pv-frame' + (vertical ? ' pv-frame--v' : '')}>
      <div className={'pv ps' + (vertical ? ' ps--v' : '')}>
        <Hook />
        <Brand />
        <Build />
        <Types />
        <Client />
        <Admin />
        <Trial />
        <Price />
        <Cta />
        {subtitles && <Subtitles items={SUBTITLES} />}
      </div>
    </div>
  )
}
