import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, Send, ShoppingBag } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { PLATFORM } from '../../platform/config'
import {
  authErrorText, login, pollTelegramLogin, resetPassword, startTelegramLogin, type TelegramLoginRequest,
} from '../lib/auth'
import { isInTelegram } from '../lib/telegram'

const TELEGRAM_BLUE = '#229ED9'

/** `notice` — parolsiz kirish o'xshamagan bo'lsa sababi (masalan eskirgan havola). */
export function LoginPage({ notice: initialNotice }: { notice?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialNotice ?? '')
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
          Email va parolingiz yoki Telegram orqali kiring
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
