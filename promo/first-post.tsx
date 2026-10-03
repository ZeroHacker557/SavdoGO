import { createRoot } from 'react-dom/client'
import { ArrowUpRight, Bell } from 'lucide-react'
import { PLATFORM, TRIAL_DAYS, formatSum } from '../src/platform/plans'
import './first-post.css'

/**
 * Birinchi post: «Yangi manzil». Asosiy qahramon — do'konning manzili:
 * [nomingiz▍].savdogo.shop — «nomingiz» kursor yonib turgan maydonda,
 * ya'ni o'z nomingizni yozasiz va do'kon shu yerda. Uslub — minimal,
 * tahririy (Stripe/Linear ruhida): to'q fon, nozik to'r, ko'p bo'sh joy.
 */

const BOT = PLATFORM.botUsername || 'savdogouz_bot'

export function FirstPost() {
  return (
    <div className="fp">
      <div className="fp-glow fp-glow--a" />
      <div className="fp-glow fp-glow--b" />
      <div className="fp-grid" />
      <svg className="fp-grain" aria-hidden="true">
        <filter id="fp-noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#fp-noise)" />
      </svg>

      <header className="fp-top">
        <span className="fp-word">Savdo<b>GO</b></span>
        <span className="fp-issue">001 — Ishga tushdik</span>
      </header>

      <main className="fp-hero">
        <p className="fp-label"><i />Biznesingizning yangi manzili</p>
        <h1 className="fp-url">
          <span className="fp-field">nomingiz<i className="fp-caret" /></span>
          <span className="fp-dom">.{PLATFORM.rootDomain.split('.')[0]}</span>
          <span className="fp-dom fp-dom--outline">.{PLATFORM.rootDomain.split('.').slice(1).join('.')}</span>
        </h1>

        <div className="fp-toast">
          <i><Bell size={30} strokeWidth={2.2} /></i>
          <span>
            <b>Yangi buyurtma</b>
            <small>hozirgina · #0001</small>
          </span>
          <strong>{formatSum(838000)}</strong>
        </div>
      </main>

      <section className="fp-facts">
        <div><b>5 daqiqa</b><span>do‘kon tayyor</span></div>
        <div><b>Telegram</b><span>bot ichida</span></div>
        <div><b>{TRIAL_DAYS} kun</b><span>bepul sinov</span></div>
      </section>

      <footer className="fp-foot">
        <span>Dasturchisiz. Murakkab sozlamalarsiz.</span>
        <b>@{BOT} <ArrowUpRight size={30} strokeWidth={2.4} /></b>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('post-root') as HTMLElement).render(<FirstPost />)
