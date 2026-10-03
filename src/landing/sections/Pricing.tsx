import { ArrowRight, Check, Gift, Send } from 'lucide-react'
import { useRef, type CSSProperties } from 'react'
import {
  PLANS, PLAN_ORDER, TRIAL_DAYS, YEAR_SAVING, YEAR_SAVING_PERCENT, formatSum, type PlanId,
} from '../../platform/config'
import { emptyDraft, loadDraft, saveDraft } from '../../platform/shop'
import { ADDON_BENEFITS, ADDON_NAME, ADDON_PITCH, ADDON_PRICE } from '../../platform/addon'
import { goTo } from '../router'
import { useCountUp, useInView } from '../hooks'

/** Barcha tariflarda bir xil — farq faqat muddatda. */
const INCLUDED = [
  'Mijozlar uchun to‘liq sayt',
  'Admin panel va buyurtmalar',
  'Cheksiz mahsulot va kategoriya',
  'Aksiya, promokod, reklama',
  'Hisobot va statistika',
  'Xodimlar: ega va adminlar',
  'Subdomen: nomi.savdogo.shop',
  'Xavfsiz https va hosting',
]

function startWithPlan(plan: PlanId) {
  const draft = loadDraft() ?? emptyDraft()
  saveDraft({ ...draft, plan })
  goTo('start')
}

export function Numbers() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const minutes = useCountUp(5, inView, 900)
  const types = useCountUp(11, inView, 1100)
  const langs = useCountUp(2, inView, 700)
  const hours = useCountUp(24, inView, 1200)

  return (
    <section className="lp-section lp-section--tight" style={{ paddingTop: 30 }}>
      <div className="lp-container">
        <div className="lp-numbers" ref={ref}>
          <div className="lp-number" data-reveal><b>{minutes} daq.</b><span>do‘kon ochish uchun</span></div>
          <div className="lp-number" data-reveal style={{ '--d': '0.08s' } as CSSProperties}><b>{types}</b><span>tayyor biznes andozasi</span></div>
          <div className="lp-number" data-reveal style={{ '--d': '0.16s' } as CSSProperties}><b>{langs} til</b><span>o‘zbek va rus</span></div>
          <div className="lp-number" data-reveal style={{ '--d': '0.24s' } as CSSProperties}><b>{hours}/7</b><span>onlayn savdo</span></div>
        </div>
      </div>
    </section>
  )
}

export function Pricing() {
  return (
    <section className="lp-section" id="pricing">
      <div className="lp-container">
        <div className="lp-section__head" data-reveal>
          <span className="lp-kicker">Narxlar</span>
          <h2 className="lp-h2">
            Oddiy narx, <em>yashirin to‘lovlarsiz</em>
          </h2>
          <p className="lp-sub">
            Hamma tarifda barcha imkoniyatlar ochiq. Farqi faqat muddatida — qancha uzoq olsangiz, shuncha
            arzon.
          </p>
        </div>

        {/* Bepul sinov — har qanday tarif shundan boshlanadi */}
        <div className="lp-trial" data-reveal>
          <span className="lp-trial__icon"><Gift size={24} /></span>
          <div className="lp-trial__text">
            <b>Birinchi {TRIAL_DAYS} kun — bepul</b>
            <span>Hamma imkoniyat ochiq, buyurtmalar ham qabul qilinadi. Karta ma’lumoti so‘ralmaydi — yoqsa, keyin to‘laysiz.</span>
          </div>
          <span className="lp-trial__days" aria-hidden="true">{TRIAL_DAYS}<small>kun</small></span>
        </div>

        <div className="lp-prices">
          {PLAN_ORDER.map((id, i) => {
            const plan = PLANS[id]
            const hot = plan.popular
            return (
              <article
                key={id}
                className={`lp-price${hot ? ' lp-price--hot' : ''}`}
                data-reveal
                style={{ '--d': `${i * 0.1}s` } as CSSProperties}
              >
                {hot && <span className="lp-price__badge">Eng ko‘p tanlanadi</span>}
                {id === 'year' && <span className="lp-price__badge">−{YEAR_SAVING_PERCENT}% chegirma</span>}
                <h3>{plan.name}</h3>
                <div className="lp-price__note">
                  {id === 'week' && 'Qisqa muddatga qulay'}
                  {id === 'month' && `Kuniga atigi ~${formatSum(plan.price / 30)}`}
                  {id === 'year' && `Oyiga ~${formatSum(plan.price / 12)}`}
                </div>
                <div className="lp-price__amount">
                  <b>{plan.price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}</b>
                  <span>so‘m / {plan.unit}</span>
                </div>
                <div className="lp-price__extra">
                  {id === 'year' ? (
                    <>
                      <span className="lp-price__old">{formatSum(PLANS.month.price * 12)}</span>
                      <span className="lp-price__save">{formatSum(YEAR_SAVING)} tejaysiz</span>
                    </>
                  ) : id === 'month' ? (
                    <span className="lp-price__hint">Ko‘pchilik shu tarifdan boshlaydi</span>
                  ) : (
                    <span className="lp-price__hint">Bir haftada natijani ko‘rasiz</span>
                  )}
                </div>
                <button
                  className={`lp-btn ${hot ? 'lp-btn--lime' : 'lp-btn--primary'}`}
                  onClick={() => startWithPlan(id)}
                >
                  Bepul boshlash <ArrowRight size={18} />
                </button>
              </article>
            )
          })}
        </div>

        {/* Hamma tarifda bir xil — har kartada takrorlamasdan bir marta */}
        <div className="lp-included" data-reveal>
          <h3>Har bir tarifga kiradi</h3>
          <ul>
            {INCLUDED.map((line) => (
              <li key={line}><span><Check size={15} /></span> {line}</li>
            ))}
          </ul>
        </div>

        {/* O'z Telegram boti — kuryerlar va Telegram shu bilan, ulash bepul */}
        <div className="lp-addon" data-reveal>
          <span className="lp-addon__icon"><Send size={26} /></span>
          <div>
            <span className="lp-addon__kicker">Har bir tarifda</span>
            <h3>{ADDON_NAME}</h3>
            <p>{ADDON_PITCH}</p>
            <ul className="lp-addon__list">
              {ADDON_BENEFITS.slice(0, 6).map(({ icon: Icon, title }) => (
                <li key={title}><Icon size={16} /> {title}</li>
              ))}
            </ul>
          </div>
          <div className="lp-addon__price">
            <b>{ADDON_PRICE}</b>
            <span>o‘z botingiz bilan</span>
          </div>
        </div>
      </div>
    </section>
  )
}
