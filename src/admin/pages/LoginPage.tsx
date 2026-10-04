import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, Send, ShoppingBag } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { PLATFORM } from '../../platform/config'
import {
  GoogleNotLinkedError, LOGIN_NOTICE_KEY, authErrorText, login, loginWithGoogle, pollTelegramLogin, resetPassword,
  startTelegramLogin, type TelegramLoginRequest,
} from '../lib/auth'
import { isInTelegram } from '../lib/telegram'

const TELEGRAM_BLUE = '#229ED9'

/** Google bilan kirish o'xshamagan bo'lsa — sababi (sahifa qayta chizilganda ham ko'rinsin). */
function storedNotice(): string {
  try {
    const text = sessionStorage.getItem(LOGIN_NOTICE_KEY) || ''
    sessionStorage.removeItem(LOGIN_NOTICE_KEY)
    return text
  } catch {
    return ''
  }
}

/** `notice` — parolsiz kirish o'xshamagan bo'lsa sababi (masalan eskirgan havola). */
export function LoginPage({ notice: initialNotice }: { notice?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => initialNotice || storedNotice())
  const [notice, setNotice] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await login(email, password)
      // Muvaffaqiyatda AdminApp o'zi panelga o'tkazadi (onAuthStateChanged)
    } catch (err) {
      setError(authErrorText(err))
      setBusy(false)
    }
  }

  const forgot = async () => {
    if (!email.trim()) {
      setError('Avval email manzilini kiriting')
      return
    }
    setError('')
    try {
      await resetPassword(email)
      setNotice('Parolni tiklash havolasi emailingizga yuborildi')
    } catch (err) {
      setError(authErrorText(err))
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        {/* Kirishdan oldin do'kon hali noma'lum — platforma belgisi */}
        <div className="flex items-center justify-center gap-2.5">
          <span
            className="grid size-12 place-items-center rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #5b4cf5 0%, #8b5cf6 50%, #ec4899 100%)', boxShadow: '0 10px 24px -10px #5b4cf5' }}
          >
            <ShoppingBag size={24} />
          </span>
          <b className="text-2xl font-extrabold tracking-tight">{PLATFORM.name}</b>
        </div>

        <h1 className="mt-5 text-center text-xl font-extrabold">Do‘kon boshqaruvi</h1>
        <p className="mt-1 text-center text-sm" style={{ color: 'var(--muted)' }}>
          Email, Google yoki Telegram orqali kiring
        </p>

        <div className="mt-6">
          <label className="adm-label" htmlFor="adm-email">
            Email
          </label>
          <div className="relative">
            <Mail
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--faint)' }}
            />
            <input
              id="adm-email"
              className="adm-input icon-left"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@gmail.com"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="adm-label" htmlFor="adm-password">
            Parol
          </label>
          <div className="relative">
            <LockKeyhole
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--faint)' }}
            />
            <input
              id="adm-password"
              className="adm-input icon-left icon-right"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg"
              style={{ color: 'var(--muted)' }}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {error && (
          <p
            className="mt-4 rounded-xl px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
            role="alert"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            className="mt-4 rounded-xl px-3 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}
          >
            {notice}
          </p>
        )}

        <button className="adm-btn adm-btn--primary mt-6 w-full py-3" type="submit" disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : null}
          {busy ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>

        <button
          type="button"
          className="mx-auto mt-4 block text-sm font-semibold"
          style={{ color: 'var(--muted)' }}
          onClick={forgot}
        >
          Parolni unutdingizmi?
        </button>
        <GoogleLogin onError={setError} />
        <TelegramLogin />
        <a
          href="/start"
          className="mt-5 flex items-center justify-center gap-1.5 text-sm font-bold"
          style={{ color: 'var(--brand)' }}
        >
          Do‘koningiz yo‘qmi? 5 daqiqada yarating <ArrowRight size={15} />
        </a>
      </form>
    </div>
  )
}

/**
 * Kompyuterda «Telegram orqali kirish» — SavdoGO botida do'kon ochgan
 * (parolsiz) egalar uchun. Botda /start login_<nonce> ochiladi, ega
 * ekrandagi kodni ko'rib tasdiqlaydi, bu oyna esa tasdiqni kutib turadi.
 * Telegram ichida ko'rinmaydi — u yerda panel o'zi kiradi.
 */
/**
 * «Google bilan kirish» — «Hisobim» bo'limida Google ulangan xodimlar uchun.
 * Telegram ichida ko'rinmaydi: Google oynasi u yerda ochilmaydi.
 */
function GoogleLogin({ onError }: { onError: (text: string) => void }) {
  const [busy, setBusy] = useState(false)
  if (isInTelegram()) return null

  const start = async () => {
    setBusy(true)
    onError('')
    try {
      await loginWithGoogle()
      // Muvaffaqiyatda AdminApp o'zi panelga o'tkazadi (onAuthStateChanged)
    } catch (err) {
      onError(err instanceof GoogleNotLinkedError ? err.message : authErrorText(err))
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className="adm-btn adm-btn--ghost mt-5 w-full justify-center py-3"
      onClick={start}
      disabled={busy}
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : <GoogleMark />} Google bilan kirish
    </button>
  )
}

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

function TelegramLogin() {
  const [request, setRequest] = useState<TelegramLoginRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!request) return
    let alive = true
    let timer = 0
    const deadline = Date.now() + request.ttl
    const tick = async () => {
      if (!alive) return
      if (Date.now() > deadline) {
        setRequest(null)
        setError('Vaqt tugadi — qayta bosing')
        return
      }
      try {
        const status = await pollTelegramLogin(request.nonce)
        // Tasdiqlansa AdminApp o'zi panelga o'tkazadi (onAuthStateChanged)
        if (!alive || status === 'approved') return
        if (status === 'expired') {
          setRequest(null)
          setError('So‘rov eskirdi — qayta bosing')
          return
        }
      } catch {
        // Aloqa bir lahzaga uzilgan bo'lishi mumkin — kutishda davom etamiz
      }
      timer = window.setTimeout(tick, 2000)
    }
    timer = window.setTimeout(tick, 2000)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [request])

  if (isInTelegram()) return null

  const start = async () => {
    setBusy(true)
    setError('')
    try {
      setRequest(await startTelegramLogin())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Telegram orqali kirib bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--line)' }}>
      {request ? (
        <div className="grid gap-3 text-center">
          <p className="text-sm font-bold">Telegram’da tasdiqlang</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Botda shu kod chiqadi — bir xilligini tekshiring:</p>
          <b className="text-3xl font-extrabold tracking-[0.3em]">{request.code}</b>
          <a
            className="adm-btn w-full justify-center py-3"
            style={{ background: TELEGRAM_BLUE, color: '#fff' }}
            href={request.link}
            target="_blank"
            rel="noreferrer"
          >
            <Send size={17} /> @{request.botUsername} ni ochish
          </a>
          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            Botda «✅ Ha, bu men» ni bosing — bu oyna o‘zi ochiladi.
          </p>
          <span className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <Loader2 size={14} className="animate-spin" /> Tasdiq kutilmoqda...
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="adm-btn w-full justify-center py-3"
          style={{ background: TELEGRAM_BLUE, color: '#fff' }}
          onClick={start}
          disabled={busy}
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Telegram orqali kirish
        </button>
      )}
      {error && <p className="mt-2 text-center text-xs font-semibold" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
