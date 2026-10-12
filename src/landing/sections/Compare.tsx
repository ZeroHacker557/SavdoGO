import { ArrowRight, Check, Code2, Eye, Minus, MessageCircle, Sparkles, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { DEMO_SHOP_HREF, PLANS, TRIAL_DAYS, formatSum } from '../../platform/config'
import { goTo } from '../router'

/**
 * «Nega SavdoGO?» — onlayn sotishning uch yo'li yonma-yon.
 *
 * Har katak: baho (bor / qisman / yo'q) va qisqa izoh. Kompyuterda —
 * jadval, SavdoGO ustuni to'q rangda ajralib turadi; telefonda har qator
 * alohida karta bo'lib, ustun nomi har katak ustida yoziladi.
 * Narx va sinov kunlari plans.ts dan — o'zgarsa bu yer ham o'zgaradi.
 */
type Mark = 'yes' | 'part' | 'no'
type Cell = [Mark, string]

const COLUMNS = [
  { key: 'manual', icon: MessageCircle, title: 'Instagram / Telegram’da qo‘lda', short: 'Qo‘lda' },
  { key: 'custom', icon: Code2, title: 'Dasturchiga sayt buyurtma qilish', short: 'Dasturchi' },
  { key: 'savdogo', icon: Sparkles, title: 'SavdoGO', short: 'SavdoGO' },
] as const

const ROWS: { label: string; cells: [Cell, Cell, Cell] }[] = [
  {
    label: 'Ishga tushirish',
    cells: [['part', 'Darhol, lekin hammasi qo‘lda'], ['no', '1–3 oy kutish'], ['yes', '5 daqiqa']],
  },
  {
    label: 'Boshlang‘ich xarajat',
    cells: [['yes', 'Bepul'], ['no', 'Millionlab so‘m'], ['yes', `0 so‘m — ${TRIAL_DAYS} kun bepul sinov`]],
  },
  {
    label: 'Oylik xarajat',
    cells: [['part', 'Bepul, lekin vaqtingiz ketadi'], ['part', 'Server va dasturchi xizmati alohida'], ['yes', `${formatSum(PLANS.month.price)} — hammasi ichida`]],
  },
  {
    label: 'Savat va buyurtma formasi',
    cells: [['no', 'Har mijoz bilan alohida yozishma'], ['yes', 'Bor'], ['yes', 'Bor — manzil, xarita, to‘lov usuli']],
  },
  {
    label: 'Buyurtmalar bitta joyda',
    cells: [['no', 'Chatlar orasida yo‘qoladi'], ['part', 'Ko‘pincha qo‘shimcha pulga'], ['yes', 'Admin panel, ovozli signal']],
  },
  {
    label: 'Kuryer va yetkazish',
    cells: [['no', 'Telefon orqali kelishiladi'], ['part', 'Alohida loyiha'], ['yes', 'Kuryer ilovasi, jonli kuzatish']],
  },
  {
    label: 'Aksiya, promokod, hisobot',
    cells: [['no', 'Qo‘lda hisob-kitob'], ['part', 'Har biri — qo‘shimcha buyurtma'], ['yes', 'Tayyor, bir bosishda']],
  },
  {
    label: 'O‘zgartirish va yangilanish',
    cells: [['part', 'Har post qo‘lda'], ['no', 'Har o‘zgarish — dasturchiga murojaat'], ['yes', 'O‘zingiz, admin paneldan; yangi imkoniyatlar bepul qo‘shiladi']],
  },
]

const MARK_ICON = { yes: Check, part: Minus, no: X }
const MARK_LABEL = { yes: 'Bor', part: 'Qisman', no: 'Yo‘q' }

export function Compare() {
  return (
    <section className="lp-section" id="compare">
      <div className="lp-container">
        <div className="lp-section__head" data-reveal>
          <span className="lp-kicker">Taqqoslash</span>
          <h2 className="lp-h2">
            Nega aynan <em>SavdoGO</em>?
          </h2>
          <p className="lp-sub">
            Onlayn sotishning uch yo‘li — vaqt, pul va qulaylik bo‘yicha yonma-yon.
          </p>
        </div>

        <div className="lp-cmp" role="table" aria-label="Onlayn sotish yo‘llarini taqqoslash" data-reveal>
          <div className="lp-cmp__row lp-cmp__row--head" role="row">
            <span className="lp-cmp__label" role="columnheader"><span className="lp-sr">Mezon</span></span>
            {COLUMNS.map(({ key, icon: Icon, title }) => (
              <span key={key} className={`lp-cmp__cell lp-cmp__cell--${key}`} role="columnheader">
                <span className="lp-cmp__col-icon"><Icon size={18} /></span>
                <b>{title}</b>
                {key === 'savdogo' && <em className="lp-cmp__badge">Tavsiya</em>}
              </span>
            ))}
          </div>

          {ROWS.map(({ label, cells }, i) => (
            <div key={label} className="lp-cmp__row" role="row" style={{ '--i': i } as CSSProperties}>
              <span className="lp-cmp__label" role="rowheader">{label}</span>
              {cells.map(([mark, text], c) => {
                const Icon = MARK_ICON[mark]
                const col = COLUMNS[c]
                return (
                  <span key={col.key} className={`lp-cmp__cell lp-cmp__cell--${col.key}`} role="cell">
                    <small className="lp-cmp__tag" aria-hidden="true">{col.short}</small>
                    <span className={`lp-cmp__mark lp-cmp__mark--${mark}`}>
                      <Icon size={14} strokeWidth={3} aria-hidden="true" />
                      <span className="lp-sr">{MARK_LABEL[mark]}:</span>
                    </span>
                    <span className="lp-cmp__text">{text}</span>
                  </span>
                )
              })}
            </div>
          ))}
        </div>

        <div className="lp-cmp__ctas" data-reveal>
          <button className="lp-btn lp-btn--primary" onClick={() => goTo('start')}>
            Do‘konimni yaratish <ArrowRight size={18} />
          </button>
          <a className="lp-btn lp-btn--ghost" href={DEMO_SHOP_HREF}>
            <Eye size={17} /> Demo do‘konni ko‘rish
          </a>
        </div>
      </div>
    </section>
  )
}
