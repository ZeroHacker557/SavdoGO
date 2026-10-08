import {
  BadgeCheck, Ban, Check, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, Eye, FilePlus2, Gift, Globe, LayoutDashboard,
  Loader2, LogOut, Megaphone, Moon, RefreshCw, Search, Send, Settings2, ShieldAlert, ShoppingBag, Store, Sun, Trash2, TrendingUp, Wallet, X, XCircle, Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { authErrorText, login, logout, watchUser } from '../admin/lib/auth'
import { Modal, ConfirmDialog } from '../admin/components/Modal'
import { useToast } from '../admin/components/Toast'
import { BUSINESS_TYPES, businessType } from '../platform/business-types'
import { PLANS, PLATFORM, formatSum, shopUrl, type PlanId } from '../platform/config'
import { initials } from '../platform/shop'
import { Broadcast } from './Broadcast'
import { inkOn } from '../platform/palette'
import { typeIcon } from '../platform/business-icons'
import { applyTheme, getStoredTheme, storeTheme, type ThemeMode } from '../utils/theme'

/* ── Turlar (api/_lib/platform/super.ts → superOverview) ── */

type ShopRow = {
  id: string
  name: string
  type: string
  logo: string | null
  brand: string
  status: 'demo' | 'active' | 'blocked' | string
  plan: PlanId
  paidUntil: string | null
  /** Bepul sinov davri — hali to'lov qilinmagan. */
  trial: boolean
  expired: boolean
  telegramAddon: boolean
  botUsername: string | null
  customDomain: string | null
  city: string
  phone: string
  createdAt: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
}

type PaymentRow = {
  id: string
  /** `hamyon` — avtomatik to'lov (chek yo'q). */
  method: 'receipt' | 'hamyon'
  shopId: string
  shopName: string
  plan: PlanId
  amount: number
  telegramAddon: boolean
  status: 'pending' | 'approved' | 'rejected'
  receipt: string
  note: string
  reviewNote: string
  createdAt: string
  reviewedAt: string | null
  paidUntil: string | null
}

/** Ikkinchi do'kon arizasi (api/_lib/platform/owners.ts). */
type RequestRow = {
  id: string
  status: 'pending' | 'approved' | 'creating' | 'used' | 'rejected' | 'cancelled'
  name: string
  type: string
  slug: string
  note: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  fromShopId: string
  fromShopName: string
  createdAt: string
  reviewedAt: string | null
  reviewNote: string
  inviteCode: string | null
  inviteExpiresAt: string | null
  createdShopId: string | null
}

type Overview = {
  shops: ShopRow[]
  payments: PaymentRow[]
  requests: RequestRow[]
  card: { cardNumber: string; cardOwner: string; note: string }
  stats: {
    total: number
    active: number
    trial: number
    demo: number
    expired: number
    pending: number
    requests: number
    monthlyRevenue: number
    approvedThisMonth: number
  }
}

class SuperError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

let currentUser: User | null = null

async function superApi<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!currentUser) throw new SuperError('Tizimga kirilmagan', 401)
  const token = await currentUser.getIdToken()
  const response = await fetch('/api/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  })
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!payload) throw new SuperError('Server javobi tushunarsiz — /api ishlayaptimi?', response.status)
  if (!response.ok) throw new SuperError(payload.error || `Server xatosi (${response.status})`, response.status)
  return payload as T
}

function date(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return withTime
    ? d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusOf(shop: ShopRow): { label: string; color: string; bg: string } {
  if (shop.status === 'blocked') return { label: 'To‘xtatilgan', color: 'var(--danger)', bg: 'var(--danger-soft)' }
  if (shop.expired) return { label: shop.trial ? 'Sinov tugagan' : 'Muddati tugagan', color: 'var(--warning)', bg: 'var(--warning-soft)' }
  if (shop.status === 'active' && shop.trial) return { label: 'Bepul sinov', color: 'var(--brand)', bg: 'var(--brand-soft)' }
  if (shop.status === 'active') return { label: 'Faol', color: 'var(--success)', bg: 'var(--success-soft)' }
  return { label: 'Ko‘rish rejimi', color: 'var(--muted)', bg: 'var(--surface-3)' }
}

/* ── Ilova ─────────────────────────────────────────────── */

type Phase = { kind: 'loading' } | { kind: 'anonymous' } | { kind: 'denied' } | { kind: 'ready'; user: User }

export function SuperApp() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })

  useEffect(
    () =>
      watchUser(async (user) => {
        currentUser = user
        if (!user) return setPhase({ kind: 'anonymous' })
        setPhase({ kind: 'loading' })
        // Huquq token claim'ida; yangi qo'yilgan bo'lsa ham ko'rinsin — majburiy yangilash
        const token = await user.getIdTokenResult(true).catch(() => null)
        setPhase(token?.claims.super === true ? { kind: 'ready', user } : { kind: 'denied' })
      }),
    [],
  )

  if (phase.kind === 'loading') {
    return (
      <div className="adm-login">
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }
  if (phase.kind === 'anonymous') return <SuperLogin />
  if (phase.kind === 'denied') {
    return (
      <div className="adm-login">
        <div className="adm-login__card text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <ShieldAlert size={26} />
          </span>
          <h1 className="mt-4 text-lg font-extrabold">Bu bo‘lim faqat platforma egasi uchun</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Do‘kon egasi bo‘lsangiz — <a className="font-bold" style={{ color: 'var(--brand)' }} href="/admin">/admin</a> orqali kiring.
          </p>
          <button className="adm-btn adm-btn--ghost mt-5 w-full" onClick={() => logout()}>Boshqa hisob bilan kirish</button>
        </div>
      </div>
    )
  }
  return <SuperPanel user={phase.user} />
}

function SuperLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(authErrorText(err))
      setBusy(false)
    }
  }

  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <div className="flex items-center justify-center gap-2.5">
          <span className="sp-mark"><ShoppingBag size={24} /></span>
          <b className="text-2xl font-extrabold tracking-tight">{PLATFORM.name}</b>
        </div>
        <h1 className="mt-5 text-center text-xl font-extrabold">Platforma boshqaruvi</h1>
        <label className="adm-label mt-6">Email</label>
        <input className="adm-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="adm-label mt-3">Parol</label>
        <input className="adm-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="mt-3 text-sm font-bold" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="adm-btn adm-btn--primary mt-5 w-full" disabled={busy || !email || !password}>
          {busy && <Loader2 size={16} className="animate-spin" />} Kirish
        </button>
      </form>
    </div>
  )
}

type Tab = 'payments' | 'requests' | 'shops' | 'broadcast' | 'settings'

function SuperPanel({ user }: { user: User }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('payments')
  const [refreshing, setRefreshing] = useState(false)
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme)
  const { show, node: toast } = useToast()

  const [tick, setTick] = useState(0)
  const load = useCallback(() => {
    setRefreshing(true)
    setTick((n) => n + 1)
  }, [])

  // Ma'lumot — tick o'zgarganda; natija callback'da yoziladi
  useEffect(() => {
    let alive = true
    superApi<Overview>('super.overview').then(
      (result) => {
        if (!alive) return
        setData(result)
        setError(null)
        setRefreshing(false)
      },
      (err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi')
        setRefreshing(false)
      },
    )
    return () => {
      alive = false
    }
  }, [tick])

  // Yangi cheklar kelib tursin — daqiqada bir
  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    storeTheme(next)
    setThemeState(next)
  }

  const run = async (action: string, body: Record<string, unknown>, okText: string) => {
    try {
      await superApi(action, body)
      show(okText)
      load()
      return true
    } catch (err) {
      show(err instanceof Error ? err.message : 'Bajarilmadi', 'error')
      return false
    }
  }

  const pending = data?.payments.filter((p) => p.status === 'pending') ?? []

  return (
    <div className="sp-shell">
      <header className="sp-top">
        <span className="sp-mark"><ShoppingBag size={20} /></span>
        <b className="text-lg font-extrabold">{PLATFORM.name}</b>
        <span className="sp-top__tag">platforma</span>
        <nav className="sp-tabs" aria-label="Bo‘limlar">
          {([
            ['payments', 'To‘lovlar', CreditCard, pending.length],
            ['requests', 'Arizalar', FilePlus2, data?.stats.requests ?? 0],
            ['shops', 'Do‘konlar', Store, 0],
            ['broadcast', 'Xabar', Megaphone, 0],
            ['settings', 'Sozlamalar', Settings2, 0],
          ] as const).map(([id, label, Icon, badge]) => (
            <button key={id} className={'sp-tab ' + (tab === id ? 'active' : '')} onClick={() => setTab(id)}>
              <Icon size={16} /> <span>{label}</span>
              {badge > 0 && <span className="adm-nav__badge">{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button className="adm-icon-btn" onClick={() => void load()} aria-label="Yangilash" title="Yangilash">
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button className="adm-icon-btn" onClick={toggleTheme} aria-label="Rejim">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <span className="hidden text-sm font-bold sm:inline" style={{ color: 'var(--muted)' }}>{user.email}</span>
          <button className="adm-icon-btn" onClick={() => logout()} aria-label="Chiqish" title="Chiqish" style={{ color: 'var(--danger)' }}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="sp-main">
        {error && !data && (
          <div className="adm-card adm-empty">
            <p className="font-extrabold">Ma’lumotni yuklab bo‘lmadi</p>
            <p className="text-sm">{error}</p>
            <button className="adm-btn adm-btn--primary mt-2" onClick={() => void load()}>Qayta urinish</button>
          </div>
        )}
        {!data && !error && <div className="adm-skeleton h-40" />}

        {data && (
          <>
            <Stats stats={data.stats} />
            {tab === 'payments' && <Payments payments={data.payments} shops={data.shops} run={run} />}
            {tab === 'requests' && <Requests requests={data.requests} shops={data.shops} run={run} />}
            {tab === 'shops' && <Shops shops={data.shops} run={run} />}
            {tab === 'broadcast' && <Broadcast api={superApi} show={show} />}
            {tab === 'settings' && <PlatformSettings card={data.card} run={run} />}
          </>
        )}
      </main>
      {toast}
    </div>
  )
}

type RunFn = (action: string, body: Record<string, unknown>, okText: string) => Promise<boolean>

function Stats({ stats }: { stats: Overview['stats'] }) {
  const items = [
    { label: 'Jami do‘konlar', value: stats.total, icon: Store, fg: 'var(--brand)', bg: 'var(--brand-soft)' },
    { label: 'Faol (to‘lagan)', value: stats.active, icon: BadgeCheck, fg: 'var(--success)', bg: 'var(--success-soft)' },
    { label: 'Bepul sinovda', value: stats.trial ?? 0, icon: Gift, fg: 'var(--brand)', bg: 'var(--brand-soft)' },
    { label: 'Ko‘rish rejimida', value: stats.demo, icon: Eye, fg: 'var(--muted)', bg: 'var(--surface-3)' },
    { label: 'Tekshirilmagan cheklar', value: stats.pending, icon: Clock, fg: 'var(--warning)', bg: 'var(--warning-soft)' },
    { label: 'Oylik tushum (taxminiy)', value: formatSum(stats.monthlyRevenue), icon: TrendingUp, fg: 'var(--brand)', bg: 'var(--brand-soft)' },
    { label: 'Shu oy tasdiqlangan', value: formatSum(stats.approvedThisMonth), icon: Wallet, fg: 'var(--success)', bg: 'var(--success-soft)' },
  ]
  return (
    <div className="sp-stats">
      {items.map(({ label, value, icon: Icon, fg, bg }, i) => (
        <div key={label} className="adm-card adm-stat" style={{ animationDelay: `${i * 40}ms` }}>
          <span className="adm-stat__icon" style={{ background: bg, color: fg }}><Icon size={18} /></span>
          <p className="adm-stat__label">{label}</p>
          <p className="adm-stat__value">{value}</p>
        </div>
      ))}
    </div>
  )
}

function ShopMark({ shop, size = 40 }: { shop: Pick<ShopRow, 'name' | 'logo' | 'brand'>; size?: number }) {
  return shop.logo ? (
    <img src={shop.logo} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size, background: '#fff' }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-xl text-sm font-extrabold"
      style={{ width: size, height: size, background: shop.brand, color: inkOn(shop.brand) }}
    >
      {initials(shop.name)}
    </span>
  )
}

/* ── To'lovlar ─────────────────────────────────────────── */

function Payments({ payments, shops, run }: { payments: PaymentRow[]; shops: ShopRow[]; run: RunFn }) {
  const [approving, setApproving] = useState<PaymentRow | null>(null)
  const [rejecting, setRejecting] = useState<PaymentRow | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const byId = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])
  const pending = payments.filter((p) => p.status === 'pending')
  const history = payments.filter((p) => p.status !== 'pending').slice(0, 50)

  const approve = async () => {
    if (!approving) return
    setBusy(true)
    const ok = await run('super.payment.approve', { id: approving.id }, `«${approving.shopName}» faollashtirildi`)
    setBusy(false)
    if (ok) setApproving(null)
  }
  const reject = async () => {
    if (!rejecting) return
    setBusy(true)
    const ok = await run('super.payment.reject', { id: rejecting.id, note: reason }, 'Rad etildi')
    setBusy(false)
    if (ok) {
      setRejecting(null)
      setReason('')
    }
  }

  return (
    <>
      <h2 className="sp-h2">Tekshirilishi kerak <span>{pending.length}</span></h2>
      {pending.length === 0 ? (
        <div className="adm-card adm-empty"><CheckCircle2 size={28} style={{ color: 'var(--success)' }} /><p className="font-bold">Hamma cheklar ko‘rib chiqilgan</p></div>
      ) : (
        <div className="sp-pay-grid">
          {pending.map((payment) => {
            const shop = byId.get(payment.shopId)
            return (
              <article key={payment.id} className="adm-card sp-pay p-4 sm:p-5">
                {payment.receipt ? (
                  <button className="sp-pay__receipt" onClick={() => setPreview(payment.receipt)} aria-label="Chekni kattalashtirish">
                    <img src={payment.receipt} alt="Chek" loading="lazy" />
                  </button>
                ) : (
                  <div className="sp-pay__receipt grid place-items-center p-3 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
                    <Zap size={22} style={{ color: 'var(--warning)' }} />
                    Hamyon — chek yo‘q
                  </div>
                )}
                <div className="grid content-start gap-2">
                  <div className="flex items-center gap-2.5">
                    {shop && <ShopMark shop={shop} size={34} />}
                    <div className="min-w-0">
                      <b className="block truncate">{payment.shopName}</b>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{payment.shopId}</span>
                    </div>
                  </div>
                  <p className="text-xl font-extrabold">{formatSum(payment.amount)}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {PLANS[payment.plan]?.name} tarif{payment.telegramAddon ? ' + Telegram' : ''} · {date(payment.createdAt, true)}
                  </p>
                  {shop && <p className="text-xs" style={{ color: 'var(--muted)' }}>{shop.ownerName} · {shop.ownerPhone}</p>}
                  {payment.note && <p className="rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>{payment.note}</p>}
                  <div className="mt-1 flex gap-2">
                    <button className="adm-btn adm-btn--primary flex-1" onClick={() => setApproving(payment)}><Check size={16} /> Tasdiqlash</button>
                    <button className="adm-btn adm-btn--danger" onClick={() => setRejecting(payment)}><X size={16} /> Rad</button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <h2 className="sp-h2 mt-8">Oxirgi to‘lovlar</h2>
      <div className="adm-card adm-table-wrap p-0">
        <table className="adm-table">
          <thead>
            <tr><th>Do‘kon</th><th>Tarif</th><th>Summa</th><th>Holat</th><th>Sana</th><th>Muddat</th><th /></tr>
          </thead>
          <tbody>
            {history.map((p) => (
              <tr key={p.id}>
                <td><b>{p.shopName}</b><br /><span className="text-xs" style={{ color: 'var(--muted)' }}>{p.shopId}</span></td>
                <td>{PLANS[p.plan]?.name}{p.telegramAddon ? ' + TG' : ''}</td>
                <td>{formatSum(p.amount)}</td>
                <td>
                  {p.status === 'approved'
                    ? <span className="sp-pill" style={{ color: 'var(--success)', background: 'var(--success-soft)' }}><CheckCircle2 size={12} /> Tasdiqlangan</span>
                    : <span className="sp-pill" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }} title={p.reviewNote}><XCircle size={12} /> Rad etilgan</span>}
                </td>
                <td>{date(p.reviewedAt ?? p.createdAt)}</td>
                <td>{p.paidUntil ? date(p.paidUntil) : '—'}</td>
                <td>
                  {p.receipt
                    ? <a className="adm-link" href={p.receipt} target="_blank" rel="noreferrer">Chek</a>
                    : <span className="sp-pill" style={{ color: 'var(--success)', background: 'var(--success-soft)' }}><Zap size={12} /> Hamyon</span>}
                </td>
              </tr>
            ))}
            {!history.length && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>Hali yo‘q</td></tr>}
          </tbody>
        </table>
      </div>

      {approving && (
        <ConfirmDialog
          title="To‘lovni tasdiqlash"
          message={`«${approving.shopName}» — ${formatSum(approving.amount)}. Do‘kon faollashadi va muddat ${PLANS[approving.plan]?.days} kunga uzayadi. Pul kartaga tushganini tekshirdingizmi?`}
          confirmLabel="Tasdiqlash"
          busy={busy}
          onConfirm={approve}
          onClose={() => setApproving(null)}
        />
      )}
      {rejecting && (
        <Modal
          title="Chekni rad etish"
          onClose={() => setRejecting(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost flex-1" onClick={() => setRejecting(null)}>Bekor qilish</button>
              <button className="adm-btn adm-btn--danger flex-1" disabled={busy} onClick={reject}>
                {busy && <Loader2 size={16} className="animate-spin" />} Rad etish
              </button>
            </>
          }
        >
          <label className="adm-label">Sabab — do‘kon egasi ko‘radi</label>
          <textarea className="adm-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: summa to‘liq emas yoki chek o‘qilmaydi" />
        </Modal>
      )}
      {preview && (
        <div className="sp-lightbox" onClick={() => setPreview(null)} role="dialog" aria-label="Chek">
          <img src={preview} alt="Chek" />
        </div>
      )}
    </>
  )
}

/* ── Ikkinchi do'kon arizalari ─────────────────────────── */

const REQUEST_STATUS: Record<RequestRow['status'], { label: string; color: string; bg: string }> = {
  pending: { label: 'Kutilmoqda', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  approved: { label: 'Tasdiqlangan — do‘kon hali ochilmagan', color: 'var(--success)', bg: 'var(--success-soft)' },
  creating: { label: 'Yaratilmoqda', color: 'var(--brand)', bg: 'var(--brand-soft)' },
  used: { label: 'Do‘kon ochildi', color: 'var(--success)', bg: 'var(--success-soft)' },
  rejected: { label: 'Rad etilgan', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  cancelled: { label: 'Ega bekor qilgan', color: 'var(--muted)', bg: 'var(--surface-3)' },
}

/**
 * Bitta egaga bitta do'kon; ikkinchisi — ariza bilan. Tasdiqlansa egaga
 * bir martalik havola chiqadi (uning «Yangi do'kon» bo'limida ham
 * ko'rinadi) — ega formani to'ldiradi va do'kon o'sha hisobga qo'shiladi.
 */
function Requests({ requests, shops, run }: { requests: RequestRow[]; shops: ShopRow[]; run: RunFn }) {
  const [approving, setApproving] = useState<RequestRow | null>(null)
  const [rejecting, setRejecting] = useState<RequestRow | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const byId = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])
  const pending = requests.filter((r) => r.status === 'pending')
  const history = requests.filter((r) => r.status !== 'pending').slice(0, 60)
  // Bir egada nechta do'kon bor — qaror uchun foydali
  const ownedCount = (email: string) => shops.filter((s) => s.ownerEmail && s.ownerEmail === email).length

  const approve = async () => {
    if (!approving) return
    setBusy(true)
    const ok = await run('super.request.approve', { id: approving.id }, `«${approving.name}» tasdiqlandi — havola egasining panelida`)
    setBusy(false)
    if (ok) setApproving(null)
  }
  const reject = async () => {
    if (!rejecting) return
    setBusy(true)
    const ok = await run('super.request.reject', { id: rejecting.id, note: reason }, 'Ariza rad etildi')
    setBusy(false)
    if (ok) {
      setRejecting(null)
      setReason('')
    }
  }
  const copy = async (row: RequestRow) => {
    if (!row.inviteCode) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/start?invite=${encodeURIComponent(row.inviteCode)}`)
      setCopied(row.id)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      /* clipboard yopiq */
    }
  }

  return (
    <>
      <h2 className="sp-h2">Ko‘rib chiqilishi kerak <span>{pending.length}</span></h2>
      {pending.length === 0 ? (
        <div className="adm-card adm-empty"><CheckCircle2 size={28} style={{ color: 'var(--success)' }} /><p className="font-bold">Yangi ariza yo‘q</p></div>
      ) : (
        <div className="sp-req-grid">
          {pending.map((row) => {
            const type = businessType(row.type)
            const Icon = typeIcon(type.id)
            const from = byId.get(row.fromShopId)
            const count = ownedCount(row.ownerEmail)
            return (
              <article key={row.id} className="adm-card grid content-start gap-3 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: type.brand, color: inkOn(type.brand) }}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-base">{row.name}</b>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {type.name}{row.slug ? ` · ${row.slug}` : ''} · {date(row.createdAt, true)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--surface-2)' }}>
                  <p className="font-bold">{row.ownerName || '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{row.ownerPhone} · {row.ownerEmail}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    Hozirgi do‘koni:
                    {from ? (
                      <a className="font-bold" style={{ color: 'var(--brand)' }} href={shopUrl(from.id)} target="_blank" rel="noreferrer">{from.name}</a>
                    ) : (
                      <b>{row.fromShopName}</b>
                    )}
                    {from && <span className="adm-badge" style={{ color: statusOf(from).color, background: statusOf(from).bg }}>{statusOf(from).label}</span>}
                    {count > 1 && <span className="adm-badge" style={{ color: 'var(--warning)', background: 'var(--warning-soft)' }}>{count} ta do‘koni bor</span>}
                  </p>
                </div>
                {row.note && <p className="rounded-lg px-2.5 py-1.5 text-xs" style={{ background: 'var(--surface-2)' }}>💬 {row.note}</p>}
                <div className="flex gap-2">
                  <button className="adm-btn adm-btn--primary flex-1" onClick={() => setApproving(row)}><Check size={16} /> Tasdiqlash</button>
                  <button className="adm-btn adm-btn--danger" onClick={() => setRejecting(row)}><X size={16} /> Rad</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <h2 className="sp-h2 mt-8">Oxirgi arizalar</h2>
      {history.length === 0 ? (
        <div className="adm-card adm-empty"><p className="text-sm">Hozircha bo‘sh</p></div>
      ) : (
        <div className="adm-card adm-table-wrap p-0">
          <table className="adm-table">
            <thead>
              <tr><th>Yangi do‘kon</th><th>Ega</th><th>Holat</th><th>Sana</th><th /></tr>
            </thead>
            <tbody>
              {history.map((row) => {
                const s = REQUEST_STATUS[row.status]
                return (
                  <tr key={row.id}>
                    <td><b>{row.name}</b><br /><span className="text-xs" style={{ color: 'var(--muted)' }}>{businessType(row.type).name}</span></td>
                    <td>{row.ownerName}<br /><span className="text-xs" style={{ color: 'var(--muted)' }}>{row.fromShopName}</span></td>
                    <td>
                      <span className="adm-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                      {row.reviewNote && <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{row.reviewNote}</p>}
                    </td>
                    <td className="whitespace-nowrap text-sm">{date(row.reviewedAt || row.createdAt)}</td>
                    <td>
                      {row.status === 'used' && row.createdShopId ? (
                        <a className="adm-btn adm-btn--ghost" href={shopUrl(row.createdShopId)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Sayt</a>
                      ) : row.status === 'approved' && row.inviteCode ? (
                        <button className="adm-btn adm-btn--ghost" onClick={() => void copy(row)}>
                          {copied === row.id ? <Check size={15} /> : <Copy size={15} />} Havola
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {approving && (
        <ConfirmDialog
          title="Arizani tasdiqlash"
          message={`«${approving.name}» — ${approving.ownerName}. Egaga bir martalik havola chiqadi (14 kun amal qiladi): u yangi do‘konni shu hisob bilan o‘zi yaratadi. Yangi do‘kon ham bepul sinov bilan ochiladi, keyin obunasi alohida to‘lanadi.`}
          confirmLabel="Tasdiqlash"
          busy={busy}
          onConfirm={approve}
          onClose={() => setApproving(null)}
        />
      )}
      {rejecting && (
        <Modal
          title="Arizani rad etish"
          onClose={() => setRejecting(null)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost flex-1" onClick={() => setRejecting(null)}>Bekor qilish</button>
              <button className="adm-btn adm-btn--danger flex-1" disabled={busy} onClick={reject}>
                {busy && <Loader2 size={16} className="animate-spin" />} Rad etish
              </button>
            </>
          }
        >
          <label className="adm-label">Sabab — do‘kon egasi ko‘radi</label>
          <textarea className="adm-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: avval birinchi do‘kon obunasini to‘lang" />
        </Modal>
      )}
    </>
  )
}

/* ── Do'konlar ─────────────────────────────────────────── */

function Shops({ shops, run }: { shops: ShopRow[]; run: RunFn }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'demo' | 'expired' | 'blocked'>('all')
  const [editing, setEditing] = useState<ShopRow | null>(null)

  const list = shops.filter((shop) => {
    const q = query.trim().toLowerCase()
    const matches = !q || [shop.name, shop.id, shop.ownerName, shop.ownerEmail, shop.ownerPhone, shop.phone, shop.customDomain ?? '']
      .some((v) => v.toLowerCase().includes(q))
    const f =
      filter === 'all' ||
      (filter === 'expired'
        ? shop.expired
        : filter === 'active'
          ? shop.status === 'active' && !shop.expired && !shop.trial
          : filter === 'trial'
            ? shop.status === 'active' && !shop.expired && shop.trial
            : shop.status === filter)
    return matches && f
  })

  return (
    <>
      <div className="adm-page-head">
        <div className="relative min-w-[220px] flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
          <input className="adm-input icon-left" placeholder="Nom, manzil, ega, telefon yoki email..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['all', 'Hammasi'], ['active', 'Faol'], ['trial', 'Bepul sinov'], ['demo', 'Ko‘rish rejimi'], ['expired', 'Muddati tugagan'], ['blocked', 'To‘xtatilgan'],
          ] as const).map(([id, label]) => (
            <button key={id} className={'adm-chip ' + (filter === id ? 'active' : '')} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="adm-card adm-table-wrap p-0">
        <table className="adm-table">
          <thead>
            <tr><th>Do‘kon</th><th>Ega</th><th>Holat</th><th>Tarif</th><th>Muddat</th><th>Qo‘shimcha</th><th /></tr>
          </thead>
          <tbody>
            {list.map((shop) => {
              const s = statusOf(shop)
              return (
                <tr key={shop.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <ShopMark shop={shop} size={36} />
                      <div className="min-w-0">
                        <b className="block truncate">{shop.name}</b>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{shop.id} · {businessType(shop.type).name}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <b className="block">{shop.ownerName || '—'}</b>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{shop.ownerPhone} · {shop.ownerEmail}</span>
                  </td>
                  <td><span className="sp-pill" style={{ color: s.color, background: s.bg }}>{s.label}</span></td>
                  <td>{PLANS[shop.plan]?.name ?? '—'}</td>
                  <td>{shop.paidUntil ? date(shop.paidUntil) : '—'}<br /><span className="text-xs" style={{ color: 'var(--muted)' }}>ochilgan {date(shop.createdAt)}</span></td>
                  <td className="text-xs">
                    {shop.botUsername && <span className="sp-pill" style={{ background: 'rgba(14,165,233,.12)', color: '#0ea5e9' }}>Telegram @{shop.botUsername}</span>}{' '}
                    {shop.customDomain && <span className="sp-pill" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Globe size={11} /> {shop.customDomain}</span>}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <a className="adm-icon-btn" href={shopUrl(shop.id)} target="_blank" rel="noreferrer" title="Saytni ochish"><ExternalLink size={16} /></a>
                      <button className="adm-icon-btn adm-icon-btn--brand" onClick={() => setEditing(shop)} title="Boshqarish"><LayoutDashboard size={16} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!list.length && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>Hech narsa topilmadi</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <ShopEditor shop={editing} run={run} onClose={() => setEditing(null)} />}
    </>
  )
}

function ShopEditor({ shop, run, onClose }: { shop: ShopRow; run: RunFn; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [domain, setDomain] = useState(shop.customDomain ?? '')
  const [bot, setBot] = useState(shop.botUsername ?? '')
  const [botToken, setBotToken] = useState('')
  const [blocking, setBlocking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  // Egasi kira olmay qolganda — bir martalik kirish havolasi (super.ts → shopLoginLink)
  const [loginLink, setLoginLink] = useState('')
  const [linkError, setLinkError] = useState('')

  const makeLoginLink = async () => {
    setBusy(true)
    setLinkError('')
    try {
      setLoginLink((await superApi<{ url: string }>('super.shop.loginLink', { shopId: shop.id })).url)
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Havola yaratilmadi')
    } finally {
      setBusy(false)
    }
  }

  const act = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true)
    const done = await run('super.shop.update', { shopId: shop.id, ...body }, ok)
    setBusy(false)
    if (done) onClose()
  }

  // Butunlay o'chirish — server ham manzil aynan yozilganini tekshiradi (super.ts → shopDelete)
  const remove = async () => {
    setBusy(true)
    const done = await run('super.shop.delete', { shopId: shop.id, confirm: confirmText }, `«${shop.name}» butunlay o‘chirildi`)
    setBusy(false)
    if (done) {
      setDeleting(false)
      onClose()
    }
  }

  return (
    <Modal title={shop.name} onClose={onClose} wide>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <ShopMark shop={shop} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{shop.name}</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {shop.id} · {businessType(shop.type).name} · {shop.city || '—'} · muddat: {shop.paidUntil ? date(shop.paidUntil) : 'yo‘q'}
            </p>
          </div>
          <a className="adm-btn adm-btn--ghost" href={shopUrl(shop.id)} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Sayt</a>
        </div>

        <section>
          <h3 className="sp-h3">Muddatni qo‘lda uzaytirish</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Naqd yoki boshqa yo‘l bilan to‘langan bo‘lsa. Do‘kon faollashadi.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[7, 30, 90, 365].map((days) => (
              <button key={days} className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => act({ extendDays: days }, `${days} kunga uzaytirildi`)}>
                +{days} kun
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <h3 className="sp-h3 sm:col-span-2">Telegram bot</h3>
          <p className="text-xs sm:col-span-2" style={{ color: 'var(--muted)' }}>
            Egasi botini o‘zi ulaydi (admin panel yoki SavdoGO boti) — bu yerda faqat yordam kerak bo‘lsa.
          </p>
          <div>
            <label className="adm-label">Bot username</label>
            <input className="adm-input" value={bot} onChange={(e) => setBot(e.target.value.replace(/^@/, ''))} placeholder="kafenur_bot" />
          </div>
          <div>
            <label className="adm-label">Bot tokeni — faqat yangilash uchun</label>
            <input className="adm-input" value={botToken} onChange={(e) => setBotToken(e.target.value.trim())} placeholder="123456:ABC... (bo‘sh — o‘zgarmaydi, «-» — uzish)" autoComplete="off" />
          </div>
          <p className="text-xs sm:col-span-2" style={{ color: 'var(--faint)' }}>
            Token saqlanganda botning menyu tugmasi do‘kon saytiga ulanadi va buyurtma xabarlari shu botdan ketadi. Token hech qachon brauzerga qaytarilmaydi.
          </p>
          <button
            className="adm-btn adm-btn--primary sm:col-span-2"
            disabled={busy}
            onClick={() => act({ botUsername: bot, ...(botToken ? { botToken } : {}) }, 'Telegram sozlandi')}
          >
            Saqlash
          </button>
        </section>

        <section className="grid gap-2">
          <h3 className="sp-h3">O‘z domeni</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Avval domenni Vercel loyihasiga qo‘shing (Settings → Domains), DNS ni sozlang — keyin shu yerga yozing.
          </p>
          <div className="flex gap-2">
            <input className="adm-input flex-1" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="kafenur.uz" />
            <button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => act({ customDomain: domain }, domain ? 'Domen ulandi' : 'Domen olib tashlandi')}>
              Saqlash
            </button>
          </div>
        </section>

        <section className="grid gap-2">
          <h3 className="sp-h3">Egasi kira olmayaptimi?</h3>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Telegram, raqam va email yo‘qolgan bo‘lsa — egasi ekanini tekshirib, unga shu havolani bering. Havola 10 daqiqa va
            bir marta ishlaydi, uni «Hisobim» bo‘limiga olib boradi — u yerda yangi kirish usulini ulaydi.
          </p>
          {loginLink ? (
            <div className="flex gap-2">
              <input className="adm-input flex-1 text-xs" readOnly value={loginLink} onFocus={(e) => e.target.select()} />
              <button className="adm-btn adm-btn--ghost" onClick={() => void navigator.clipboard?.writeText(loginLink)}>
                <Copy size={16} /> Nusxa
              </button>
            </div>
          ) : (
            <button className="adm-btn adm-btn--ghost justify-self-start" disabled={busy} onClick={makeLoginLink}>
              <ExternalLink size={16} /> Kirish havolasini yaratish
            </button>
          )}
          {linkError && <p className="text-sm" style={{ color: 'var(--danger)' }}>{linkError}</p>}
        </section>

        <section className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
          {shop.status === 'blocked' ? (
            <button className="adm-btn adm-btn--primary" disabled={busy} onClick={() => act({ status: shop.paidUntil ? 'active' : 'demo' }, 'Do‘kon qayta ochildi')}>
              <CheckCircle2 size={16} /> Qayta ochish
            </button>
          ) : (
            <button className="adm-btn adm-btn--danger" disabled={busy} onClick={() => setBlocking(true)}>
              <Ban size={16} /> Do‘konni to‘xtatish
            </button>
          )}
          <button className="adm-btn adm-btn--danger ml-auto" disabled={busy} onClick={() => { setConfirmText(''); setDeleting(true) }}>
            <Trash2 size={16} /> Butunlay o‘chirish
          </button>
        </section>
      </div>

      {blocking && (
        <ConfirmDialog
          title="Do‘konni to‘xtatish"
          message={`«${shop.name}» sayti «vaqtincha yopiq» sahifasini ko‘rsatadi, admin panelda hech narsa o‘zgartirib bo‘lmaydi. Keyin qayta ochish mumkin.`}
          confirmLabel="To‘xtatish"
          busy={busy}
          onConfirm={() => act({ status: 'blocked' }, 'Do‘kon to‘xtatildi')}
          onClose={() => setBlocking(false)}
        />
      )}

      {deleting && (
        <Modal
          title="Do‘konni butunlay o‘chirish"
          onClose={() => !busy && setDeleting(false)}
          footer={
            <>
              <button className="adm-btn adm-btn--ghost flex-1" disabled={busy} onClick={() => setDeleting(false)}>Bekor qilish</button>
              <button
                className="adm-btn adm-btn--danger flex-1"
                disabled={busy || confirmText.trim().toLowerCase() !== shop.id}
                onClick={remove}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} O‘chirish
              </button>
            </>
          }
        >
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            «{shop.name}» va undagi <b>hamma narsa</b> o‘chadi: mahsulotlar, buyurtmalar, mijozlar, xodimlar hisoblari,
            to‘lovlar tarixi va rasmlar. Do‘kon boti uziladi, egasining telefoni bo‘shaydi — u yana do‘kon ocha oladi.
          </p>
          <p className="mt-2 text-sm font-bold" style={{ color: 'var(--danger)' }}>Qaytarib bo‘lmaydi.</p>
          <label className="adm-label mt-4" htmlFor="sp-delete-confirm">
            Tasdiqlash uchun do‘kon manzilini yozing: <code>{shop.id}</code>
          </label>
          <input
            id="sp-delete-confirm"
            className="adm-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={shop.id}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Modal>
      )}
    </Modal>
  )
}

/* ── Sozlamalar ─────────────────────────────────────────── */

function PlatformSettings({ card, run }: { card: Overview['card']; run: RunFn }) {
  const [cardNumber, setCardNumber] = useState(card.cardNumber)
  const [cardOwner, setCardOwner] = useState(card.cardOwner)
  const [note, setNote] = useState(card.note)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    await run('super.settings.save', { cardNumber, cardOwner, note }, 'Saqlandi')
    setBusy(false)
  }

  const setupBot = async () => {
    setBusy(true)
    await run('super.bot.setup', {}, 'SavdoGO boti sozlandi — Telegram’da /start yozib tekshiring')
    setBusy(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="adm-card grid gap-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><CreditCard size={18} /> Obuna to‘lovlari kartasi</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Do‘kon egalari admin paneldagi «Obuna va to‘lov» bo‘limida shu kartani ko‘radi.</p>
        <div>
          <label className="adm-label">Karta raqami</label>
          <input className="adm-input" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^\d ]/g, ''))} placeholder="8600 0000 0000 0000" />
        </div>
        <div>
          <label className="adm-label">Karta egasi</label>
          <input className="adm-input" value={cardOwner} onChange={(e) => setCardOwner(e.target.value.toUpperCase())} placeholder="ISM FAMILIYA" />
        </div>
        <div>
          <label className="adm-label">Izoh (ixtiyoriy)</label>
          <textarea className="adm-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: Click yoki Payme orqali ham mumkin" />
        </div>
        <button className="adm-btn adm-btn--primary" disabled={busy} onClick={save}>{busy && <Loader2 size={16} className="animate-spin" />} Saqlash</button>
      </section>

      <section className="adm-card grid content-start gap-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><Send size={18} /> SavdoGO boti</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Hamma uchun bitta bot: Telegram’da do‘kon ochish, parolsiz kirish, o‘z botini ulash va buyurtma xabarlari.
          Vercel’da <code>PLATFORM_BOT_TOKEN</code> qo‘yib Redeploy qilgach — bir marta bosing (token almashsa ham).
        </p>
        <button className="adm-btn adm-btn--primary justify-self-start" disabled={busy} onClick={setupBot}>
          {busy && <Loader2 size={16} className="animate-spin" />} Botni sozlash
        </button>
      </section>

      <section className="adm-card grid content-start gap-2 p-4 sm:p-5">
        <h2 className="text-base font-extrabold">Tariflar</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Narxlar kodda: <code>src/platform/plans.ts</code> — landing, admin va server shu yerdan o‘qiydi.</p>
        {(['week', 'month', 'year'] as PlanId[]).map((id) => (
          <div key={id} className="flex justify-between rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)' }}>
            <span className="font-bold">{PLANS[id].name}</span>
            <span>{formatSum(PLANS[id].price)} · {PLANS[id].days} kun</span>
          </div>
        ))}
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Biznes turlari: {BUSINESS_TYPES.length} ta.</p>
      </section>
    </div>
  )
}
