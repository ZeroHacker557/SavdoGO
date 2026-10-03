import { AlertTriangle, ArrowRight, FilePlus2, LayoutDashboard, Loader2, LogIn, Store } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { PLATFORM } from '../../platform/config'
import { platformApi, PlatformApiError } from '../../platform/api'
import { ownerShopMarker, type OwnerMarker } from '../../platform/owner-marker'
import { initials } from '../../platform/shop'
import { Logo } from '../components/Logo'
import { goTo } from '../router'
import { NEW_SHOP_URL, type InviteInfo } from './invite'
import { Wizard } from './Wizard'
import './wizard.css'

type GateState =
  | { kind: 'checking' }
  | { kind: 'wizard'; invite?: InviteInfo }
  | { kind: 'has-shop'; shop: OwnerMarker; signedIn: boolean }
  | { kind: 'invite-login' }
  | { kind: 'invite-error'; text: string }

/** Seans tekshiruvi cho'zilsa forma kutib qolmasin. */
const SESSION_WAIT = 3000

async function resolveGate(invite: string | null): Promise<GateState> {
  const { currentStaffSession } = await import('./session')
  const session = await Promise.race([
    currentStaffSession(),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), SESSION_WAIT)),
  ])

  // Tasdiqlangan ariza: yangi do'kon shu hisobga qo'shiladi
  if (invite) {
    if (!session) return { kind: 'invite-login' }
    try {
      const info = await platformApi<Omit<InviteInfo, 'code'>>('invite.check', { invite }, session.token)
      return { kind: 'wizard', invite: { ...info, code: invite } }
    } catch (error) {
      if (error instanceof PlatformApiError && error.code === 'login-required') return { kind: 'invite-login' }
      return { kind: 'invite-error', text: error instanceof Error ? error.message : 'Havolani tekshirib bo‘lmadi' }
    }
  }

  // Bitta ega — bitta do'kon: egasi formani qayta ochsa, ikkinchi do'kon yo'li ko'rsatiladi
  const marker = ownerShopMarker()
  if (session?.role === 'owner' && session.shopId) {
    return {
      kind: 'has-shop',
      signedIn: true,
      shop: marker?.slug === session.shopId ? marker : { slug: session.shopId, name: session.shopId },
    }
  }
  if (marker) return { kind: 'has-shop', shop: marker, signedIn: false }
  return { kind: 'wizard' }
}

/**
 * /start — forma oldidagi tekshiruv.
 *
 * Yangi kishi — darhol forma. Do'kon ochib bo'lgan ega (shu brauzerda
 * kirgan yoki shu qurilmada ochgan) — «sizda do'kon bor» ekrani va
 * ikkinchi do'kon uchun ariza yo'li. `?invite=` — tasdiqlangan ariza
 * bo'yicha forma. Haqiqiy taqiq serverda (telefon va email band
 * qilinadi), bu yerdagisi — kishi formani oxirigacha to'ldirib, keyin
 * rad javobini olmasligi uchun.
 */
export function StartGate() {
  const [state, setState] = useState<GateState>({ kind: 'checking' })

  useEffect(() => {
    let alive = true
    const invite = new URLSearchParams(window.location.search).get('invite')
    void resolveGate(invite).then((next) => {
      if (alive) setState(next)
    })
    return () => {
      alive = false
    }
  }, [])

  switch (state.kind) {
    case 'checking':
      return (
        <div className="wz-gate wz-gate--center" aria-busy="true">
          <Loader2 size={30} className="animate-spin" style={{ color: 'var(--lp-primary)' }} />
        </div>
      )
    case 'wizard':
      return <Wizard invite={state.invite} />
    case 'has-shop':
      return <HasShop shop={state.shop} signedIn={state.signedIn} onOther={() => setState({ kind: 'wizard' })} />
    case 'invite-login':
      return (
        <GateScreen icon={<LogIn size={32} />} title="Avval hisobingizga kiring">
          <p className="wz-lead">
            Tasdiqlangan ariza bo‘yicha yangi do‘kon <b>mavjud hisobingizga</b> qo‘shiladi. Admin panelga kiring va
            «Yangi do‘kon» bo‘limidagi «Do‘konni yaratish» tugmasini bosing.
          </p>
          <div className="wz-gate__actions">
            <a className="lp-btn lp-btn--primary" href={NEW_SHOP_URL}>
              Admin panelga kirish <ArrowRight size={18} />
            </a>
            <button type="button" className="lp-btn lp-btn--ghost" onClick={() => goTo('home')}>Bosh sahifa</button>
          </div>
        </GateScreen>
      )
    case 'invite-error':
      return (
        <GateScreen icon={<AlertTriangle size={32} />} tone="warn" title="Havola ishlamadi">
          <p className="wz-lead">{state.text}</p>
          <div className="wz-gate__actions">
            <a className="lp-btn lp-btn--primary" href={NEW_SHOP_URL}>
              «Yangi do‘kon» bo‘limini ochish <ArrowRight size={18} />
            </a>
            <button type="button" className="lp-btn lp-btn--ghost" onClick={() => goTo('home')}>Bosh sahifa</button>
          </div>
        </GateScreen>
      )
  }
}

function GateScreen({ icon, tone, title, children }: { icon: ReactNode; tone?: 'warn'; title: string; children: ReactNode }) {
  return (
    <div className="wz-gate">
      <div className="wz-top">
        <button className="lp-logo" style={{ border: 0, background: 'none', padding: 0 }} onClick={() => goTo('home')} aria-label="Bosh sahifaga">
          <Logo />
        </button>
      </div>
      <div className="wz-gate__body">
        <section className="wz-gate__card">
          <span className={`wz-gate__icon${tone === 'warn' ? ' wz-gate__icon--warn' : ''}`}>{icon}</span>
          <h1 className="wz-title">{title}</h1>
          {children}
        </section>
      </div>
    </div>
  )
}

function HasShop({ shop, signedIn, onOther }: { shop: OwnerMarker; signedIn: boolean; onOther: () => void }) {
  return (
    <GateScreen icon={<Store size={32} />} title="Sizda allaqachon do‘kon bor">
      <p className="wz-lead">Bitta egaga bitta do‘kon ochiladi. Do‘koningizni admin paneldan boshqarasiz.</p>

      <div className="wz-gate__shop">
        <i aria-hidden="true">{initials(shop.name)}</i>
        <span>
          <b>{shop.name}</b>
          <small>{shop.slug}.{PLATFORM.rootDomain}</small>
        </span>
      </div>

      <div className="wz-gate__how">
        <b>Ikkinchi do‘kon kerakmi?</b>
        <ol>
          <li>Admin panelning <b>«Yangi do‘kon»</b> bo‘limida ariza qoldirasiz.</li>
          <li>Biz tekshirib, tasdiqlaymiz — odatda bir kun ichida.</li>
          <li>Yangi do‘konni <b>shu hisob bilan</b> o‘zingiz yaratasiz va panelda do‘konlar orasida almashasiz.</li>
        </ol>
      </div>

      <div className="wz-gate__actions">
        <a className="lp-btn lp-btn--primary" href={NEW_SHOP_URL}>
          <FilePlus2 size={18} /> Ikkinchi do‘kon uchun ariza
        </a>
        <a className="lp-btn lp-btn--ghost" href="/admin">
          <LayoutDashboard size={18} /> Admin panelga o‘tish
        </a>
      </div>

      {/* Faqat qurilma belgisi bo'lsa (hisobga kirilmagan) — umumiy kompyuterda
          boshqa odam ham ocha olsin. Telefon va email baribir serverda tekshiriladi. */}
      {!signedIn && (
        <button type="button" className="wz-gate__link" onClick={onOther}>
          Bu qurilmada boshqa biznes uchun do‘kon ochyapman
        </button>
      )}
    </GateScreen>
  )
}
