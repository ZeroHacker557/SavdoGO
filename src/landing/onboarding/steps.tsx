import {
  AtSign, Banknote, Building2, Check, Clock, CreditCard, Eye, EyeOff, ImageUp, Info, Loader2, Lock,
  Mail, MapPin, Phone, Pipette, Send, ShoppingBag, Store, Trash2, Truck, User, UserCheck, Wand2, XCircle,
  CheckCircle2,
} from 'lucide-react'
import { useRef, useState, type CSSProperties, type DragEvent } from 'react'
import {
  BUSINESS_TYPES, COLOR_PRESETS, FONT_PAIRS, businessType, type BusinessTypeId, type FontPairId,
} from '../../platform/business-types'
import { typeIcon } from '../../platform/business-icons'
import { PLANS, PLAN_ORDER, PLATFORM, TELEGRAM_ADDON, TRIAL_DAYS, YEAR_SAVING_PERCENT, formatSum } from '../../platform/config'
import { ADDON_NAME } from '../../platform/addon'
import { inkOn } from '../../platform/palette'
import { initials, type ShopDraft } from '../../platform/shop'
import { Field, Input, Toggle } from './fields'
import { maskCard, maskPhone, maskSum, parseSum } from './format'
import { processLogo } from './logo'
import type { InviteInfo } from './invite'

export type Owner = { name: string; email: string; password: string; phone: string }
export type SlugState = 'idle' | 'checking' | 'free' | 'taken' | 'invalid' | 'unknown'

type StepProps = {
  draft: ShopDraft
  update: (patch: Partial<ShopDraft>) => void
  errors: Record<string, string | null>
}

/* ── 1. Biznes turi ───────────────────────────────────────── */

export function StepType({ draft, onPick }: { draft: ShopDraft; onPick: (id: BusinessTypeId) => void }) {
  return (
    <>
      <h1 className="wz-title">Qanday biznesingiz bor?</h1>
      <p className="wz-lead">
        Tanlovingizga qarab katalog, mahsulot turlari va dizayn o‘zi moslanadi. Keyin hammasini o‘zgartirish mumkin.
      </p>
      <div className="wz-types" role="radiogroup" aria-label="Biznes turi">
        {BUSINESS_TYPES.map((type) => {
          const active = draft.type === type.id
          const Icon = typeIcon(type.id)
          return (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`wz-type${active ? ' is-active' : ''}`}
              style={{ '--t-color': type.brand } as CSSProperties}
              onClick={() => onPick(type.id)}
            >
              <span className="wz-type__icon"><Icon size={22} /></span>
              <b>{type.name}</b>
              <small>{type.pitch}</small>
              {active && <span className="wz-type__check"><Check size={14} strokeWidth={3} /></span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ── 2. Biznes haqida ─────────────────────────────────────── */

export function StepInfo({ draft, update, errors }: StepProps) {
  const type = businessType(draft.type)
  const contacts = draft.contacts
  const setContact = (patch: Partial<ShopDraft['contacts']>) => update({ contacts: { ...contacts, ...patch } })

  return (
    <>
      <h1 className="wz-title">Biznesingiz haqida</h1>
      <p className="wz-lead">Bu ma’lumotlar saytning tepasida, aloqa bo‘limida va buyurtma xabarlarida chiqadi.</p>

      <div className="wz-grid">
        <Field label="Biznes nomi" error={errors.name} full>
          <Input
            icon={Store}
            autoFocus
            maxLength={40}
            placeholder={type.id === 'restaurant' ? 'Masalan: Kafe Nur' : 'Masalan: Moda House'}
            value={draft.name}
            invalid={!!errors.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>

        <Field label="Qisqa shior" optional hint="Logotip ostida kichik yozuv bo‘lib chiqadi" full>
          <Input
            icon={Wand2}
            maxLength={60}
            placeholder={type.hero.subtitle}
            value={draft.tagline}
            onChange={(e) => update({ tagline: e.target.value })}
          />
        </Field>

        <Field label="Telefon raqam" error={errors.phone}>
          <Input
            icon={Phone}
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            value={contacts.phone}
            invalid={!!errors.phone}
            onFocus={() => !contacts.phone && setContact({ phone: '+998 ' })}
            onChange={(e) => setContact({ phone: maskPhone(e.target.value) })}
          />
        </Field>

        <Field label="Telegram" optional>
          <Input
            icon={Send}
            placeholder="@kafenur"
            maxLength={40}
            value={contacts.telegram}
            onChange={(e) => setContact({ telegram: e.target.value.replace(/\s/g, '') })}
          />
        </Field>

        <Field label="Shahar" error={errors.city}>
          <Input
            icon={Building2}
            placeholder="Toshkent"
            maxLength={40}
            value={contacts.city}
            invalid={!!errors.city}
            onChange={(e) => setContact({ city: e.target.value })}
          />
        </Field>

        <Field label="Ish vaqti" optional>
          <Input
            icon={Clock}
            placeholder="09:00 — 21:00"
            maxLength={40}
            value={contacts.workHours}
            onChange={(e) => setContact({ workHours: e.target.value })}
          />
        </Field>

        <Field label="Manzil" optional hint="Olib ketish uchun mijozlar shu manzilni ko‘radi" full>
          <Input
            icon={MapPin}
            placeholder="Chilonzor tumani, Bunyodkor ko‘chasi, 12"
            maxLength={160}
            value={contacts.address}
            onChange={(e) => setContact({ address: e.target.value })}
          />
        </Field>

        <Field label="Instagram" optional full>
          <Input
            icon={AtSign}
            placeholder="kafenur.uz"
            maxLength={40}
            value={contacts.instagram}
            onChange={(e) => setContact({ instagram: e.target.value.replace(/[\s@]/g, '') })}
          />
        </Field>
      </div>
    </>
  )
}

/* ── 3. Yetkazish va to'lov ───────────────────────────────── */

export function StepService({ draft, update, errors }: StepProps) {
  const { delivery, payments } = draft
  const setDelivery = (patch: Partial<ShopDraft['delivery']>) => update({ delivery: { ...delivery, ...patch } })
  const setPayments = (patch: Partial<ShopDraft['payments']>) => update({ payments: { ...payments, ...patch } })

  return (
    <>
      <h1 className="wz-title">Yetkazish va to‘lov</h1>
      <p className="wz-lead">Mijoz buyurtma berayotganda shu shartlarni ko‘radi. Keyin admin paneldan o‘zgartirasiz.</p>

      <div className="wz-stack">
        <Toggle
          icon={Truck}
          title="Yetkazib berish"
          text="Mijoz manzilini kiritadi yoki xaritadan belgilaydi"
          on={delivery.enabled}
          onChange={(enabled) => setDelivery({ enabled })}
        />
        {delivery.enabled && (
          <div className="wz-reveal wz-grid">
            <Field label="Yetkazish narxi" hint={delivery.fee === 0 ? 'Bepul yetkazish' : undefined}>
              <Input
                inputMode="numeric"
                placeholder="0"
                value={maskSum(delivery.fee)}
                onChange={(e) => setDelivery({ fee: parseSum(e.target.value) })}
                suffix={<span className="wz-hint" style={{ paddingRight: 10 }}>so‘m</span>}
              />
            </Field>
            <Field label="Bepul yetkazish" optional hint="Shu summadan katta buyurtmaga">
              <Input
                inputMode="numeric"
                placeholder="Yo‘q"
                value={maskSum(delivery.freeFrom)}
                onChange={(e) => setDelivery({ freeFrom: parseSum(e.target.value) })}
                suffix={<span className="wz-hint" style={{ paddingRight: 10 }}>so‘m</span>}
              />
            </Field>
            <Field label="Minimal buyurtma" optional full>
              <Input
                inputMode="numeric"
                placeholder="Cheklov yo‘q"
                value={maskSum(delivery.minOrder)}
                onChange={(e) => setDelivery({ minOrder: parseSum(e.target.value) })}
                suffix={<span className="wz-hint" style={{ paddingRight: 10 }}>so‘m</span>}
              />
            </Field>
          </div>
        )}
        <Toggle
          icon={ShoppingBag}
          title="Olib ketish"
          text="Mijoz buyurtmani do‘koningizdan o‘zi olib ketadi"
          on={delivery.pickup}
          onChange={(pickup) => setDelivery({ pickup })}
        />
        {errors.delivery && <span className="wz-error">{errors.delivery}</span>}
      </div>

      <h2 className="wz-sub">To‘lov usullari</h2>
      <div className="wz-stack">
        <Toggle
          icon={Banknote}
          title="Naqd pul"
          text="Yetkazib berilganda yoki olib ketishda"
          on={payments.cash}
          onChange={(cash) => setPayments({ cash })}
        />
        <Toggle
          icon={CreditCard}
          title="Kartaga o‘tkazma"
          text="Mijoz kartangizga o‘tkazadi va chekini yuboradi"
          on={payments.card}
          onChange={(card) => setPayments({ card })}
        />
        {payments.card && (
          <div className="wz-reveal wz-grid">
            <Field label="Karta raqami" error={errors.cardNumber}>
              <Input
                icon={CreditCard}
                inputMode="numeric"
                placeholder="8600 1234 5678 9012"
                value={maskCard(payments.cardNumber)}
                invalid={!!errors.cardNumber}
                onChange={(e) => setPayments({ cardNumber: maskCard(e.target.value) })}
              />
            </Field>
            <Field label="Karta egasi" optional>
              <Input
                icon={User}
                placeholder="ALIYEV ANVAR"
                maxLength={60}
                value={payments.cardOwner}
                onChange={(e) => setPayments({ cardOwner: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>
        )}
        {errors.payments && <span className="wz-error">{errors.payments}</span>}
      </div>
    </>
  )
}

/* ── 4. Dizayn ────────────────────────────────────────────── */

export function StepDesign({ draft, update }: StepProps) {
  const [dragging, setDragging] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const type = businessType(draft.type)
  const { theme } = draft
  const setTheme = (patch: Partial<ShopDraft['theme']>) => update({ theme: { ...theme, ...patch } })

  const accents = Array.from(new Set([type.accent, '#FFB400', '#F472B6', '#22D3EE', '#C9A227', '#22C55E', '#F97316', '#A3E635']))

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    setLogoError(null)
    setBusy(true)
    try {
      update({ logo: await processLogo(file) })
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Rasmni yuklab bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files?.[0])
  }

  return (
    <>
      <h1 className="wz-title">Brendingizni qo‘ying</h1>
      <p className="wz-lead">Logotip, ranglar va shrift — natijani jonli ko‘rinishda darhol ko‘rasiz.</p>

      <div
        className={`wz-logo${dragging ? ' is-drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span
          className="wz-logo__preview"
          style={{
            '--logo-brand': theme.brand,
            '--logo-ink': inkOn(theme.brand),
            '--logo-font': FONT_PAIRS[theme.font].display,
          } as CSSProperties}
        >
          {busy ? <Loader2 className="animate-spin" size={26} /> : draft.logo ? <img src={draft.logo} alt="Logo" /> : initials(draft.name || 'Do‘kon')}
        </span>
        <span className="wz-logo__text">
          <b>Logotip</b>
          <small>
            {draft.logo ? 'Logotip yuklandi. Almashtirish uchun yangisini tanlang.' : 'PNG, JPG yoki SVG. Bo‘lmasa — nomingiz harflaridan belgi yasaymiz.'}
          </small>
          <span className="wz-logo__actions">
            <button type="button" className="wz-chip-btn" onClick={() => fileRef.current?.click()}>
              <ImageUp size={16} /> {draft.logo ? 'Almashtirish' : 'Yuklash'}
            </button>
            {draft.logo && (
              <button type="button" className="wz-chip-btn wz-chip-btn--ghost" onClick={() => update({ logo: null })}>
                <Trash2 size={15} /> O‘chirish
              </button>
            )}
          </span>
          {logoError && <span className="wz-error" style={{ marginTop: 8 }}>{logoError}</span>}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <h2 className="wz-sub">Asosiy rang</h2>
      <div className="wz-colors">
        {Array.from(new Set([type.brand, ...COLOR_PRESETS])).map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Rang ${c}`}
            className={`wz-color${c.toLowerCase() === theme.brand.toLowerCase() ? ' is-active' : ''}`}
            style={{ '--c': c } as CSSProperties}
            onClick={() => setTheme({ brand: c })}
          />
        ))}
        <label className="wz-color wz-color--custom" aria-label="O‘z rangingiz" title="O‘z rangingiz">
          <Pipette size={17} />
          <input type="color" value={theme.brand} onChange={(e) => setTheme({ brand: e.target.value })} />
        </label>
      </div>

      <h2 className="wz-sub">Qo‘shimcha rang</h2>
      <p className="wz-hint" style={{ margin: '-6px 0 12px' }}>Chegirma nishonlari va kategoriya tugmalari uchun</p>
      <div className="wz-colors">
        {accents.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Rang ${c}`}
            className={`wz-color${c.toLowerCase() === theme.accent.toLowerCase() ? ' is-active' : ''}`}
            style={{ '--c': c } as CSSProperties}
            onClick={() => setTheme({ accent: c })}
          />
        ))}
        <label className="wz-color wz-color--custom" aria-label="O‘z rangingiz" title="O‘z rangingiz">
          <Pipette size={17} />
          <input type="color" value={theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} />
        </label>
      </div>

      <h2 className="wz-sub">Shrift uslubi</h2>
      <div className="wz-fonts">
        {(Object.keys(FONT_PAIRS) as FontPairId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`wz-font${theme.font === id ? ' is-active' : ''}`}
            onClick={() => setTheme({ font: id })}
          >
            <b style={{ fontFamily: FONT_PAIRS[id].display }}>Aa</b>
            <small>{FONT_PAIRS[id].label}</small>
          </button>
        ))}
      </div>
    </>
  )
}

/* ── 5. Manzil va hisob ───────────────────────────────────── */

type AccountProps = StepProps & {
  owner: Owner
  setOwner: (patch: Partial<Owner>) => void
  slugState: SlugState
  /** Tasdiqlangan ariza — hisob maydonlari o'rniga mavjud hisob ko'rsatiladi. */
  invite?: InviteInfo
}

export function StepAccount({ draft, update, errors, owner, setOwner, slugState, invite }: AccountProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <h1 className="wz-title">{invite ? 'Manzil va tarif' : 'Manzil va hisob'}</h1>
      <p className="wz-lead">
        {invite
          ? 'Yangi do‘kon manzili va tarifi. Hisobingiz o‘sha — alohida login kerak emas.'
          : 'Do‘koningiz manzili va admin panelga kirish uchun hisob.'}
      </p>

      <div className="wz-grid">
        <Field
          label="Do‘kon manzili"
          full
          error={errors.slug}
          hint={<SlugHint state={slugState} slug={draft.slug} />}
        >
          <span className="wz-slug">
            <span>https://</span>
            <input
              value={draft.slug}
              maxLength={40}
              aria-label="Subdomen"
              placeholder="kafe-nur"
              onChange={(e) => update({ slug: typingSlug(e.target.value) })}
            />
            <span>.{PLATFORM.rootDomain}</span>
          </span>
        </Field>

        {invite ? (
          <div className="wz-owner wz-grid--full">
            <span className="wz-owner__icon"><UserCheck size={20} /></span>
            <span className="wz-owner__text">
              <b>{invite.ownerName || invite.ownerEmail}</b>
              <small>{invite.ownerEmail} — yangi do‘kon shu hisobga qo‘shiladi</small>
            </span>
          </div>
        ) : (
          <>
            <Field label="Ismingiz" error={errors.ownerName}>
              <Input
                icon={User}
                placeholder="Anvar Aliyev"
                maxLength={60}
                autoComplete="name"
                value={owner.name}
                invalid={!!errors.ownerName}
                onChange={(e) => setOwner({ name: e.target.value })}
              />
            </Field>

            <Field label="Telefoningiz" error={errors.ownerPhone}>
              <Input
                icon={Phone}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998 90 123 45 67"
                value={owner.phone}
                invalid={!!errors.ownerPhone}
                onFocus={() => !owner.phone && setOwner({ phone: '+998 ' })}
                onChange={(e) => setOwner({ phone: maskPhone(e.target.value) })}
              />
            </Field>

            <Field label="Email" error={errors.email} hint="Admin panelga shu email bilan kirasiz">
              <Input
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="siz@gmail.com"
                value={owner.email}
                invalid={!!errors.email}
                onChange={(e) => setOwner({ email: e.target.value.trim() })}
              />
            </Field>

            <Field label="Parol" error={errors.password} hint="Kamida 8 ta belgi">
              <Input
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={owner.password}
                invalid={!!errors.password}
                onChange={(e) => setOwner({ password: e.target.value })}
                suffix={
                  <button
                    type="button"
                    className="wz-icon-btn"
                    aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </Field>
          </>
        )}
      </div>

      <h2 className="wz-sub">Tarif <span className="wz-trial">{TRIAL_DAYS} kun bepul</span></h2>
      <div className="wz-plans" role="radiogroup" aria-label="Tarif">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id]
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={draft.plan === id}
              className={`wz-plan${draft.plan === id ? ' is-active' : ''}`}
              onClick={() => update({ plan: id })}
            >
              {plan.popular && <span className="wz-plan__tag">Ommabop</span>}
              {id === 'year' && <span className="wz-plan__tag">−{YEAR_SAVING_PERCENT}%</span>}
              <b>{plan.name}</b>
              <strong>{formatSum(plan.price)}</strong>
              <small>{plan.per}</small>
            </button>
          )
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <Toggle
          icon={Send}
          title={`+ «${ADDON_NAME}» — $${TELEGRAM_ADDON.priceUsd}, bir marta`}
          text="Kuryerlar ilovasi, jonli xarita, buyurtmalar Telegram’ga va do‘kon bot ichida. Oylik to‘lovsiz — xohlasangiz keyin ham ulaysiz."
          on={draft.telegramAddon}
          onChange={(telegramAddon) => update({ telegramAddon })}
        />
      </div>

      <div className="wz-note">
        <Info size={18} />
        <span>
          Hozir hech narsa to‘lamaysiz. Birinchi {TRIAL_DAYS} kun do‘kon bepul va to‘liq ishlaydi — buyurtmalar ham
          qabul qilinadi. Yoqsa, sinov tugagach tanlangan tarifni admin paneldan to‘laysiz.
        </span>
      </div>
    </>
  )
}

/**
 * Yozish davomidagi subdomen: oxiridagi chiziqcha qoladi, aks holda
 * «kafe-nur» ni harfma-harf yozib bo'lmasdi. Yakuniy tozalash
 * (normalizeSlug) tekshiruv va yuborishda.
 */
function typingSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .slice(0, 40)
}

function SlugHint({ state, slug }: { state: SlugState; slug: string }) {
  if (!slug) return <>Lotin harflari, raqam va chiziqcha</>
  switch (state) {
    case 'checking':
      return <span className="wz-hint" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Loader2 size={13} className="animate-spin" /> Tekshirilmoqda...</span>
    case 'free':
      return <span className="wz-ok"><CheckCircle2 size={14} /> Bo‘sh — sizniki bo‘lishi mumkin</span>
    case 'taken':
      return <span className="wz-error"><XCircle size={14} /> Bu nom band, boshqasini tanlang</span>
    case 'invalid':
      return <span className="wz-error"><XCircle size={14} /> Kamida 3 ta belgi, lotin harfi yoki raqam</span>
    default:
      return <>Lotin harflari, raqam va chiziqcha</>
  }
}
