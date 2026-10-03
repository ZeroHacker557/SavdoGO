import { ArrowRight, BadgeCheck, Bike, Clock, CreditCard, ExternalLink, MapPinned, Send, UserPlus } from 'lucide-react'
import { ADDON_BENEFITS, ADDON_NAME, ADDON_PITCH, ADDON_PRICE, addonState } from '../../platform/addon'
import { PLATFORM } from '../../platform/config'
import { useAdminShop } from '../lib/shop'
import type { Route } from '../lib/router'

/**
 * «Kuryerlar va Telegram» — to'plam sahifasi.
 *
 *   none    — taklif: nima beradi, qanday ulanadi, «Ulash» → to'lov
 *   pending — to'langan: botni ulash uchun nima qilish kerak
 *   active  — ulangan: kuryer bo'limlariga tezkor havolalar
 */
export function TelegramAddonPage({ owner, navigate }: { owner: boolean; navigate: (route: Route, param?: string) => void }) {
  const shop = useAdminShop()
  const state = addonState(shop)

  return (
    <div className="grid gap-5">
      <section className="addon-hero">
        <div className="addon-hero__glow" aria-hidden="true" />
        <div className="relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <span className="addon-hero__tag">
              {state === 'active' ? <><BadgeCheck size={14} /> Ulangan</> : state === 'pending' ? <><Clock size={14} /> Ulanmoqda</> : <>Qo‘shimcha to‘plam</>}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{ADDON_NAME}</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'rgb(255 255 255 / 0.82)' }}>{ADDON_PITCH}</p>
          </div>
          <div className="addon-hero__price">
            <b>{ADDON_PRICE}</b>
            <span>bir marta · oylik to‘lovsiz</span>
          </div>
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap gap-2">
          {state === 'none' && owner && (
            <button className="adm-btn addon-hero__cta" onClick={() => navigate('billing', 'addon')}>
              <CreditCard size={17} /> To‘plamni ulash — {ADDON_PRICE}
            </button>
          )}
          {state === 'none' && !owner && (
            <span className="text-sm font-bold">Ulash uchun do‘kon egasiga ayting.</span>
          )}
          {state === 'active' && (
            <>
              <button className="adm-btn addon-hero__cta" onClick={() => navigate('map')}><MapPinned size={17} /> Kuryerlar xaritasi</button>
              <button className="adm-btn addon-hero__ghost" onClick={() => navigate('staff')}><UserPlus size={17} /> Kuryer qo‘shish</button>
              <a className="adm-btn addon-hero__ghost" href={`https://t.me/${shop.botUsername}`} target="_blank" rel="noreferrer">
                <Send size={17} /> @{shop.botUsername}
              </a>
            </>
          )}
        </div>
      </section>

      {state === 'pending' && (
        <section className="adm-card grid gap-3 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Clock size={18} style={{ color: 'var(--warning)' }} /> To‘lov qabul qilindi — botingizni ulayapmiz</h2>
          <ol className="grid gap-2 text-sm">
            <li><b>1.</b> Telegram’da <a className="adm-link" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a> ni oching → <code>/newbot</code> → botga nom va username bering.</li>
            <li><b>2.</b> BotFather bergan <b>tokenni</b> bizga yuboring: <a className="adm-link" href={PLATFORM.telegramHref} target="_blank" rel="noreferrer">{PLATFORM.telegram}</a> yoki {PLATFORM.phone}.</li>
            <li><b>3.</b> Odatda 1 soat ichida ulaymiz — shu sahifa o‘zi «Ulangan» ga o‘zgaradi va kuryer bo‘limlari ochiladi.</li>
          </ol>
          <p className="text-xs" style={{ color: 'var(--faint)' }}>Bot yaratishni bilmasangiz — yozing, o‘zimiz yaratib beramiz.</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-extrabold">{state === 'active' ? 'Sizda ochiq imkoniyatlar' : 'To‘plam nima beradi'}</h2>
        <div className="addon-grid">
          {ADDON_BENEFITS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="adm-card p-4">
              <span className="addon-grid__icon"><Icon size={20} /></span>
              <b className="mt-3 block text-sm">{title}</b>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {state === 'none' && (
        <section className="adm-card grid gap-4 p-4 sm:p-5">
          <h2 className="text-base font-extrabold">Qanday ulanadi</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: CreditCard, title: 'To‘lov', text: `«Obuna va to‘lov» bo‘limida to‘plamni belgilab, ${ADDON_PRICE} ni tarif bilan birga o‘tkazasiz.` },
              { icon: Send, title: 'Bot', text: 'Do‘koningiz uchun Telegram bot ulaymiz — nomi va rasmi sizniki. 1 soat ichida.' },
              { icon: Bike, title: 'Kuryerlar', text: '«Xodimlar» bo‘limida kuryerlarni qo‘shasiz — ular botdan ishlaydi, siz xaritada ko‘rasiz.' },
            ].map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="flex gap-3 rounded-2xl p-3" style={{ background: 'var(--surface-2)' }}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold" style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>{i + 1}</span>
                <div className="min-w-0">
                  <b className="flex items-center gap-1.5 text-sm"><Icon size={15} /> {title}</b>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>{text}</p>
                </div>
              </div>
            ))}
          </div>
          {owner && (
            <button className="adm-btn adm-btn--primary justify-self-start" onClick={() => navigate('billing', 'addon')}>
              To‘plamni ulash <ArrowRight size={16} />
            </button>
          )}
          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            Savol bo‘lsa: <a className="adm-link" href={PLATFORM.telegramHref} target="_blank" rel="noreferrer">{PLATFORM.telegram} <ExternalLink size={11} className="inline" /></a> · {PLATFORM.phone}
          </p>
        </section>
      )}
    </div>
  )
}
