import {
  ArrowRight, BadgeCheck, Bell, BellRing, Check, Clock3, CreditCard, Gift, Hourglass, Languages, LayoutDashboard, MapPin, Package,
  Palette, Search, Send, ShoppingBag, ShoppingCart, Sparkles, Store, Truck, Wallet, Wrench, X,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { ShopPreview } from '../src/platform/preview/ShopPreview'
import { businessType, type BusinessTypeId } from '../src/platform/business-types'
import { typeIcon } from '../src/platform/business-icons'
import { CONFETTI, d } from './motion'
import { SCENES, SUBTITLES, type SceneId } from './timeline'

function Scene({ id, className = '', children }: { id: SceneId; className?: string; children: ReactNode }) {
  const { start, len } = SCENES[id]
  return (
    <section className={`pv-scene ${className}`} data-start={start} data-len={len} style={{ '--len': `${len}s` } as CSSProperties}>
      {children}
    </section>
  )
}

export function Wordmark({ size = 'lg', delay = 0 }: { size?: 'lg' | 'xl'; delay?: number }) {
  return (
    <span className={`pv-word pv-word--${size}`}>
      {'Savdo'.split('').map((ch, i) => (
        <span key={i} className="pv-word__ch a-letter" style={d(delay + i * 0.06)}>{ch}</span>
      ))}
      <span className="pv-word__go a-pop" style={d(delay + 0.42)}>GO</span>
      <span className="pv-word__shine" style={d(delay + 1.1)} />
    </span>
  )
}

/* ── 1. Kirish ─────────────────────────────────────────── */
function Intro() {
  return (
    <Scene id="intro" className="pv-dark">
      <div className="pv-orb pv-orb--a" />
      <div className="pv-orb pv-orb--b" />
      <div className="pv-floor" />
      <div className="pv-center">
        <div className="pv-intro-zoom">
          <Wordmark size="xl" delay={0.35} />
          <p className="pv-intro__tag a-rise" style={d(1.6)}>Biznesingiz uchun tayyor onlayn do‘kon</p>
        </div>
      </div>
      <Particles count={26} />
    </Scene>
  )
}

/* ── 2. Muammo ─────────────────────────────────────────── */
const PAINS = [
  { icon: Wallet, title: 'Qimmat dasturchi', text: 'Sayt yasatish katta xarajat' },
  { icon: Hourglass, title: 'Oylab kutish', text: 'Tayyor bo‘lguncha savdo yo‘q' },
  { icon: Wrench, title: 'Murakkab boshqaruv', text: 'Har o‘zgarish — yana pul' },
]
function Problem() {
  return (
    <Scene id="problem" className="pv-light">
      <div className="pv-dots" />
      <h2 className="pv-h2 pv-problem__title">
        <span className="a-drop" style={d(0.2)}>Onlayn</span> <span className="a-drop" style={d(0.32)}>do‘kon</span>{' '}
        <span className="a-drop" style={d(0.44)}>ochish...</span>
      </h2>
      <div className="pv-pains">
        {PAINS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="pv-pain a-card" style={d(0.6 + i * 0.18)}>
            <div className="pv-pain__inner" style={d(2.0 + i * 0.4)}>
              <span className="pv-pain__icon"><Icon size={44} /></span>
              <b>{title}</b>
              <small>{text}</small>
            </div>
            {/* Kulrang qatlamdan tashqarida — belgi qizilligicha qoladi */}
            <span className="pv-pain__x a-stamp" style={d(2.0 + i * 0.4)}><X size={56} strokeWidth={3} /></span>
          </div>
        ))}
      </div>
      <div className="pv-problem__answer">
        <div className="pv-burst a-burst" style={d(3.95)} />
        <h2 className="pv-h2 pv-h2--xl a-zoom" style={d(4.05)}>
          SavdoGO bilan — <em>5 daqiqada</em>
        </h2>
      </div>
    </Scene>
  )
}

/* ── 3. Do'kon o'zi yig'iladi ──────────────────────────── */
const BUILD_STEPS = [
  { t: 0.3, icon: Store, text: 'Biznes turi tanlandi' },
  { t: 1.0, icon: BadgeCheck, text: 'Logo va do‘kon nomi' },
  { t: 1.7, icon: Palette, text: 'Brend rangi va banner' },
  { t: 2.5, icon: Package, text: 'Mahsulotlar va kategoriyalar' },
  { t: 3.2, icon: ShoppingBag, text: 'Savat va admin panel' },
]
const TOKENS = [
  { label: 'Logo va nom', icon: BadgeCheck, delay: 0, cls: 'pv-token--a' },
  { label: 'Rang', icon: Palette, delay: 0.7, cls: 'pv-token--b' },
  { label: 'Mahsulotlar', icon: Package, delay: 1.4, cls: 'pv-token--c' },
  { label: 'Savat', icon: ShoppingBag, delay: 2.1, cls: 'pv-token--d' },
]
function Build() {
  const preset = businessType('clothing')
  return (
    <Scene id="build" className="pv-soft">
      <div className="pv-dots" />
      <div className="pv-glow" style={{ background: preset.brand }} />
      <div className="pv-build">
        <div className="pv-build__copy">
          <h2 className="pv-h2 pv-h2--big">
            <span className="a-rise" style={d(0.15)}>Do‘koningiz</span>
            <em className="a-rise" style={d(0.3)}>o‘zi yig‘iladi</em>
          </h2>
          <ol className="pv-steps">
            {BUILD_STEPS.map(({ t, icon: Icon, text }) => (
              <li key={text} className="a-rise" style={{ ...d(0.5), '--t': `${t}s` } as CSSProperties}>
                <span className="pv-steps__icon">
                  <Check size={22} strokeWidth={3} className="pv-steps__check" />
                  <Icon size={20} className="pv-steps__glyph" />
                </span>
                {text}
              </li>
            ))}
          </ol>
        </div>
        <div className="pv-build__stage">
          <div className="pv-phone pv-phone--lg">
            <ShopPreview name="Moda House" tagline="Yangi kolleksiya" theme={{ brand: preset.brand, accent: preset.accent, font: preset.font }} type="clothing" assemble />
          </div>
          {TOKENS.map(({ label, icon: Icon, delay, cls }) => (
            <span key={label} className={`pv-token ${cls}`} style={{ '--delay': `${delay}s` } as CSSProperties}>
              <span><Icon size={22} /></span>
              {label}
            </span>
          ))}
          <div className="pv-notify" style={d(3.9)}>
            <span className="pv-notify__icon"><BellRing size={24} /></span>
            <span>
              <small>Moda House · hozirgina</small>
              <b>Yangi buyurtma · 838 000 so‘m</b>
            </span>
          </div>
        </div>
      </div>
    </Scene>
  )
}

/* ── 4. Har qanday biznes ──────────────────────────────── */
const TYPES: { type: BusinessTypeId; shop: string; tagline: string }[] = [
  { type: 'restaurant', shop: 'Kafe Nur', tagline: 'Milliy taomlar' },
  { type: 'flowers', shop: 'Gulzor', tagline: '2 soatda yetkazamiz' },
  { type: 'clothing', shop: 'Moda House', tagline: 'Yangi kolleksiya' },
  { type: 'furniture', shop: 'Uy Mebel', tagline: 'Yig‘ish bepul' },
  { type: 'bakery', shop: 'Shirin Dunyo', tagline: 'Har kuni yangi' },
]
function Types() {
  return (
    <Scene id="types" className="pv-dark">
      <div className="pv-orb pv-orb--c" />
      <div className="pv-orb pv-orb--d" />
      <h2 className="pv-h2 pv-types__title">
        <span className="a-rise" style={d(0.1)}>Har qanday</span> <em className="a-rise" style={d(0.25)}>biznes uchun</em>
      </h2>
      <div className="pv-parade">
        {TYPES.map(({ type, shop, tagline }, i) => {
          const preset = businessType(type)
          const Icon = typeIcon(type)
          return (
            <div key={type} className="pv-parade__item a-flip" style={{ ...d(0.35 + i * 0.16), '--c': preset.brand } as CSSProperties}>
              <div className="pv-phone pv-phone--sm">
                <ShopPreview name={shop} tagline={tagline} theme={{ brand: preset.brand, accent: preset.accent, font: preset.font }} type={type} />
              </div>
              <span className="pv-parade__chip"><span><Icon size={20} /></span>{preset.name}</span>
            </div>
          )
        })}
      </div>
      <span className="pv-types__badge a-pop" style={d(3.9)}><Sparkles size={26} /> 11 ta tayyor andoza</span>
    </Scene>
  )
}

/* ── 5. Mijoz uchun sayt ───────────────────────────────── */
const FEATURES = [
  { icon: Search, text: 'Tezkor qidiruv', cls: 'pv-feat--1' },
  { icon: ShoppingCart, text: 'Savat va promokod', cls: 'pv-feat--2' },
  { icon: Truck, text: 'Yetkazib berish', cls: 'pv-feat--3' },
  { icon: Store, text: 'Olib ketish', cls: 'pv-feat--4' },
  { icon: MapPin, text: 'Buyurtma kuzatuvi', cls: 'pv-feat--5' },
  { icon: Languages, text: 'O‘zbek / Русский', cls: 'pv-feat--6' },
]
function Client() {
  const preset = businessType('restaurant')
  return (
    <Scene id="client" className="pv-soft pv-soft--warm">
      <div className="pv-dots" />
      <div className="pv-glow" style={{ background: preset.brand }} />
      <h2 className="pv-h2 pv-client__title">
        <span className="a-rise" style={d(0.1)}>Mijozingiz uchun —</span> <em className="a-rise" style={d(0.25)}>ilovadek qulay</em>
      </h2>
      <div className="pv-client">
        <div className="pv-phone pv-phone--lg pv-client__phone a-tilt" style={d(0.2)}>
          <ShopPreview name="Kafe Nur" tagline="Milliy va Yevropa taomlari" theme={{ brand: preset.brand, accent: preset.accent, font: preset.font }} type="restaurant" />
          <span className="pv-tap" style={d(3.2)} />
          <span className="pv-plus" style={d(3.35)}>+1</span>
        </div>
        {FEATURES.map(({ icon: Icon, text, cls }, i) => (
          <span key={text} className={`pv-feat ${cls} a-pop`} style={d(0.8 + i * 0.32)}>
            <span><Icon size={24} /></span>
            {text}
          </span>
        ))}
      </div>
    </Scene>
  )
}

/* ── 6. Admin panel ────────────────────────────────────── */
const ORDERS = [
  { no: '#1048', who: 'Dilnoza · 2 ta', sum: '185 000', badge: 'new', label: 'Yangi' },
  { no: '#1047', who: 'Sardor · 5 ta', sum: '412 000', badge: 'go', label: 'Yo‘lda' },
  { no: '#1046', who: 'Aziza · 1 ta', sum: '96 000', badge: 'done', label: 'Yetkazildi' },
  { no: '#1045', who: 'Jasur · 3 ta', sum: '238 000', badge: 'done', label: 'Yetkazildi' },
]
const BARS = [32, 48, 41, 63, 55, 74, 66, 88, 71, 92, 84, 100]
function Admin() {
  return (
    <Scene id="admin" className="pv-dark">
      <div className="pv-orb pv-orb--a" />
      <div className="pv-admin-cam">
        <div className="pv-window">
          <div className="pv-window__bar"><i /><i /><i /><span>admin · Moda House</span></div>
          <div className="pv-window__body">
            <aside className="pv-side">
              <b className="pv-side__brand">Moda House</b>
              {[
                [LayoutDashboard, 'Boshqaruv paneli'],
                [ShoppingBag, 'Buyurtmalar'],
                [Package, 'Mahsulotlar'],
                [Sparkles, 'Aksiyalar'],
                [Palette, 'Dizayn'],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof Package
                return <span key={label as string} className={'pv-side__item' + (i === 0 ? ' is-active' : '')}><I size={20} /> {label as string}</span>
              })}
            </aside>
            <div className="pv-dash">
              <div className="pv-dash__stats">
                <div className="pv-stat a-rise" style={d(0.5)}><small>Bugungi tushum</small><b><span data-count="4850000" data-at="0.6" data-dur="2.4">0</span> so‘m</b><em>+32%</em></div>
                <div className="pv-stat a-rise" style={d(0.62)}><small>Buyurtmalar</small><b data-count="27" data-at="0.7" data-dur="2.2">0</b><em>+6</em></div>
                <div className="pv-stat a-rise" style={d(0.74)}><small>Yangi mijozlar</small><b data-count="14" data-at="0.8" data-dur="2">0</b><em>+4</em></div>
              </div>
              <div className="pv-dash__row">
                <div className="pv-chart a-rise" style={d(0.9)}>
                  <small>Oxirgi 12 kun</small>
                  <div className="pv-chart__bars">
                    {BARS.map((h, i) => <i key={i} style={{ height: `${h}%`, ...d(1.1 + i * 0.07) }} />)}
                  </div>
                </div>
                <div className="pv-orders">
                  {ORDERS.map((o, i) => (
                    <div key={o.no} className="pv-order a-right" style={d(1.4 + i * 0.22)}>
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
        <div className="pv-toast" style={d(4.4)}>
          <span className="pv-toast__icon"><Bell size={24} /></span>
          <span><small>Hozirgina</small><b>Yangi buyurtma #1049 · 529 000 so‘m</b></span>
        </div>
      </div>
    </Scene>
  )
}

/* ── 7. Telegram va kuryerlar ──────────────────────────── */
function Telegram() {
  return (
    <Scene id="telegram" className="pv-tg">
      <div className="pv-dots pv-dots--light" />
      <span className="pv-tg__chip a-drop" style={d(0.1)}><Send size={22} /> Telegram va kuryerlar · qo‘shimcha to‘plam</span>
      <div className="pv-tg__grid">
        <div className="pv-chat a-left" style={d(0.25)}>
          <div className="pv-chat__head"><span className="pv-chat__avatar">MH</span><span><b>Moda House bot</b><small>bot</small></span></div>
          <div className="pv-chat__body">
            <div className="pv-msg a-msg" style={d(0.8)}>
              <b>🆕 Yangi buyurtma #1043</b>
              <span>👤 Dilnoza · 2 ta mahsulot</span>
              <span>💰 838 000 so‘m · 🚚 Yetkazib berish</span>
              <div className="pv-msg__btns">
                <span className="pv-msg__btn pv-msg__btn--press" style={d(2.3)}>✅ Qabul qilish</span>
                <span className="pv-msg__btn">🚚 Kuryerga</span>
              </div>
            </div>
            <div className="pv-msg pv-msg--ok a-msg" style={d(2.7)}>✅ Qabul qilindi — kuryer Sardor yo‘lda</div>
          </div>
        </div>
        <div className="pv-map a-right" style={d(0.45)}>
          <svg className="pv-map__streets" viewBox="0 0 640 520" aria-hidden="true">
            <path d="M0 120 H640 M0 300 H640 M0 450 H640 M140 0 V520 M330 0 V520 M520 0 V520 M0 40 L640 380" />
            <path className="pv-map__route" d="M90 450 H330 V300 H520 V120" />
          </svg>
          <span className="pv-map__home"><MapPin size={34} /></span>
          <span className="pv-map__courier" style={d(2.9)}><Truck size={22} /></span>
          <span className="pv-map__eta a-pop" style={d(3.1)}><Clock3 size={18} /> Kuryer yo‘lda · ~12 daqiqa</span>
        </div>
      </div>
    </Scene>
  )
}

/* ── 8. 10 kun bepul ───────────────────────────────────── */
const PERKS = [
  { icon: Sparkles, text: 'Hamma imkoniyat ochiq' },
  { icon: ShoppingBag, text: 'Buyurtmalar qabul qilinadi' },
  { icon: CreditCard, text: 'Karta kerak emas' },
]
function Trial() {
  return (
    <Scene id="trial" className="pv-dark pv-trial">
      <div className="pv-rays pv-rays--lime" />
      <div className="pv-trial__glow" />
      <span className="pv-trial__kicker a-drop" style={d(0.15)}><Gift size={30} /> Maxsus taklif</span>

      <div className="pv-trial__stage">
        {/* Sovg'a: chiqadi → silkinadi → qopqog'i otiladi → quti tushib ketadi */}
        <div className="pv-gift a-pop" style={d(0.25)}>
          <div className="pv-gift__shake" style={d(0.7)}>
            <div className="pv-gift__drop" style={d(1.25)}>
              <span className="pv-gift__lid" style={d(1.12)} />
              <span className="pv-gift__box" />
            </div>
          </div>
        </div>
        <div className="pv-burst pv-trial__burst a-burst" style={d(1.15)} />
        <div className="pv-confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <i
              key={i}
              style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.rot}deg`, '--d': `${c.delay}s`, background: c.color, width: c.w, height: c.w * 0.55 } as CSSProperties}
            />
          ))}
        </div>
        <div className="pv-trial__big a-zoom" style={d(1.3)}>
          <b data-count="10" data-at="1.3" data-dur="0.75">10</b>
          <span>kun<em>bepul</em></span>
        </div>
      </div>

      <div className="pv-days">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={d(2.05 + i * 0.07)}>{i + 1}</i>
        ))}
      </div>

      <div className="pv-perks">
        {PERKS.map(({ icon: Icon, text }, i) => (
          <span key={text} className="pv-perk a-pop" style={d(2.75 + i * 0.16)}>
            <span><Icon size={28} /></span> {text}
          </span>
        ))}
      </div>
      <Particles count={24} />
    </Scene>
  )
}

/* ── 9. Narxlar ────────────────────────────────────────── */
function Pricing() {
  const plans = [
    { name: 'Haftalik', price: '89 000', unit: 'hafta', note: 'Qisqa muddatga' },
    { name: 'Oylik', price: '199 000', unit: 'oy', note: 'Eng ko‘p tanlanadi', hot: true },
    { name: 'Yillik', price: '2 000 000', unit: 'yil', note: '−16% tejaysiz' },
  ]
  return (
    <Scene id="pricing" className="pv-light">
      <div className="pv-dots" />
      <h2 className="pv-h2 pv-pricing__title">
        <span className="a-rise" style={d(0.1)}>Oddiy narx,</span> <em className="a-rise" style={d(0.25)}>yashirin to‘lovsiz</em>
      </h2>
      <span className="pv-pricing__trial a-pop" style={d(1.0)}><Gift size={26} /> Har bir tarif — 10 kun bepul sinovdan boshlanadi</span>
      <div className="pv-plans">
        {plans.map((p, i) => (
          <div key={p.name} className={'pv-plan a-card' + (p.hot ? ' pv-plan--hot' : '')} style={d(0.45 + i * 0.18)}>
            {p.hot && <span className="pv-plan__badge a-pop" style={d(1.3)}>{p.note}</span>}
            <b>{p.name}</b>
            <span className="pv-plan__price">{p.price}<small> so‘m / {p.unit}</small></span>
            {!p.hot && <small className="pv-plan__note">{p.note}</small>}
            <span className="pv-plan__btn">Bepul boshlash <ArrowRight size={22} /></span>
          </div>
        ))}
      </div>
    </Scene>
  )
}

/* ── 10. Yakun ─────────────────────────────────────────── */
function Cta() {
  return (
    <Scene id="cta" className="pv-dark pv-cta">
      <div className="pv-rays" />
      <div className="pv-orb pv-orb--b" />
      <div className="pv-center pv-cta__col">
        <Wordmark size="xl" delay={0.2} />
        <span className="pv-cta__url a-rise" style={d(1.3)}><span className="pv-type" style={d(1.5)}>savdogo.shop</span></span>
        <span className="pv-cta__btn a-pop" style={d(2.6)}><Gift size={34} /> 10 kun bepul boshlash <ArrowRight size={30} /></span>
        <p className="pv-cta__tag a-rise" style={d(3.1)}>5 daqiqada tayyor · Telefonda qulay · Karta kerak emas</p>
      </div>
      <Particles count={34} />
    </Scene>
  )
}

/** Sekin suzuvchi nuqtalar — fon jonli turadi. */
export function Particles({ count }: { count: number }) {
  return (
    <div className="pv-particles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        // Deterministik «tasodif» — har renderda bir xil joylashuv
        const r = (n: number) => ((Math.sin(i * 999 + n * 77) + 1) / 2)
        return (
          <i
            key={i}
            style={{
              left: `${r(1) * 100}%`,
              top: `${r(2) * 100}%`,
              width: 3 + r(3) * 6,
              height: 3 + r(3) * 6,
              animationDelay: `${-r(4) * 8}s`,
              animationDuration: `${6 + r(5) * 6}s`,
              opacity: 0.25 + r(6) * 0.5,
            }}
          />
        )
      })}
    </div>
  )
}

/** Subtitrlar — har biri o'z vaqtida chiqadi (data-start / data-len). */
export function Subtitles({ items }: { items: { start: number; end: number; text: string }[] }) {
  return (
    <div className="pv-subs">
      {items.map((s) => (
        <span key={s.start} className="pv-sub" data-start={s.start} data-len={(s.end - s.start).toFixed(2)} style={{ '--len': `${(s.end - s.start).toFixed(2)}s` } as CSSProperties}>
          {s.text}
        </span>
      ))}
    </div>
  )
}

/** vertical — 9:16 (1080×1920): sahnalar o'sha, joylashuv promo.css dagi `.pv--v` da. */
export function Promo({ subtitles, vertical = false }: { subtitles: boolean; vertical?: boolean }) {
  return (
    <div className={'pv-frame' + (vertical ? ' pv-frame--v' : '')}>
      <div className={'pv' + (vertical ? ' pv--v' : '')}>
        <Intro />
        <Problem />
        <Build />
        <Types />
        <Client />
        <Admin />
        <Telegram />
        <Trial />
        <Pricing />
        <Cta />
        {subtitles && <Subtitles items={SUBTITLES} />}
      </div>
    </div>
  )
}
