import { BadgeCheck, ExternalLink, KeyRound, Loader2, MapPinned, Send, Unlink, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ADDON_BENEFITS, ADDON_NAME, ADDON_PITCH, ADDON_PRICE, addonState } from '../../platform/addon'
import { PLATFORM } from '../../platform/config'
import { apiPost } from '../lib/api'
import { useAdminShop } from '../lib/shop'
import { useToast } from '../components/Toast'
import type { Route } from '../lib/router'

/** BotFather tokeni: «123456789:AA...» (server ham shu shaklni tekshiradi — platform/bot.ts). */
const TOKEN_RE = /^\d{5,}:[A-Za-z0-9_-]{30,}$/

/**
 * «Kuryerlar va Telegram» — do'konning o'z boti (bepul).
 *
 *   none   — bot ulanmagan: nima beradi + 3 qadamda ulash (token kiritiladi)
 *   active — ulangan: kuryer bo'limlariga tezkor havolalar, botni uzish
 *
 * Do'kon hujjati jonli kuzatiladi (lib/shop.ts) — bot ulangach sahifa
 * va yon menyu o'zi «ulangan» holatiga o'tadi.
 */
export function TelegramAddonPage({ owner, navigate }: { owner: boolean; navigate: (route: Route, param?: string) => void }) {
  const shop = useAdminShop()
  const state = addonState(shop)
  const { show, node: toast } = useToast()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const connect = async (event: FormEvent) => {
    event.preventDefault()
    const value = token.trim()
    if (!TOKEN_RE.test(value)) {
      setError('Bu token emas. BotFather yuborgan xabardagi «123456789:AA...» ko‘rinishidagi qatorni to‘liq nusxalang.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { botUsername } = await apiPost<{ botUsername: string }>('action', { action: 'bot.connect', token: value })
      setToken('')
      show(`@${botUsername} ulandi`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ulab bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!window.confirm(`@${shop.botUsername} do‘kondan uzilsinmi? Kuryer bo‘limlari va Telegram xabarlari to‘xtaydi.`)) return
    setBusy(true)
    try {
      await apiPost('action', { action: 'bot.disconnect' })
      show('Bot uzildi')
    } catch (err) {
      show(err instanceof Error ? err.message : 'Uzib bo‘lmadi', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5">
      {toast}
      <section className="addon-hero">
        <div className="addon-hero__glow" aria-hidden="true" />
        <div className="relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <span className="addon-hero__tag">
              {state === 'active' ? <><BadgeCheck size={14} /> Ulangan</> : <>O‘z botingiz</>}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{ADDON_NAME}</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'rgb(255 255 255 / 0.82)' }}>{ADDON_PITCH}</p>
          </div>
          <div className="addon-hero__price">
            <b>{ADDON_PRICE}</b>
            <span>to‘lovsiz · 2 daqiqada</span>
          </div>
        </div>

        {state === 'active' && (
          <div className="relative z-10 mt-5 flex flex-wrap gap-2">
            <button className="adm-btn addon-hero__cta" onClick={() => navigate('map')}><MapPinned size={17} /> Kuryerlar xaritasi</button>
            <button className="adm-btn addon-hero__ghost" onClick={() => navigate('staff')}><UserPlus size={17} /> Kuryer qo‘shish</button>
            <a className="adm-btn addon-hero__ghost" href={`https://t.me/${shop.botUsername}`} target="_blank" rel="noreferrer">
              <Send size={17} /> @{shop.botUsername}
            </a>
          </div>
        )}
      </section>

      {state === 'none' && (
        <section className="adm-card grid gap-4 p-4 sm:p-5">
          <h2 className="text-base font-extrabold">Botingizni ulang — 3 qadam</h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {[
              <>Telegram’da <a className="adm-link" href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather <ExternalLink size={11} className="inline" /></a> ni oching va <code>/newbot</code> yozing.</>,
              <>Botga nom bering (masalan, «{shop.name}»), keyin oxiri <code>bot</code> bilan tugaydigan username.</>,
              <>BotFather yuborgan <b>tokenni</b> (<code>123456789:AA...</code>) nusxalab, quyiga qo‘ying.</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-3 rounded-2xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>
                <span className="grid size-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold" style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>{i + 1}</span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ol>

          {owner ? (
            <form className="grid gap-2" onSubmit={connect}>
              <label className="text-sm font-bold" htmlFor="bot-token">Bot tokeni</label>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
                  <input
                    id="bot-token"
                    className="adm-input w-full pl-9 font-mono text-sm"
                    placeholder="123456789:AAH..."
                    value={token}
                    onChange={(e) => { setToken(e.target.value); setError('') }}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </div>
                <button className="adm-btn adm-btn--primary" type="submit" disabled={busy || !token.trim()}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Ulash
                </button>
              </div>
              {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
              <p className="text-xs" style={{ color: 'var(--faint)' }}>
                Token faqat serverda saqlanadi, hech kimga ko‘rsatilmaydi. Mijozlar do‘koningizni shu botda ilovadek ochadi.
              </p>
            </form>
          ) : (
            <p className="text-sm font-bold">Botni do‘kon egasi ulaydi — unga shu sahifani ko‘rsating.</p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-extrabold">{state === 'active' ? 'Sizda ochiq imkoniyatlar' : 'Bot nima beradi'}</h2>
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

      <p className="text-xs" style={{ color: 'var(--faint)' }}>
        Savol bo‘lsa: <a className="adm-link" href={PLATFORM.telegramHref} target="_blank" rel="noreferrer">{PLATFORM.telegram} <ExternalLink size={11} className="inline" /></a> · {PLATFORM.phone}
        {state === 'active' && owner && (
          <>
            {' · '}
            <button className="adm-link inline-flex items-center gap-1" onClick={disconnect} disabled={busy}>
              <Unlink size={11} /> Botni uzish
            </button>
          </>
        )}
      </p>
    </div>
  )
}
