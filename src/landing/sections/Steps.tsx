import type { CSSProperties } from 'react'
import { BUSINESS_TYPES } from '../../platform/business-types'
import { typeIcon } from '../../platform/business-icons'
import { PLATFORM } from '../../platform/config'

export function Steps() {
  return (
    <section className="lp-section" id="how">
      <div className="lp-container">
        <div className="lp-section__head" data-reveal>
          <span className="lp-kicker">Qanday ishlaydi</span>
          <h2 className="lp-h2">
            To‘rt qadam — va do‘koningiz <em>ochiq</em>
          </h2>
          <p className="lp-sub">
            Kod yozish, server sotib olish yoki dizayner izlash shart emas. Siz faqat biznesingiz haqida
            aytasiz — qolganini SavdoGO qiladi.
          </p>
        </div>

        <div className="lp-steps" data-reveal-group>
          <div className="lp-steps__line" aria-hidden="true"><i /></div>

          <article className="lp-step" data-reveal style={{ '--d': '0s' } as CSSProperties}>
            <span className="lp-step__num">1</span>
            <h3>Biznes turini tanlang</h3>
            <p>Restoran, kiyim, mebel, gullar... Har biriga alohida tayyor andoza.</p>
            <div className="lp-step__visual">
              {BUSINESS_TYPES.slice(0, 4).map((t) => {
                const Icon = typeIcon(t.id)
                return (
                  <span className="lp-mini-chip" key={t.id}>
                    <Icon size={13} /> {t.name.split(' ')[0]}
                  </span>
                )
              })}
            </div>
          </article>

          <article className="lp-step" data-reveal style={{ '--d': '0.12s' } as CSSProperties}>
            <span className="lp-step__num">2</span>
            <h3>Ma’lumotlarni kiriting</h3>
            <p>Nomi, manzili, ish vaqti, yetkazib berish va to‘lov shartlari.</p>
            <div className="lp-step__visual">
              <span className="lp-mini-chip">📍 Toshkent</span>
              <span className="lp-mini-chip">🕘 09:00—21:00</span>
              <span className="lp-mini-chip">🚚 Yetkazish</span>
            </div>
          </article>

          <article className="lp-step" data-reveal style={{ '--d': '0.24s' } as CSSProperties}>
            <span className="lp-step__num">3</span>
            <h3>Logo va rangni qo‘ying</h3>
            <p>Sayt bir zumda sizning brendingiz ranglariga bo‘yaladi.</p>
            <div className="lp-step__visual">
              {['#E4572E', '#7C3AED', '#16A34A', '#2563EB', '#DB2777'].map((c) => (
                <span key={c} className="lp-mini-dot" style={{ background: c }} />
              ))}
            </div>
          </article>

          <article className="lp-step" data-reveal style={{ '--d': '0.36s' } as CSSProperties}>
            <span className="lp-step__num">4</span>
            <h3>Savdoni boshlang</h3>
            <p>Do‘koningiz o‘z manzilida ochiladi. To‘lovdan so‘ng buyurtmalar qabul qilinadi.</p>
            <div className="lp-step__visual">
              <span className="lp-mini-url">
                <b>kafe-nur</b>.{PLATFORM.rootDomain}
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
