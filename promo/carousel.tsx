import type { CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowRight, BarChart3, Bell, Bike, Bookmark, CreditCard, Globe, LayoutGrid, Palette, Percent, Send, ShoppingCart, Sparkles, Store,
} from 'lucide-react'
import { ShopPreview } from '../src/platform/preview/ShopPreview'
import { businessType } from '../src/platform/business-types'
import { PLANS, PLATFORM, TRIAL_DAYS, formatSum } from '../src/platform/plans'
import './carousel.css'

/**
 * Instagram karusel: 4 ta slayd bitta 4320×1350 tuvalda chiziladi —
 * egri chiziq va rang dog'lari slayddan slaydga o'tib ketadi, surish
 * istagini uyg'otadi. carousel.mjs uni suratga olib, 4 ga bo'ladi.
 */

const BOT = PLATFORM.botUsername || 'savdogouz_bot'
const cafe = businessType('restaurant')

function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`cr-word cr-word--${size}`}>
      Savdo<b>GO</b>
    </span>
  )
}

function Top({ n, tag }: { n: number; tag?: string }) {
  return (
    <div className="cr-top">
      {tag ? <span className="cr-pill">{tag}</span> : <Wordmark />}
      <span className="cr-num"><b>{n}</b>/4</span>
    </div>
  )
}

/** Slayd o'ng chetidagi «suring» belgisi. */
function Swipe({ label }: { label: string }) {
  return (
    <div className="cr-swipe">
      <span>{label}</span>
      <i><ArrowRight size={34} strokeWidth={2.6} /></i>
    </div>
  )
}

const DMS: { who: string; text: string; time: string; tone?: 'angry' }[] = [
  { who: 'Dilnoza', text: 'Narxi qancha? 🙏', time: '09:12' },
  { who: 'Aziz', text: 'Bormi hali?', time: '09:14' },
  { who: 'Malika', text: 'Yetkazib berasizmi?', time: '09:15' },
  { who: 'Sardor', text: 'Rasmini tashlang', time: '09:21' },
  { who: 'Nodira', text: 'Javob bering!!! 😡', time: '09:40', tone: 'angry' },
]

function SlideHook() {
  return (
    <section className="cr-slide cr-s1">
      <Top n={1} tag="Tadbirkorlar uchun" />
      <h1 className="cr-h1">
        Hali ham buyurtmani <mark>Direct’da</mark> olyapsizmi?
      </h1>

      <div className="cr-dms">
        <span className="cr-dms__badge">+47 javobsiz xabar</span>
        {DMS.map((m, i) => (
          <div key={m.who} className={`cr-dm${m.tone ? ` is-${m.tone}` : ''}`} style={{ '--i': i } as CSSProperties}>
            <span className="cr-dm__ava">{m.who[0]}</span>
            <span className="cr-dm__body">
              <b>{m.who}</b>
              <span>{m.text}</span>
            </span>
            <small>{m.time}</small>
          </div>
        ))}
      </div>

      <p className="cr-sub">
        Har bir mijozga qo‘lda javob, narxni qayta-qayta yozish, buyurtma — daftarda… <b>Tanish-a?</b>
      </p>
      <Swipe label="Yechim bor" />
    </section>
  )
}

function SlideSolution() {
  return (
    <section className="cr-slide cr-s2">
      <Top n={2} />
      <p className="cr-kicker"><Sparkles size={30} /> Yechim</p>
      <h2 className="cr-h2">
        5 daqiqada o‘z <mark>onlayn do‘koningiz</mark>
      </h2>

      <ol className="cr-steps">
        <li><i><Store size={26} /></i><span>Biznes turi</span></li>
        <li><i><Palette size={26} /></i><span>Logo va rang</span></li>
        <li><i>✓</i><span>Tayyor!</span></li>
      </ol>

      <div className="cr-phone">
        <ShopPreview
          name="Kafe Nur"
          tagline="Milliy va Yevropa taomlari"
          theme={{ brand: cafe.brand, accent: cafe.accent, font: cafe.font }}
          type="restaurant"
        />
      </div>
      <span className="cr-chip cr-chip--a"><Globe size={28} /> kafenur.{PLATFORM.rootDomain}</span>
      <span className="cr-chip cr-chip--b"><Send size={28} /> Telegram bot</span>
      <span className="cr-chip cr-chip--c"><ShoppingCart size={28} /> Savat va buyurtma</span>
      <Swipe label="Nima beradi?" />
    </section>
  )
}

const FEATURES = [
  { icon: LayoutGrid, title: 'Katalog va savat', text: 'Mijoz o‘zi tanlaydi' },
  { icon: Send, title: 'Buyurtma Telegram’ga', text: 'Darhol, ovoz bilan' },
  { icon: Bike, title: 'Kuryer va xarita', text: 'Jonli kuzatuv' },
  { icon: CreditCard, title: 'Naqd yoki karta', text: 'Mijozga qulay' },
  { icon: Percent, title: 'Aksiya va promokod', text: 'Sotuvni oshiradi' },
  { icon: BarChart3, title: 'Hisobotlar', text: 'Tushum bir qarashda' },
]

function SlideBenefits() {
  return (
    <section className="cr-slide cr-s3">
      <Top n={3} />
      <h2 className="cr-h2">
        Mijoz o‘zi tanlaydi. <mark>O‘zi buyurtma beradi.</mark>
      </h2>

      <div className="cr-notify">
        <i><Bell size={34} /></i>
        <span>
          <b>Yangi buyurtma · #0127</b>
          <small>Kafe Nur · hozirgina</small>
        </span>
        <strong>{formatSum(838000)}</strong>
      </div>

      <div className="cr-features">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="cr-feature">
            <i><Icon size={38} /></i>
            <b>{title}</b>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <p className="cr-note">Dasturchi ham, dizayner ham kerak emas — hammasi telefoningizda.</p>
      <Swipe label="Narxi?" />
    </section>
  )
}

function SlideOffer() {
  return (
    <section className="cr-slide cr-s4">
      <Top n={4} />
      <div className="cr-offer">
        <span className="cr-offer__tag">🎁 Hozir boshlasangiz</span>
        <p className="cr-offer__big"><b>{TRIAL_DAYS}</b> kun</p>
        <p className="cr-offer__free">BEPUL</p>
        <p className="cr-offer__fine">
          Karta kerak emas · keyin oyiga atigi <b>{formatSum(PLANS.month.price)}</b>
        </p>
      </div>

      <div className="cr-cta">
        <i><Send size={46} strokeWidth={2.4} /></i>
        <span>
          <small>Telegram’da boshlang</small>
          <b>@{BOT}</b>
        </span>
      </div>
      <p className="cr-site"><Globe size={30} /> {PLATFORM.rootDomain}</p>

      <p className="cr-save"><Bookmark size={28} /> Saqlab qo‘ying va biznesi bor do‘stingizga yuboring</p>
    </section>
  )
}

/** Slaydlarni bog'lovchi egri chiziq (4320×1350) — oxiri CTA tugmasiga olib boradi. */
function Thread() {
  return (
    <svg className="cr-thread" viewBox="0 0 4320 1350" aria-hidden="true">
      <defs>
        <linearGradient id="cr-thread-g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#c6f432" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#c6f432" />
        </linearGradient>
      </defs>
      <path
        d="M -40 1300 C 380 1335, 760 1262, 1080 1296 S 1780 1336, 2160 1294 S 2860 1252, 3240 1296 C 3302 1302, 3296 1010, 3400 948"
        fill="none"
        stroke="url(#cr-thread-g)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray="2 26"
      />
      {[1080, 2160, 3240].map((x) => (
        <circle key={x} cx={x} cy={x === 2160 ? 1294 : 1296} r="16" fill="#c6f432" />
      ))}
    </svg>
  )
}

export function Carousel() {
  return (
    <div className="cr-canvas">
      <div className="cr-orb cr-orb--1" />
      <div className="cr-orb cr-orb--2" />
      <div className="cr-orb cr-orb--3" />
      <div className="cr-orb cr-orb--4" />
      <div className="cr-grid" />
      <Thread />
      <div className="cr-slides">
        <SlideHook />
        <SlideSolution />
        <SlideBenefits />
        <SlideOffer />
      </div>
    </div>
  )
}

createRoot(document.getElementById('carousel-root') as HTMLElement).render(<Carousel />)
// Shriftlar va rasmlar yuklangach — carousel.mjs shu belgini kutadi
void Promise.all([document.fonts.ready, new Promise((r) => window.setTimeout(r, 2500))]).then(() => {
  document.body.dataset.ready = '1'
})
