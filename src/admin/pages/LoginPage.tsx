import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShoppingBag } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PLATFORM } from '../../platform/config'
import { authErrorText, login, resetPassword } from '../lib/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
          Ro‘yxatdan o‘tgan email va parolingiz bilan kiring
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
