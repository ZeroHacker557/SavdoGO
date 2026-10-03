import { Store, WifiOff, Wrench, Lock } from 'lucide-react'
import { PLATFORM } from '../platform/config'

export type UnavailableReason = 'missing' | 'blocked' | 'config' | 'error'

const TEXT: Record<UnavailableReason, { icon: typeof Store; title: string; text: string; ru: string }> = {
  missing: {
    icon: Store,
    title: 'Bunday do‘kon topilmadi',
    text: 'Manzil noto‘g‘ri yozilgan yoki do‘kon o‘chirilgan bo‘lishi mumkin.',
    ru: 'Такой магазин не найден',
  },
  blocked: {
    icon: Lock,
    title: 'Do‘kon vaqtincha yopiq',
    text: 'Tez orada qaytamiz. Savollar bo‘lsa, do‘kon bilan bog‘laning.',
    ru: 'Магазин временно закрыт',
  },
  config: {
    icon: Wrench,
    title: 'Sayt hali sozlanmagan',
    text: 'Firebase konfiguratsiyasi to‘ldirilmagan: src/config/firebase.ts (yo‘riqnoma — README.md).',
    ru: 'Сайт ещё не настроен',
  },
  error: {
    icon: WifiOff,
    title: 'Do‘konni ochib bo‘lmadi',
    text: 'Internet aloqasini tekshirib, sahifani yangilang.',
    ru: 'Не удалось открыть магазин',
  },
}

/** Do'kon ochilmaganda — sayt bo'sh ekranda qolmasin. */
export function ShopUnavailable({ reason }: { reason: UnavailableReason }) {
  const { icon: Icon, title, text, ru } = TEXT[reason]
  return (
    <main className="grid min-h-dvh place-items-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm text-center" style={{ animation: 'fadeInUp 0.4s ease' }}>
        <span
          className="mx-auto grid size-20 place-items-center rounded-3xl"
          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
        >
          <Icon size={36} />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold" style={{ color: 'var(--ink)' }}>{title}</h1>
        <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--faint)' }}>{ru}</p>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{text}</p>
        {reason === 'error' ? (
          <button className="btn-primary mx-auto mt-7 px-6 py-3" onClick={() => location.reload()}>
            Qayta urinish
          </button>
        ) : (
          <a className="btn-primary mx-auto mt-7 inline-flex px-6 py-3" href={`https://${PLATFORM.rootDomain}`}>
            {PLATFORM.name} — o‘z do‘koningizni oching
          </a>
        )}
      </div>
    </main>
  )
}
