import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Check, Copy, ExternalLink, Eye, LayoutDashboard, Loader2, PartyPopper, X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { businessType, type BusinessTypeId } from '../../platform/business-types'
import {
  PLANS, PLATFORM, RESERVED_SLUGS, TRIAL_DAYS, formatSum, normalizeSlug, shopLink, slugFromName,
} from '../../platform/config'
import { ShopPreview } from '../../platform/preview/ShopPreview'
import { emptyDraft, loadDraft, saveDraft, clearDraft, type ShopDraft } from '../../platform/shop'
import { isApiMissing, platformApi, PlatformApiError } from '../../platform/api'
import { rememberOwnerShop } from '../../platform/owner-marker'
import { NEW_SHOP_URL, type InviteInfo } from './invite'
import { openExternal, type TelegramOwner } from './telegram'
import { Logo } from '../components/Logo'
import { goTo } from '../router'
import { isEmailValid, isPhoneValid } from './format'
import { StepAccount, StepDesign, StepInfo, StepService, StepType, type Owner, type SlugState } from './steps'
import './wizard.css'

const STEPS = ['Biznes turi', 'Ma’lumotlar', 'Yetkazish va to‘lov', 'Dizayn', 'Hisob'] as const

type Errors = Record<string, string | null>

function validate(step: number, draft: ShopDraft, owner: Owner, slugState: SlugState, invite: boolean, telegram: boolean): Errors {
  const e: Errors = {}
  if (step === 1) {
    if (draft.name.trim().length < 2) e.name = 'Biznes nomini kiriting'
    if (!isPhoneValid(draft.contacts.phone)) e.phone = 'Telefon raqamni to‘liq kiriting'
    if (!draft.contacts.city.trim()) e.city = 'Shaharni kiriting'
  }
  if (step === 2) {
    if (!draft.delivery.enabled && !draft.delivery.pickup) e.delivery = 'Yetkazish yoki olib ketishdan kamida bittasini yoqing'
    if (!draft.payments.cash && !draft.payments.card) e.payments = 'Kamida bitta to‘lov usulini yoqing'
    if (draft.payments.card && draft.payments.cardNumber.replace(/\D/g, '').length !== 16) {
      e.cardNumber = 'Karta raqami 16 ta raqamdan iborat'
    }
  }
  if (step === 4) {
    const slug = normalizeSlug(draft.slug)
    if (slug.length < 3 || RESERVED_SLUGS.has(slug)) e.slug = 'Kamida 3 ta belgi — lotin harfi, raqam yoki chiziqcha'
    else if (slugState === 'taken') e.slug = 'Bu manzil band — boshqasini tanlang'
    // Tasdiqlangan ariza — do'kon mavjud hisobga qo'shiladi, hisob ma'lumoti so'ralmaydi
    if (invite) return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
    if (owner.name.trim().length < 2) e.ownerName = 'Ismingizni kiriting'
    // Telegram rejimi: telefonni Telegram tasdiqlagan, email/parol yo'q
    if (telegram) return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
    if (!isPhoneValid(owner.phone)) e.ownerPhone = 'Telefon raqamni to‘liq kiriting'
    if (!isEmailValid(owner.email)) e.email = 'Email manzili noto‘g‘ri'
    if (owner.password.length < 8) e.password = 'Parol kamida 8 ta belgidan iborat bo‘lsin'
  }
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
}

/** Arizadagi nom, tur va manzil — forma shular bilan to'lib ochiladi. */
function inviteDraft(invite: InviteInfo): ShopDraft {
  return { ...emptyDraft(businessType(invite.type).id), name: invite.name, slug: invite.slug }
}

/**
 * `telegram` — forma SavdoGO botidan ochilgan (telegram.ts): ism va
 * tasdiqlangan telefon tayyor, email/parol so'ralmaydi.
 */
export function Wizard({ invite, telegram }: { invite?: InviteInfo; telegram?: TelegramOwner }) {
  const [draft, setDraft] = useState<ShopDraft>(() => (invite ? inviteDraft(invite) : loadDraft() ?? emptyDraft()))
  const [owner, setOwnerState] = useState<Owner>({ name: telegram?.name ?? '', email: '', password: '', phone: telegram?.phone ?? '' })
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<{ text: string; offline: boolean; ownerExists?: boolean } | null>(null)
  const [created, setCreated] = useState<{ slug: string; signedIn: boolean } | null>(null)
  const [sheet, setSheet] = useState(false)
  /** Dizayn qo'lda o'zgartirilganmi — tur almashganda ranglar ustidan yozilmasin. */
  const designTouched = useRef(false)

  const update = useCallback((patch: Partial<ShopDraft>) => {
    if (patch.theme || patch.logo !== undefined) designTouched.current = true
    setDraft((d) => ({ ...d, ...patch }))
  }, [])
  const setOwner = useCallback((patch: Partial<Owner>) => setOwnerState((o) => ({ ...o, ...patch })), [])

  // Qoralama saqlanadi — sahifa yangilansa yo'qolmaydi, «oldindan ko'rish» ham shundan o'qiydi
  useEffect(() => {
    if (created) return
    const timer = window.setTimeout(() => saveDraft(draft), 300)
    return () => window.clearTimeout(timer)
  }, [draft, created])

  // Tur almashganda — agar ega o'zi o'zgartirmagan bo'lsa — dizayn va yetkazish shartlari ham moslanadi
  const pickType = (id: BusinessTypeId) => {
    setDraft((d) => {
      const prev = businessType(d.type)
      const next = businessType(id)
      const themeIsDefault =
        !designTouched.current ||
        (d.theme.brand === prev.brand && d.theme.accent === prev.accent && d.theme.font === prev.font)
      const deliveryIsDefault =
        d.delivery.fee === prev.delivery.fee &&
        d.delivery.freeFrom === prev.delivery.freeFrom &&
        d.delivery.minOrder === prev.delivery.minOrder
      return {
        ...d,
        type: id,
        theme: themeIsDefault ? { brand: next.brand, accent: next.accent, font: next.font } : d.theme,
        delivery: deliveryIsDefault ? { ...d.delivery, ...next.delivery } : d.delivery,
      }
    })
  }

  /*
   * Subdomen holati. Bo'sh / qisqa / band qilingan nom — shu yerda
   * hisoblanadi; serverdan kelgan javob esa AYNAN shu nom uchun
   * saqlanadi — nom o'zgarsa eski javob avtomatik «tekshirilmoqda»ga
   * qaytadi.
   */
  const [remoteSlug, setRemoteSlug] = useState<{ slug: string; state: SlugState } | null>(null)
  const typedSlug = normalizeSlug(draft.slug)
  const slugState: SlugState = !typedSlug
    ? 'idle'
    : typedSlug.length < 3 || RESERVED_SLUGS.has(typedSlug)
      ? 'invalid'
      : remoteSlug?.slug === typedSlug ? remoteSlug.state : 'checking'
  const setSlugState = (state: SlugState) => setRemoteSlug({ slug: typedSlug, state })

  // Bandlik — yozish to'xtagach tekshiriladi (natija callback'da yoziladi)
  useEffect(() => {
    if (step !== 4 || slugState !== 'checking') return
    const slug = typedSlug
    let cancelled = false
    const timer = window.setTimeout(async () => {
      let state: SlugState
      try {
        const { available } = await platformApi<{ available: boolean }>('slug.check', { slug })
        state = available ? 'free' : 'taken'
      } catch {
        // Server ulanmagan — yaratishda baribir tekshiriladi
        state = 'unknown'
      }
      if (!cancelled) setRemoteSlug({ slug, state })
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [typedSlug, step, slugState])

  const go = (next: number) => {
    // Oxirgi qadamga o'tishda — nomdan subdomen va biznes telefonidan eganing telefoni
    if (next === 4) {
      setDraft((d) => (d.slug ? d : { ...d, slug: slugFromName(d.name) }))
      if (!invite) setOwnerState((o) => (o.phone ? o : { ...o, phone: draft.contacts.phone }))
    }
    setDirection(next > step ? 'fwd' : 'back')
    setStep(next)
    setErrors({})
    setSubmitError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = async (event?: FormEvent) => {
    event?.preventDefault()
    const found = validate(step, draft, owner, slugState, Boolean(invite), Boolean(telegram))
    setErrors(found)
    if (Object.keys(found).length) return
    if (step < STEPS.length - 1) {
      go(step + 1)
      return
    }
    await submit()
  }

  const submit = async () => {
    const slug = normalizeSlug(draft.slug)
    setSubmitting(true)
    setSubmitError(null)
    try {
      let shopId: string
      let signedIn: boolean
      if (invite) {
        // Ikkinchi do'kon — egasining hozirgi seansi bilan, yangi hisob ochilmaydi
        const { currentStaffSession, refreshStaffToken } = await import('./session')
        const session = await currentStaffSession()
        if (!session) {
          throw new PlatformApiError('Seans tugagan — admin panelga qayta kiring va havolani yana oching.', 401, 'login-required')
        }
        const result = await platformApi<{ shopId: string }>(
          'shop.create',
          { draft: { ...draft, slug }, invite: invite.code },
          session.token,
        )
        // Token'dagi faol do'kon yangilansin — admin panel yangi do'konni ochadi
        await refreshStaffToken()
        shopId = result.shopId
        signedIn = true
      } else if (telegram) {
        // SavdoGO botidan: kim ekanligi — initData, telefon — botdagi kontakt
        const result = await platformApi<{ shopId: string }>('shop.create', {
          draft: { ...draft, slug },
          owner: { name: owner.name.trim() },
          telegram: telegram.initData,
        })
        shopId = result.shopId
        signedIn = false
      } else {
        const result = await platformApi<{ shopId: string }>('shop.create', {
          draft: { ...draft, slug },
          owner: { ...owner, email: owner.email.trim().toLowerCase(), name: owner.name.trim() },
        })
        const { signInOwner } = await import('./session')
        signedIn = await signInOwner(owner.email.trim().toLowerCase(), owner.password)
        shopId = result.shopId
      }
      // Shu qurilmada do'kon ochildi — /start qayta ochilsa ariza yo'li ko'rsatiladi (Gate.tsx)
      rememberOwnerShop(shopId, draft.name)
      clearDraft()
      setCreated({ slug: shopId, signedIn })
      setStep(STEPS.length)
      window.scrollTo({ top: 0 })
    } catch (error) {
      if (error instanceof PlatformApiError && error.code === 'slug-taken') {
        setSlugState('taken')
        setErrors({ slug: 'Bu manzil hozirgina band qilindi — boshqasini tanlang' })
      }
      setSubmitError({
        text: error instanceof Error ? error.message : 'Do‘konni yaratib bo‘lmadi. Qayta urinib ko‘ring.',
        offline: isApiMissing(error),
        // Bu telefon/email bilan do'kon bor — ariza yo'li
        ownerExists: error instanceof PlatformApiError && error.code === 'owner-exists',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openPreview = () => {
    saveDraft(draft)
    window.open('/?preview', '_blank', 'noopener')
  }

  const type = businessType(draft.type)
  const slugShown = normalizeSlug(draft.slug) || slugFromName(draft.name) || 'nomingiz'
  const sideStyle = { '--wz-brand': draft.theme.brand, '--wz-accent': draft.theme.accent } as CSSProperties

  const preview = (
    <ShopPreview
      name={draft.name}
      tagline={draft.tagline}
      logo={draft.logo}
      theme={draft.theme}
      type={draft.type}
      swapKey={draft.type}
    />
  )

  if (created) {
    return (
      <div className="wz" style={sideStyle}>
        <div className="wz-main">
          <div className="wz-top"><Logo /></div>
          <div className="wz-body">
            <Done slug={created.slug} draft={draft} signedIn={created.signedIn} invite={Boolean(invite)} telegram={Boolean(telegram)} />
          </div>
        </div>
        <aside className="wz-side" aria-label="Do‘kon ko‘rinishi">
          <span className="wz-side__label"><i /> Do‘koningiz ochildi</span>
          {preview}
          <span className="wz-side__url">https://<b>{created.slug}</b>.{PLATFORM.rootDomain}</span>
        </aside>
      </div>
    )
  }

  return (
    <div className="wz" style={sideStyle}>
      <div className="wz-main">
        <div className="wz-top">
          <button className="lp-logo" style={{ border: 0, background: 'none', padding: 0 }} onClick={() => goTo('home')} aria-label="Bosh sahifaga">
            <Logo />
          </button>
          <button className="wz-top__close" aria-label="Yopish" onClick={() => goTo('home')}>
            <X size={20} />
          </button>
        </div>

        <div className="wz-progress" aria-label={`Qadam ${step + 1} / ${STEPS.length}`}>
          <div className="wz-progress__steps">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`wz-progress__step${i < step ? ' is-done' : ''}${i === step ? ' is-current' : ''}`}
              >
                <i />
              </span>
            ))}
          </div>
          <div className="wz-progress__label">
            <span>Qadam {step + 1} / {STEPS.length}</span>
            <b>{STEPS[step]}</b>
          </div>
        </div>

        {invite && (
          <div className="wz-invite">
            <BadgeCheck size={18} />
            <span>
              Arizangiz tasdiqlangan — yangi do‘kon <b>{invite.ownerEmail}</b> hisobingizga qo‘shiladi.
            </span>
          </div>
        )}

        <form className="wz-body" onSubmit={next} noValidate>
          <div className={`wz-step${direction === 'back' ? ' is-back' : ''}`} key={step}>
            {step === 0 && <StepType draft={draft} onPick={pickType} />}
            {step === 1 && <StepInfo draft={draft} update={update} errors={errors} />}
            {step === 2 && <StepService draft={draft} update={update} errors={errors} />}
            {step === 3 && <StepDesign draft={draft} update={update} errors={errors} />}
            {step === 4 && (
              <StepAccount
                draft={draft}
                update={update}
                errors={errors}
                owner={owner}
                setOwner={setOwner}
                slugState={slugState}
                invite={invite}
                telegram={Boolean(telegram)}
              />
            )}
          </div>

          {submitError && (
            <div className="wz-alert" role="alert">
              <AlertTriangle size={18} />
              <span>
                {submitError.text}
                {submitError.offline && (
                  <>
                    <br />
                    <button
                      type="button"
                      className="wz-chip-btn"
                      style={{ marginTop: 10 }}
                      onClick={openPreview}
                    >
                      <Eye size={15} /> Hozircha oldindan ko‘rish
                    </button>
                  </>
                )}
                {submitError.ownerExists && (
                  <>
                    <br />
                    <a className="wz-chip-btn" style={{ marginTop: 10 }} href={NEW_SHOP_URL}>
                      <LayoutDashboard size={15} /> Admin panelga kirish va ariza qoldirish
                    </a>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="wz-foot">
            <div className="wz-foot__inner">
              {step > 0 && (
                <button type="button" className="lp-btn lp-btn--ghost" onClick={() => go(step - 1)}>
                  <ArrowLeft size={18} /> <span className="wz-hide-sm">Orqaga</span>
                </button>
              )}
              <button type="button" className="lp-btn lp-btn--ghost wz-preview-btn" onClick={() => setSheet(true)}>
                <Eye size={18} />
              </button>
              <button type="submit" className="lp-btn lp-btn--primary" disabled={submitting}>
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Yaratilmoqda...</>
                ) : step === STEPS.length - 1 ? (
                  <>Do‘konni yaratish <Check size={18} /></>
                ) : (
                  <>Davom etish <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <aside className="wz-side" aria-label="Jonli ko‘rinish">
        <span className="wz-side__label"><i /> Jonli ko‘rinish · {type.name}</span>
        {preview}
        <span className="wz-side__url">https://<b>{slugShown}</b>.{PLATFORM.rootDomain}</span>
      </aside>

      {sheet && (
        <div className="wz-sheet" role="dialog" aria-modal="true" aria-label="Do‘kon ko‘rinishi" onClick={() => setSheet(false)}>
          <button className="lp-nav__burger wz-sheet__close" aria-label="Yopish" onClick={() => setSheet(false)}>
            <X size={22} />
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ scale: String(sheetScale()) }}>{preview}</div>
        </div>
      )}
    </div>
  )
}

/** Mobil oynadagi telefon ekranga sig'sin (telefon 290×600). */
function sheetScale(): number {
  return Math.min(1, (window.innerHeight - 90) / 600, (window.innerWidth - 32) / 290)
}

/* ── Yakun ────────────────────────────────────────────────── */

function makePieces(colors: string[]) {
  return Array.from({ length: 90 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    t: 2.2 + Math.random() * 1.8,
    dx: (Math.random() - 0.5) * 240,
    rot: 360 + Math.random() * 720,
    color: colors[i % colors.length],
    w: 6 + Math.random() * 6,
  }))
}

function Confetti({ colors }: { colors: string[] }) {
  // Bir marta yasaladi — qayta chizilganda qog'ozchalar sakramasin
  const [pieces] = useState(() => makePieces(colors))
  return (
    <div className="wz-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.w,
            background: p.color,
            '--delay': `${p.delay}s`,
            '--t': `${p.t}s`,
            '--dx': `${p.dx}px`,
            '--rot': `${p.rot}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

function Done({ slug, draft, signedIn, invite, telegram }: { slug: string; draft: ShopDraft; signedIn: boolean; invite: boolean; telegram: boolean }) {
  const [copied, setCopied] = useState(false)
  const [burst, setBurst] = useState(true)
  const link = shopLink(slug)
  const plan = PLANS[draft.plan]

  useEffect(() => {
    const timer = window.setTimeout(() => setBurst(false), 4500)
    return () => window.clearTimeout(timer)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${slug}.${PLATFORM.rootDomain}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard yopiq */
    }
  }

  return (
    <div className="wz-done wz-step">
      {burst && <Confetti colors={[draft.theme.brand, draft.theme.accent, '#c6f432', '#5b4cf5', '#ffffff']} />}
      <span className="wz-done__icon"><PartyPopper size={44} /></span>
      <h1 className="wz-title">Tabriklaymiz! «{draft.name}» tayyor</h1>
      <p className="wz-lead">
        Do‘koningiz ochildi va <b>{TRIAL_DAYS} kun bepul</b> to‘liq ishlaydi: mahsulot qo‘shing, buyurtma qabul qiling,
        hamma bo‘limdan foydalaning. Namuna mahsulotlarni o‘zingiznikiga almashtirishni unutmang.
      </p>

      <div className="wz-done__url">
        <span>https://<b>{slug}</b>.{PLATFORM.rootDomain}</span>
        <button type="button" onClick={copy} aria-label="Nusxa olish">
          {copied ? <Check size={17} /> : <Copy size={17} />}
        </button>
      </div>

      {telegram ? (
        // Telegram ichida: panel shu oynada parolsiz ochiladi, sayt — brauzerda
        <div className="wz-done__actions">
          <a className="lp-btn lp-btn--primary" href="/admin">
            <LayoutDashboard size={18} /> Boshqaruv paneli
          </a>
          <button type="button" className="lp-btn lp-btn--ghost" onClick={() => openExternal(`https://${slug}.${PLATFORM.rootDomain}`)}>
            Do‘konni ochish <ExternalLink size={18} />
          </button>
        </div>
      ) : (
        <div className="wz-done__actions">
          <a className="lp-btn lp-btn--primary" href={link} target="_blank" rel="noreferrer">
            Do‘konni ochish <ExternalLink size={18} />
          </a>
          <a className="lp-btn lp-btn--ghost" href="/admin">
            <LayoutDashboard size={18} /> Admin panel
          </a>
        </div>
      )}
      {telegram && (
        <p className="wz-hint" style={{ marginTop: 12 }}>
          Havola va boshqaruv tugmalari SavdoGO botiga ham yuborildi. Panelga Telegram orqali parolsiz kirasiz.
        </p>
      )}
      {!signedIn && !telegram && (
        <p className="wz-hint" style={{ marginTop: 12 }}>
          Admin panelga ro‘yxatdan o‘tgan email va parolingiz bilan kirasiz.
        </p>
      )}
      {invite && (
        <p className="wz-hint" style={{ marginTop: 12 }}>
          Admin panel endi shu do‘konni ochadi. Do‘konlar orasida chap menyudagi do‘kon nomini bosib almashasiz.
        </p>
      )}

      <div className="wz-pay">
        <h3>{TRIAL_DAYS} kundan keyin</h3>
        <p>
          Sinov tugagach tanlagan tarifingiz to‘lanadi: admin paneldagi «Obuna va to‘lov» bo‘limida kartaga o‘tkazma qilib,
          chekni yuklaysiz. Oldinroq to‘lasangiz, sinovning qolgan kunlari ham saqlanadi.
        </p>
        <div className="wz-pay__row">
          <span>Tarif: {plan.name}</span>
          <b>{formatSum(plan.price)}</b>
        </div>
      </div>
    </div>
  )
}
