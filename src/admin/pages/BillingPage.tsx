import {
  Check, CheckCircle2, Clock, Copy, ImagePlus, Loader2, Receipt, Send, ShieldCheck, Trash2, XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PLANS, PLAN_ORDER, PLATFORM, TELEGRAM_ADDON, TRIAL_DAYS, YEAR_SAVING_PERCENT, formatSum, type PlanId } from '../../platform/config'
import { apiPost } from '../lib/api'
import { daysLeft, isLocked, useAdminShop } from '../lib/shop'
import { useToast } from '../components/Toast'
import { ADDON_BENEFITS, ADDON_NAME, ADDON_PITCH, ADDON_PRICE } from '../../platform/addon'

type Payment = {
  id: string
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

type Billing = {
  status: string
  paidUntil: string | null
  plan: PlanId
  telegramAddon: boolean
  card: { cardNumber: string; cardOwner: string; note: string }
  payments: Payment[]
}

const STATUS: Record<Payment['status'], { label: string; icon: typeof Clock; color: string; bg: string }> = {
  pending: { label: 'Tekshirilmoqda', icon: Clock, color: 'var(--warning)', bg: 'var(--warning-soft)' },
  approved: { label: 'Tasdiqlandi', icon: CheckCircle2, color: 'var(--success)', bg: 'var(--success-soft)' },
  rejected: { label: 'Rad etildi', icon: XCircle, color: 'var(--danger)', bg: 'var(--danger-soft)' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Chek rasmi — 1600px gacha kichraytirilib JPEG ga; asl 10 MB lik foto serverga sig'maydi. */
async function compressReceipt(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Chekning rasmini (skrinshotini) yuklang')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Rasmni qayta ishlab bo‘lmadi')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Obuna va to'lov — do'kon egasi uchun.
 *
 * Tarif tanlanadi, platforma kartasiga o'tkazma qilinadi va chek
 * rasmi yuklanadi. Platforma egasi /super panelida tasdiqlagach do'kon
 * faollashadi — bu sahifa do'kon hujjatini jonli kuzatgani uchun
 * holat o'zi yangilanadi.
 */
export function BillingPage({ preselectAddon = false }: { preselectAddon?: boolean }) {
  const shop = useAdminShop()
  const { show, node: toast } = useToast()
  const [data, setData] = useState<Billing | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanId>(shop.plan)
  // «Kuryerlar va Telegram» sahifasidagi «Ulash» tugmasidan kelganda — belgilangan
  const [addon, setAddon] = useState(preselectAddon)
  const [receipt, setReceipt] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Chek yuborilgach qayta yuklash uchun
  const [reload, setReload] = useState(0)

  // Do'kon holati o'zgarsa (to'lov tasdiqlansa) tarix ham yangilanadi
  useEffect(() => {
    let alive = true
    apiPost<Billing>('/api/platform', { action: 'billing.status' }).then(
      (result) => {
        if (!alive) return
        setData(result)
        setLoadError(null)
      },
      (error) => alive && setLoadError(error instanceof Error ? error.message : 'Yuklab bo‘lmadi'),
    )
    return () => {
      alive = false
    }
  }, [reload, shop.status, shop.paidUntil])

  const locked = isLocked(shop)
  const left = daysLeft(shop)
  const pending = data?.payments.find((p) => p.status === 'pending')
  const hasAddon = shop.telegramAddon || data?.telegramAddon

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setReceipt(await compressReceipt(file))
    } catch (error) {
      show(error instanceof Error ? error.message : 'Rasmni o‘qib bo‘lmadi', 'error')
    }
  }

  const submit = async () => {
    if (!receipt) return show('Avval chek rasmini yuklang', 'error')
    setBusy(true)
    try {
      await apiPost('/api/platform', { action: 'billing.submit', plan, telegramAddon: addon, receipt, note })
      show('Chek yuborildi — tekshirilgach do‘kon faollashadi')
      setReceipt(null)
      setNote('')
      setReload((n) => n + 1)
    } catch (error) {
      show(error instanceof Error ? error.message : 'Yuborilmadi', 'error')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ''))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard yopiq */
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-5">
        {/* Holat */}
        <section className="adm-card flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl"
            style={{ background: locked ? 'var(--brand-soft)' : 'var(--success-soft)', color: locked ? 'var(--brand)' : 'var(--success)' }}
          >
            <ShieldCheck size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Do‘kon holati</p>
            <p className="mt-0.5 text-lg font-extrabold">
              {shop.status === 'demo'
                ? 'Ko‘rish rejimi'
                : locked
                  ? shop.trial ? 'Bepul sinov tugadi' : 'Obuna muddati tugagan'
                  : shop.trial ? `Bepul sinov — ${TRIAL_DAYS} kun` : 'Faol'}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {locked
                ? 'To‘lov tasdiqlangach mahsulot qo‘shish va buyurtma qabul qilish ochiladi.'
                : shop.trial
                  ? `Hamma imkoniyat ochiq · ${formatDate(shop.paidUntil)} gacha${left !== null ? ` (${left} kun qoldi)` : ''}`
                  : `${PLANS[shop.plan].name} tarif · ${formatDate(shop.paidUntil)} gacha${left !== null ? ` (${left} kun)` : ''}`}
            </p>
          </div>
        </section>

        {/* Tarif */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="text-base font-extrabold">{locked || shop.trial ? '1. Tarifni tanlang' : '1. Uzaytirish uchun tarif'}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            {shop.trial && !locked
              ? 'Hamma tarifda barcha imkoniyatlar bir xil. Sinov tugashidan oldin to‘lasangiz, tarif muddati sinovning qolgan kunlari ustiga qo‘shiladi.'
              : 'Hamma tarifda barcha imkoniyatlar bir xil. Muddatidan oldin to‘lasangiz, yangi muddat eskisining ustiga qo‘shiladi.'}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id]
              const active = plan === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlan(id)}
                  className="relative rounded-2xl border-2 p-4 text-left transition"
                  style={{ borderColor: active ? 'var(--brand)' : 'var(--line)', background: active ? 'var(--brand-soft)' : 'var(--surface)' }}
                >
                  {id === 'year' && (
                    <span className="absolute -top-2.5 right-3 rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>
                      −{YEAR_SAVING_PERCENT}%
                    </span>
                  )}
                  <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{p.name}</p>
                  <p className="mt-1 text-xl font-extrabold">{formatSum(p.price)}</p>
                  <p className="text-xs" style={{ color: 'var(--faint)' }}>{p.days} kun</p>
                </button>
              )
            })}
          </div>

          {hasAddon ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm" style={{ background: 'var(--success-soft)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
              «{ADDON_NAME}» to‘plami {shop.botUsername ? <>ulangan — <b>@{shop.botUsername}</b></> : 'to‘langan — botingizni ulayapmiz'}
            </p>
          ) : (
            <label
              className="mt-3 grid cursor-pointer gap-3 rounded-2xl border-2 p-4"
              style={{ borderColor: addon ? '#229ED9' : 'var(--line)', background: addon ? 'rgb(34 158 217 / 0.08)' : 'var(--surface)' }}
            >
              <span className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 size-4" checked={addon} onChange={(e) => setAddon(e.target.checked)} />
                <span className="min-w-0 flex-1 text-sm">
                  <b className="block">+ «{ADDON_NAME}» — {ADDON_PRICE}, bir martalik</b>
                  <span className="block" style={{ color: 'var(--muted)' }}>{ADDON_PITCH}</span>
                </span>
              </span>
              <span className="grid gap-1.5 pl-7 sm:grid-cols-2">
                {ADDON_BENEFITS.slice(0, 4).map(({ icon: Icon, title }) => (
                  <span key={title} className="flex items-center gap-2 text-xs font-bold">
                    <Icon size={15} style={{ color: '#229ED9' }} /> {title}
                  </span>
                ))}
              </span>
              <span className="pl-7 text-xs" style={{ color: 'var(--faint)' }}>
                Summani so‘mda (kurs bo‘yicha) tarif bilan birga shu kartaga o‘tkazing — botni ulash uchun siz bilan bog‘lanamiz.
              </span>
            </label>
          )}
        </section>

        {/* Karta */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="text-base font-extrabold">2. Kartaga o‘tkazing</h2>
          {data?.card.cardNumber ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="min-w-0">
                <p className="font-mono text-lg font-bold tracking-wider">{data.card.cardNumber}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{data.card.cardOwner}</p>
              </div>
              <button className="adm-btn adm-btn--ghost" onClick={() => copy(data.card.cardNumber)}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Nusxalandi' : 'Nusxa olish'}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
              {loadError ?? (data ? `Karta hali kiritilmagan — ${PLATFORM.telegram} ga yozing.` : 'Yuklanmoqda...')}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--brand-soft)' }}>
            <span className="text-sm font-bold">O‘tkaziladigan summa</span>
            <span className="text-lg font-extrabold" style={{ color: 'var(--brand)' }}>
              {formatSum(PLANS[plan].price)}{addon ? ` + $${TELEGRAM_ADDON.priceUsd}` : ''}
            </span>
          </div>
          {data?.card.note && <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{data.card.note}</p>}
        </section>

        {/* Chek */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="text-base font-extrabold">3. Chekni yuboring</h2>
          {pending ? (
            <div className="mt-3 flex items-start gap-3 rounded-2xl p-4" style={{ background: 'var(--warning-soft)' }}>
              <Clock size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
              <p className="text-sm">
                <b>Chekingiz tekshirilmoqda.</b> Odatda 1 soat ichida tasdiqlanadi — sahifani yangilash shart emas, holat o‘zi
                o‘zgaradi. Shoshilinch bo‘lsa: {PLATFORM.phone}
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
            <button
              type="button"
              className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition"
              style={{ borderColor: receipt ? 'var(--brand)' : 'var(--line)', background: 'var(--surface-2)' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void pickFile(e.dataTransfer.files?.[0]) }}
            >
              {receipt ? (
                <img src={receipt} alt="Chek" className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="grid justify-items-center gap-2 p-3 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
                  <ImagePlus size={26} /> Chek rasmi yoki skrinshoti
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = '' }}
            />
            <div className="grid content-start gap-3">
              <div>
                <label className="adm-label">Izoh (ixtiyoriy)</label>
                <textarea
                  className="adm-input"
                  rows={3}
                  maxLength={300}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Masalan: Payme orqali, Anvar Aliyev kartasidan"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="adm-btn adm-btn--primary" disabled={!receipt || busy} onClick={submit}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Chekni yuborish
                </button>
                {receipt && (
                  <button className="adm-btn adm-btn--ghost" onClick={() => setReceipt(null)}>
                    <Trash2 size={16} /> Olib tashlash
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Tarix */}
      <aside className="adm-card content-start self-start p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><Receipt size={18} /> To‘lovlar tarixi</h2>
        {!data ? (
          <div className="adm-skeleton mt-4 h-24" />
        ) : data.payments.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>Hali to‘lov yo‘q.</p>
        ) : (
          <ul className="mt-4 grid gap-2.5">
            {data.payments.map((payment) => {
              const s = STATUS[payment.status]
              return (
                <li key={payment.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-sm">{PLANS[payment.plan]?.name ?? payment.plan} · {formatSum(payment.amount)}</b>
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: s.bg, color: s.color }}>
                      <s.icon size={12} /> {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    Yuborildi: {formatDate(payment.createdAt)}
                    {payment.paidUntil && ` · ${formatDate(payment.paidUntil)} gacha`}
                    {payment.telegramAddon && ' · + Telegram'}
                  </p>
                  {payment.status === 'rejected' && payment.reviewNote && (
                    <p className="mt-1.5 rounded-lg px-2 py-1 text-xs" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                      {payment.reviewNote}
                    </p>
                  )}
                  <a className="mt-1.5 inline-block text-xs font-bold" style={{ color: 'var(--brand)' }} href={payment.receipt} target="_blank" rel="noreferrer">
                    Chekni ko‘rish
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      {toast}
    </div>
  )
}
