import { CheckCircle2, ExternalLink, KeyRound, Loader2, Mail, Send, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { PLATFORM } from '../../platform/config'
import { apiPost } from '../lib/api'
import { auth, authErrorText, linkEmail, linkGoogle, linkedProviders, resetPassword, type Staff } from '../lib/auth'
import { getTelegram, isInTelegram } from '../lib/telegram'
import { useToast } from '../components/Toast'

/**
 * «Hisobim» — do'konga qaysi yo'llar bilan kirasiz.
 *
 * Telegram orqali ochilgan egada email/parol yo'q: telefon yoki Telegram
 * yo'qolsa, do'konga kirib bo'lmay qoladi. Shu yerda zaxira usul ulanadi:
 * Google (faqat brauzerda — Google oynasi Telegram ichida ishlamaydi) yoki
 * email+parol. Ulangach — istalgan qurilmadan /admin da shu bilan kirasiz.
 */
export function AccountPage({ me }: { me: Staff }) {
  const { show, node: toast } = useToast()
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState<'' | 'google' | 'email' | 'browser'>('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  void version // ulanganlar ro'yxati qayta o'qilsin
  const linked = linkedProviders(auth.currentUser)
  const inTelegram = isInTelegram()
  const count = [Boolean(me.telegramId), Boolean(linked.google), Boolean(linked.email)].filter(Boolean).length

  const after = async (text: string) => {
    await auth.currentUser?.reload().catch(() => undefined)
    await apiPost('action', { action: 'account.sync' }).catch(() => undefined)
    setVersion((n) => n + 1)
    show(text)
  }

  const connectGoogle = async () => {
    setBusy('google')
    setError('')
    try {
      await linkGoogle()
      await after('Google ulandi — endi «Google bilan kirish» ishlaydi')
    } catch (err) {
      setError(authErrorText(err))
    } finally {
      setBusy('')
    }
  }

  const connectEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return setError('Parol kamida 8 ta belgidan iborat bo‘lsin')
    setBusy('email')
    setError('')
    try {
      await linkEmail(email, password)
      setPassword('')
      await after('Email va parol ulandi')
    } catch (err) {
      setError(authErrorText(err))
    } finally {
      setBusy('')
    }
  }

  /** Telegram ichida: panelni brauzerda, kirilgan holda ochadi (bir martalik havola). */
  const openBrowser = async () => {
    setBusy('browser')
    try {
      const { url } = await apiPost<{ url: string }>('action', { action: 'account.loginLink' })
      const tg = getTelegram()
      if (tg?.openLink) tg.openLink(url)
      else window.open(url, '_blank', 'noopener')
    } catch (err) {
      show(err instanceof Error ? err.message : 'Havola yaratilmadi', 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="grid max-w-3xl gap-4">
      {toast}
      <section className="adm-card flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl"
          style={{ background: count >= 2 ? 'var(--success-soft)' : 'var(--warning-soft)', color: count >= 2 ? 'var(--success)' : 'var(--warning)' }}
        >
          <ShieldCheck size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">Kirish usullari: {count} ta</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {count >= 2
              ? 'Yaxshi — bittasi yo‘qolsa ham do‘koningizga boshqasi bilan kira olasiz.'
              : 'Zaxira usul qo‘shing: telefon yoki Telegram yo‘qolsa ham do‘kon qo‘lingizda qoladi.'}
          </p>
        </div>
      </section>

      {error && (
        <p className="rounded-xl px-3 py-2.5 text-sm font-semibold" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      )}

      {/* Telegram */}
      <Method
        icon={<Send size={20} />}
        tone="#229ED9"
        title="Telegram"
        status={me.telegramId ? 'Ulangan' : null}
        text={
          me.telegramId
            ? <>@{PLATFORM.botUsername || 'savdogouz_bot'} → «⚙️ Boshqaruv paneli» — parolsiz kirasiz. Kompyuterda: botdagi «💻 Kompyuterda ochish».</>
            : <>@{PLATFORM.botUsername || 'savdogouz_bot'} ga /start yozib, raqamingizni yuboring — shu raqam bilan ochilgan do‘kon Telegram’ingizga o‘zi ulanadi.</>
        }
      />

      {/* Google */}
      <Method
        icon={<GoogleMark />}
        tone="#ea4335"
        title="Google"
        status={linked.google}
        text={linked.google ? 'Kirish sahifasida «Google bilan kirish» ni bosasiz — parol kerak emas.' : 'Bitta bosishda: Google hisobingizni tanlaysiz va tamom. Kirish sahifasida «Google bilan kirish» paydo bo‘ladi.'}
      >
        {!linked.google && (inTelegram ? (
          <div className="grid gap-2">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Google oynasi Telegram ichida ochilmaydi. Panelni brauzerda oching — o‘zi kirilgan holda shu sahifa ochiladi.
            </p>
            <button className="adm-btn adm-btn--primary justify-self-start" onClick={openBrowser} disabled={busy !== ''}>
              {busy === 'browser' ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />} Brauzerda ochish
            </button>
          </div>
        ) : (
          <button className="adm-btn adm-btn--primary justify-self-start" onClick={connectGoogle} disabled={busy !== ''}>
            {busy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleMark />} Google’ni ulash
          </button>
        ))}
      </Method>

      {/* Email va parol */}
      <Method
        icon={<Mail size={20} />}
        tone="var(--brand)"
        title="Email va parol"
        status={linked.email}
        text={linked.email ? 'Istalgan qurilmada /admin sahifasida shu email va parol bilan kirasiz.' : 'Email va parol o‘ylab toping — istalgan qurilmada shu bilan kirasiz.'}
      >
        {linked.email ? (
          <button
            className="adm-link justify-self-start text-sm"
            onClick={() => resetPassword(linked.email!).then(() => show('Parolni tiklash havolasi emailingizga yuborildi'), (err) => setError(authErrorText(err)))}
          >
            Parolni o‘zgartirish (emailga havola)
          </button>
        ) : (
          <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={connectEmail}>
            <input className="adm-input" type="email" placeholder="siz@gmail.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="adm-input" type="password" placeholder="Parol (8+ belgi)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="adm-btn adm-btn--primary" disabled={busy !== ''}>
              {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Ulash
            </button>
          </form>
        )}
      </Method>

      <p className="text-xs" style={{ color: 'var(--faint)' }}>
        Hammasi yo‘qolsa: {PLATFORM.telegram} yoki {PLATFORM.phone} ga yozing — do‘kon egasi ekaningizni tekshirib, kirish havolasini beramiz.
      </p>
    </div>
  )
}

function Method({ icon, tone, title, status, text, children }: { icon: ReactNode; tone: string; title: string; status: string | null; text: ReactNode; children?: ReactNode }) {
  return (
    <section className="adm-card grid gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--surface-2)', color: tone }}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-extrabold">
            {title}
            {status ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                <CheckCircle2 size={13} /> {status}
              </span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Ulanmagan</span>
            )}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{text}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

/** Google «G» belgisi (rangli). */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
