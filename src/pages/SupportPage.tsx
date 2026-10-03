import {
  ChevronDown,
  ChevronUp,
  AtSign,
  MessageCircle,
  Phone,
  MapPin,
  ArrowLeft,
  Headphones,
  Clock,
  CheckCircle2,
  Truck,
  Store,
  Wallet,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { BRAND } from '../config/brand'
import { useI18n, useT } from '../i18n'
import { PageTitle } from '../components/layout/PageTitle'
import { formatPrice } from '../data'
import { PLATFORM } from '../platform/config'
import { businessType } from '../platform/business-types'
import { useShop } from '../shop/context'
import type { ShopConfig } from '../platform/shop'

type Props = {
  onBack: () => void
}

type Faq = { q: string; a: string }

/**
 * Savol-javoblar do'kon SOZLAMALARIDAN yig'iladi — ega hech narsa
 * yozmasa ham yetkazish narxi, minimal summa, to'lov usullari va olib
 * ketish haqidagi javoblar doim to'g'ri va joriy.
 */
function buildFaqs(shop: ShopConfig, ru: boolean): Faq[] {
  const d = shop.delivery
  const list: Faq[] = []

  if (d.enabled) {
    const fee = d.fee > 0 ? formatPrice(d.fee) : ru ? 'бесплатно' : 'bepul'
    const free = d.freeFrom > 0
      ? ru ? ` Заказы от ${formatPrice(d.freeFrom)} доставляем бесплатно.` : ` ${formatPrice(d.freeFrom)}dan yuqori buyurtmalar bepul yetkaziladi.`
      : ''
    list.push(ru
      ? { q: 'Сколько стоит доставка?', a: `Доставка — ${fee}.${free} При изменении статуса заказа вы получите уведомление.` }
      : { q: 'Yetkazib berish qancha turadi?', a: `Yetkazib berish — ${fee}.${free} Buyurtma holati o‘zgarganda sizga bildirishnoma keladi.` })
  }

  if (d.pickup) {
    const where = [shop.contacts.city, shop.contacts.address].filter(Boolean).join(', ')
    list.push(ru
      ? { q: 'Можно забрать заказ самому?', a: `Да, выберите «Самовывоз» при оформлении.${where ? ` Адрес: ${where}.` : ''}` }
      : { q: 'Buyurtmani o‘zim olib ketsam bo‘ladimi?', a: `Ha, rasmiylashtirishda «Olib ketish»ni tanlang.${where ? ` Manzil: ${where}.` : ''}` })
  }

  list.push(d.minOrder > 0
    ? ru
      ? { q: 'Есть ли минимальный заказ?', a: `Да, минимальная сумма заказа — ${formatPrice(d.minOrder)}.` }
      : { q: 'Eng kam buyurtma summasi bormi?', a: `Ha, minimal buyurtma summasi — ${formatPrice(d.minOrder)}.` }
    : ru
      ? { q: 'Есть ли минимальный заказ?', a: 'Нет, можно заказать даже один товар.' }
      : { q: 'Eng kam buyurtma summasi bormi?', a: 'Yo‘q, hatto bitta mahsulotga ham buyurtma berishingiz mumkin.' })

  const methods = [
    shop.payments.cash ? (ru ? 'наличными при получении' : 'naqd pul (olganingizda)') : null,
    shop.payments.card ? (ru ? 'переводом на карту' : 'kartaga o‘tkazma') : null,
  ].filter(Boolean).join(ru ? ' или ' : ' yoki ')
  list.push(ru
    ? { q: 'Как оплатить заказ?', a: `Оплата: ${methods}. При оплате картой магазин проверит перевод и подтвердит заказ.` }
    : { q: 'To‘lov qanday qilinadi?', a: `To‘lov: ${methods}. Karta orqali to‘lasangiz, do‘kon o‘tkazmani tekshirib, buyurtmani tasdiqlaydi.` })

  list.push(ru
    ? { q: 'Как использовать промокод?', a: 'На странице оформления введите код в поле «Промокод» и нажмите «Применить». Скидка добавится автоматически.' }
    : { q: 'Promokod qanday ishlatiladi?', a: 'Buyurtma berish sahifasida «Promokod» maydoniga kodni kiriting va «Qo‘llash»ni bosing. Chegirma avtomatik qo‘shiladi.' })

  list.push(ru
    ? { q: 'Можно ли отменить заказ?', a: 'Да, пока заказ не передан курьеру — в разделе «Мои заказы». После этого свяжитесь с магазином.' }
    : { q: 'Buyurtmani bekor qilsa bo‘ladimi?', a: 'Ha, buyurtma kuryerga berilmaguncha — «Buyurtmalarim» bo‘limidan. Undan keyin do‘kon bilan bog‘laning.' })

  return list
}

function FaqItem({ q, a }: Faq) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="overflow-hidden rounded-2xl border transition-all"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition active:opacity-70"
      >
        <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink)' }}>{q}</span>
        <span className="shrink-0" style={{ color: 'var(--brand)' }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{a}</div>
      )}
    </div>
  )
}

export function SupportPage({ onBack }: Props) {
  const t = useT()
  const { lang } = useI18n()
  const shop = useShop()
  const ru = lang === 'ru'
  const type = businessType(shop.type)
  const faqs = buildFaqs(shop, ru)

  // Faqat to'ldirilgan aloqa kanallari
  const contacts = [
    BRAND.phone && {
      id: 'phone', icon: Phone, label: ru ? 'Телефон' : 'Telefon', value: BRAND.phone, href: BRAND.phoneHref,
      color: 'var(--brand)', bg: 'var(--brand-soft)', action: ru ? 'Позвонить' : 'Qo‘ng‘iroq',
    },
    BRAND.telegram && {
      id: 'telegram', icon: MessageCircle, label: 'Telegram', value: BRAND.telegram, href: BRAND.telegramHref,
      color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', action: ru ? 'Написать' : 'Yozish',
    },
    BRAND.instagram && {
      id: 'instagram', icon: AtSign, label: 'Instagram', value: BRAND.instagram, href: BRAND.instagramHref,
      color: '#e1306c', bg: 'rgba(225,48,108,0.12)', action: ru ? 'Открыть' : 'Ochish',
    },
  ].filter((c): c is Exclude<typeof c, '' | false> => Boolean(c))

  const about = [
    { icon: Sparkles, title: ru ? type.nameRu : type.name, text: shop.tagline || (ru ? 'Онлайн-заказ в пару касаний' : 'Bir necha bosishda onlayn buyurtma') },
    shop.delivery.enabled && {
      icon: Truck,
      title: ru ? 'Доставка' : 'Yetkazib berish',
      text: shop.delivery.fee > 0 ? formatPrice(shop.delivery.fee) : ru ? 'Бесплатно' : 'Bepul',
    },
    shop.delivery.pickup && {
      icon: Store,
      title: ru ? 'Самовывоз' : 'Olib ketish',
      text: [shop.contacts.city, shop.contacts.address].filter(Boolean).join(', ') || shop.name,
    },
    {
      icon: Wallet,
      title: ru ? 'Оплата' : 'To‘lov',
      text: [shop.payments.cash ? (ru ? 'Наличные' : 'Naqd') : null, shop.payments.card ? (ru ? 'Карта' : 'Karta') : null].filter(Boolean).join(' · '),
    },
  ].filter((a): a is Exclude<typeof a, false> => Boolean(a))

  const features = [
    BRAND.workHours && { icon: Clock, text: ru ? `Заказы ${BRAND.workHours}` : `Buyurtmalar ${BRAND.workHours}` },
    { icon: CheckCircle2, text: ru ? 'Быстрый ответ' : 'Tez javob' },
    BRAND.city && { icon: MapPin, text: BRAND.city },
  ].filter((f): f is Exclude<typeof f, '' | false> => Boolean(f))

  return (
    <>
      <header
        className="page-head page-head--solo flex items-center gap-3 px-5 pt-8 pb-5 sm:px-10"
        style={{ animation: 'fadeInUp 0.3s ease' }}
      >
        <button onClick={onBack} className="back-button" aria-label={t('common.back')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <PageTitle className="text-2xl font-extrabold leading-tight" short={ru ? 'Поддержка' : 'Yordam'}>
            {ru ? 'Помощь и поддержка' : "Yordam va qo'llab-quvvatlash"}
          </PageTitle>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>
            {ru ? 'Мы всегда рядом' : 'Biz doim siz bilan'}
          </p>
        </div>
      </header>

      {/* Brend rangidagi karta */}
      <section className="px-5 sm:px-10" style={{ animation: 'fadeInUp 0.35s ease 0.05s both' }}>
        <div
          className="relative overflow-hidden rounded-3xl p-6"
          style={{ background: 'linear-gradient(135deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 52%, black) 100%)' }}
        >
          <div className="absolute -right-8 -top-8 size-32 rounded-full opacity-20" style={{ background: 'white' }} />
          <div className="absolute -bottom-6 right-10 size-20 rounded-full opacity-10" style={{ background: 'white' }} />

          <div className="relative z-10">
            <div className="mb-4 inline-grid size-14 place-items-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Headphones size={28} color="white" />
            </div>
            <h2 className="wordmark text-xl leading-tight text-white">
              {ru ? `Служба заботы ${BRAND.name}` : `${BRAND.name} mijozlar xizmati`}
            </h2>
            <p className="mt-1.5 text-sm text-white opacity-80">
              {ru ? 'Свяжитесь с нами любым удобным способом' : "Qulay usul orqali biz bilan bog'laning"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {features.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                >
                  <Icon size={12} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {contacts.length > 0 && (
        <section className="px-5 pt-6 sm:px-10" style={{ animation: 'fadeInUp 0.4s ease 0.1s both' }}>
          <h2 className="section-title mb-4">{ru ? 'Контакты' : "Bog'lanish"}</h2>
          <div className="flex flex-col gap-3">
            {contacts.map(({ id, icon: Icon, label, value, href, color, bg, action }) => (
              <a
                key={id}
                href={href}
                target={id !== 'phone' ? '_blank' : undefined}
                rel="noreferrer"
                className="flex items-center gap-4 rounded-2xl border p-4 transition hover:opacity-90 active:scale-[0.98]"
                style={{ borderColor: 'var(--line)', background: 'var(--surface)', textDecoration: 'none' }}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: bg, color }}>
                  <Icon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</p>
                  <p className="mt-0.5 truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>{value}</p>
                </div>
                <span className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: bg, color }}>
                  {action}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Do'kon haqida — sozlamalardan */}
      <section className="px-5 pt-7 sm:px-10" style={{ animation: 'fadeInUp 0.4s ease 0.12s both' }}>
        <h2 className="section-title mb-4">{ru ? `О ${BRAND.name}` : `${BRAND.name} haqida`}</h2>
        <div className="rounded-2xl border p-2" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          {about.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                <Icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pt-7 pb-32 sm:px-10" style={{ animation: 'fadeInUp 0.4s ease 0.15s both' }}>
        <h2 className="section-title mb-4">{ru ? 'Часто задаваемые вопросы' : "Ko'p so'raladigan savollar"}</h2>
        <div className="flex flex-col gap-3">
          {faqs.map((item) => <FaqItem key={item.q} q={item.q} a={item.a} />)}
        </div>

        {/* Sayt qayerda yaratilgani — kichik, xalaqit bermaydigan */}
        <a
          href={`https://${PLATFORM.rootDomain}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 block rounded-2xl border p-4 text-center text-xs leading-relaxed"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {ru ? 'Сайт создан на платформе ' : 'Sayt '}
          <b style={{ color: 'var(--ink-2)' }}>{PLATFORM.name}</b>
          {ru ? '' : ' platformasida yaratilgan'}
        </a>
      </section>
    </>
  )
}
