import {
  ArrowRight, BadgeCheck, Check, Clock, Copy, FilePlus2, Info, Loader2, Repeat, Store, XCircle,
} from 'lucide-react'
import { createElement, useEffect, useState, type FormEvent } from 'react'
import { BUSINESS_TYPES, businessType, type BusinessTypeId } from '../../platform/business-types'
import { typeIcon } from '../../platform/business-icons'
import { PLATFORM, normalizeSlug } from '../../platform/config'
import { initials } from '../../platform/shop'
import { inkOn } from '../../platform/palette'
import { apiPost } from '../lib/api'
import { SHOP_STATUS, switchToShop, type OwnedShop } from '../lib/owned'
import { useToast } from '../components/Toast'

type RequestStatus = 'pending' | 'approved' | 'creating' | 'used' | 'rejected' | 'cancelled'

type ShopRequest = {
  id: string
  status: RequestStatus
  name: string
  type: string
  slug: string
  note: string
  createdAt: string
  reviewedAt: string | null
  reviewNote: string
  inviteCode: string | null
  inviteExpiresAt: string | null
  createdShopId: string | null
}

type Overview = { requests: ShopRequest[]; shops: OwnedShop[] }

const STATUS: Record<RequestStatus, { label: string; fg: string; bg: string }> = {
  pending: { label: 'Ko‘rib chiqilmoqda', fg: 'var(--warning)', bg: 'var(--warning-soft)' },
  approved: { label: 'Tasdiqlandi', fg: 'var(--success)', bg: 'var(--success-soft)' },
  creating: { label: 'Yaratilmoqda', fg: 'var(--brand)', bg: 'var(--brand-soft)' },
  used: { label: 'Do‘kon ochildi', fg: 'var(--success)', bg: 'var(--success-soft)' },
  rejected: { label: 'Rad etildi', fg: 'var(--danger)', bg: 'var(--danger-soft)' },
  cancelled: { label: 'Bekor qilindi', fg: 'var(--muted)', bg: 'var(--surface-3)' },
}

function date(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

function inviteLink(code: string): string {
  return `${window.location.origin}/start?invite=${encodeURIComponent(code)}`
}

/**
 * «Yangi do'kon» — ikkinchi do'kon uchun ariza va hisobning do'konlari.
 *
 * Ro'yxatdan o'tish formasi orqali bir kishi bitta do'kon ochadi
 * (telefon va email serverda band qilinadi). Ikkinchisi — shu yerdan
 * ariza: platforma egasi tasdiqlagach havola chiqadi, ega formani
 * to'ldiradi va yangi do'kon shu hisobga qo'shiladi.
 */
export function NewShopPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const { show, node: toast } = useToast()

  useEffect(() => {
    let alive = true
    apiPost<Overview>('/api/platform', { action: 'owner.overview' }).then(
      (result) => {
        if (!alive) return
        setData(result)
        setError(null)
      },
      (err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Yuklab bo‘lmadi')
      },
    )
    return () => {
      alive = false
    }
  }, [tick])

  const reload = () => setTick((n) => n + 1)

  if (error && !data) {
    return (
      <div className="adm-card adm-empty">
        <p className="font-extrabold">Ma’lumotni yuklab bo‘lmadi</p>
        <p className="text-sm">{error}</p>
        <button className="adm-btn adm-btn--primary mt-2" onClick={reload}>Qayta urinish</button>
      </div>
    )
  }
  if (!data) return <div className="grid gap-4"><div className="adm-skeleton h-28" /><div className="adm-skeleton h-72" /></div>

  const open = data.requests.find((r) => r.status === 'pending' || r.status === 'approved' || r.status === 'creating')
  const lastRejected = !open ? data.requests.find((r) => r.status === 'rejected') : undefined
  const history = data.requests.filter((r) => r !== open)

  return (
    <div className="ns-page">
      <section className="adm-card ns-intro">
        <span className="ns-intro__icon"><Store size={26} /></span>
        <div>
          <h2 className="ns-title">Yana bir do‘kon ochish</h2>
          <p className="ns-text">
            Bitta egaga bitta do‘kon ochiladi. Ikkinchi biznesingiz bo‘lsa — ariza qoldiring: tekshirib, odatda bir kun
            ichida javob beramiz. Tasdiqlangach yangi do‘konni <b>shu hisob bilan</b> o‘zingiz yaratasiz, panelda esa
            do‘konlar orasida bir bosishda almashasiz.
          </p>
          <p className="ns-note"><Info size={15} /> Har bir do‘konning obunasi alohida to‘lanadi.</p>
        </div>
      </section>

      {data.shops.length > 0 && <MyShops shops={data.shops} onError={(text) => show(text, 'error')} />}

      {open ? (
        <OpenRequest request={open} onChanged={reload} show={show} />
      ) : (
        <RequestForm rejected={lastRejected} onSent={() => { show('Ariza yuborildi'); reload() }} onError={(text) => show(text, 'error')} />
      )}

      {history.length > 0 && (
        <section className="adm-card p-4 sm:p-5">
          <h3 className="ns-h3">Arizalar tarixi</h3>
          <ul className="ns-history">
            {history.map((r) => {
              const s = STATUS[r.status]
              const Icon = typeIcon(businessType(r.type).id)
              return (
                <li key={r.id}>
                  <span className="ns-history__icon"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate">{r.name}</b>
                    <small>{date(r.createdAt)}{r.reviewNote ? ` · ${r.reviewNote}` : ''}</small>
                  </span>
                  <span className="adm-badge" style={{ color: s.fg, background: s.bg }}>{s.label}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {toast}
    </div>
  )
}

function ShopMark({ shop, size = 40 }: { shop: Pick<OwnedShop, 'name' | 'logo' | 'brand'>; size?: number }) {
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

function MyShops({ shops, onError }: { shops: OwnedShop[]; onError: (text: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const go = async (id: string) => {
    setBusy(id)
    try {
      await switchToShop(id)
    } catch (err) {
      setBusy(null)
      onError(err instanceof Error ? err.message : 'O‘tib bo‘lmadi')
    }
  }
  return (
    <section className="adm-card p-4 sm:p-5">
      <h3 className="ns-h3">Do‘konlaringiz <span>{shops.length}</span></h3>
      <ul className="ns-shops">
        {shops.map((shop) => {
          const s = SHOP_STATUS[shop.status] ?? SHOP_STATUS.demo
          return (
            <li key={shop.id} className={shop.current ? 'is-current' : ''}>
              <ShopMark shop={shop} />
              <span className="min-w-0 flex-1">
                <b className="block truncate">{shop.name}</b>
                <small>{shop.id}.{PLATFORM.rootDomain}</small>
              </span>
              <span className="adm-badge" style={{ color: s.fg, background: s.bg }}>{s.label}</span>
              {shop.current ? (
                <span className="ns-current"><Check size={14} /> Hozir ochiq</span>
              ) : (
                <button className="adm-btn adm-btn--ghost" disabled={busy !== null} onClick={() => void go(shop.id)}>
                  {busy === shop.id ? <Loader2 size={15} className="animate-spin" /> : <Repeat size={15} />} O‘tish
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function OpenRequest({ request, onChanged, show }: { request: ShopRequest; onChanged: () => void; show: (text: string, kind?: 'ok' | 'error') => void }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const type = businessType(request.type)
  const s = STATUS[request.status]
  const approved = request.status === 'approved' && request.inviteCode

  const cancel = async () => {
    setBusy(true)
    try {
      await apiPost('/api/platform', { action: 'owner.request.cancel', id: request.id })
      show('Ariza bekor qilindi')
      onChanged()
    } catch (err) {
      show(err instanceof Error ? err.message : 'Bajarilmadi', 'error')
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!request.inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteLink(request.inviteCode))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard yopiq */
    }
  }

  return (
    <section className={'adm-card ns-request' + (approved ? ' is-approved' : '')}>
      <div className="ns-request__head">
        <span className="ns-request__icon" style={{ background: approved ? 'var(--success)' : 'var(--warning-soft)', color: approved ? '#fff' : 'var(--warning)' }}>
          {approved ? <BadgeCheck size={22} /> : <Clock size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="ns-h3 mb-0">{approved ? 'Arizangiz tasdiqlandi!' : 'Arizangiz ko‘rib chiqilmoqda'}</h3>
          <p className="ns-text">
            {approved
              ? 'Endi yangi do‘konni yarating: nomi, dizayni va manzilini tanlaysiz — do‘kon shu hisobga qo‘shiladi.'
              : 'Javobni shu sahifada ko‘rasiz. Odatda bir kun ichida ko‘rib chiqamiz.'}
          </p>
        </div>
        <span className="adm-badge" style={{ color: s.fg, background: s.bg }}>{s.label}</span>
      </div>

      <div className="ns-request__body">
        <span className="ns-history__icon">{createElement(typeIcon(type.id), { size: 16 })}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate">{request.name}</b>
          <small>{type.name}{request.slug ? ` · ${request.slug}.${PLATFORM.rootDomain}` : ''} · {date(request.createdAt)}</small>
        </span>
      </div>
      {request.reviewNote && <p className="ns-review">{request.reviewNote}</p>}

      <div className="ns-request__actions">
        {approved && request.inviteCode ? (
          <>
            <a className="adm-btn adm-btn--primary" href={inviteLink(request.inviteCode)}>
              Do‘konni yaratish <ArrowRight size={16} />
            </a>
            <button className="adm-btn adm-btn--ghost" onClick={() => void copy()}>
              {copied ? <Check size={15} /> : <Copy size={15} />} Havolani nusxalash
            </button>
            <small className="ns-expire">Havola {date(request.inviteExpiresAt)} gacha amal qiladi</small>
          </>
        ) : request.status === 'pending' ? (
          <button className="adm-btn adm-btn--ghost" disabled={busy} onClick={() => void cancel()}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Arizani bekor qilish
          </button>
        ) : null}
      </div>
    </section>
  )
}

function RequestForm({ rejected, onSent, onError }: { rejected?: ShopRequest; onSent: () => void; onError: (text: string) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<BusinessTypeId>('restaurant')
  const [slug, setSlug] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (name.trim().length < 2) return onError('Yangi do‘kon nomini kiriting')
    setBusy(true)
    try {
      await apiPost('/api/platform', { action: 'owner.request.submit', name, type, slug: normalizeSlug(slug), note })
      onSent()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Yuborib bo‘lmadi')
      setBusy(false)
    }
  }

  return (
    <form className="adm-card p-4 sm:p-6" onSubmit={submit}>
      <h3 className="ns-h3"><FilePlus2 size={18} /> Ikkinchi do‘kon uchun ariza</h3>
      {rejected && (
        <p className="ns-review ns-review--bad">
          Oldingi arizangiz («{rejected.name}») rad etilgan{rejected.reviewNote ? `: ${rejected.reviewNote}` : '.'} Qayta yuborishingiz mumkin.
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="adm-label" htmlFor="ns-name">Yangi do‘kon nomi</label>
          <input id="ns-name" className="adm-input" maxLength={60} placeholder="Masalan: Kafe Nur 2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="adm-label" htmlFor="ns-slug">Istalgan manzil (ixtiyoriy)</label>
          <div className="ns-slug">
            <input
              id="ns-slug"
              className="adm-input"
              maxLength={40}
              placeholder="kafe-nur-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-/, ''))}
            />
            <span>.{PLATFORM.rootDomain}</span>
          </div>
        </div>
      </div>

      <label className="adm-label mt-4">Biznes turi</label>
      <div className="ns-types">
        {BUSINESS_TYPES.map((t) => {
          const Icon = typeIcon(t.id)
          return (
            <button
              key={t.id}
              type="button"
              className={'adm-chip ns-type' + (type === t.id ? ' active' : '')}
              onClick={() => setType(t.id)}
              aria-pressed={type === t.id}
            >
              <Icon size={15} /> {t.name}
            </button>
          )
        })}
      </div>

      <label className="adm-label mt-4" htmlFor="ns-note">Izoh (ixtiyoriy)</label>
      <textarea
        id="ns-note"
        className="adm-input"
        rows={3}
        maxLength={500}
        placeholder="Masalan: Chilonzordagi ikkinchi filialimiz uchun alohida do‘kon kerak"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button className="adm-btn adm-btn--primary" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Ariza yuborish
        </button>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Javob shu sahifada ko‘rinadi.</span>
      </div>
    </form>
  )
}
