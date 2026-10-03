import { CreditCard, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PLANS, PLAN_ORDER, formatSum } from '../../platform/config'
import { PAYWALL_EVENT } from '../lib/api'
import { useAdminShop } from '../lib/shop'
import { Modal } from './Modal'

/**
 * «To'lovdan keyin ochiladi» oynasi.
 *
 * Ko'rish rejimidagi do'konda (to'lanmagan yoki muddati tugagan)
 * har qanday o'zgartirish serverda 402 bilan to'xtaydi. Admin API bu
 * javobni bitta hodisaga aylantiradi (lib/api.ts → PAYWALL_EVENT), bu
 * oyna esa uni tinglaydi — sahifalar alohida hech narsa qilmaydi.
 */
export function Paywall({ owner, onPay }: { owner: boolean; onPay: () => void }) {
  const [message, setMessage] = useState<string | null>(null)
  const shop = useAdminShop()

  useEffect(() => {
    const onPaywall = (event: Event) => setMessage((event as CustomEvent<string>).detail || '')
    window.addEventListener(PAYWALL_EVENT, onPaywall)
    return () => window.removeEventListener(PAYWALL_EVENT, onPaywall)
  }, [])

  if (message === null) return null
  const close = () => setMessage(null)

  return (
    <Modal
      title="To‘lovdan keyin ochiladi"
      onClose={close}
      footer={
        owner ? (
          <>
            <button className="adm-btn adm-btn--ghost flex-1" onClick={close}>Keyinroq</button>
            <button className="adm-btn adm-btn--primary flex-1" onClick={() => { close(); onPay() }}>
              <CreditCard size={16} /> To‘lov qilish
            </button>
          </>
        ) : (
          <button className="adm-btn adm-btn--primary flex-1" onClick={close}>Tushunarli</button>
        )
      }
    >
      <div className="grid justify-items-center gap-3 py-2 text-center">
        <span className="grid size-16 place-items-center rounded-2xl" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          <Lock size={28} />
        </span>
        <p className="max-w-sm text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          {owner
            ? (shop.trial ? 'Bepul sinov muddati tugadi. ' : 'Do‘kon hozir ko‘rish rejimida. ') + 'Tarifni faollashtirsangiz, mahsulot qo‘shish, buyurtma qabul qilish va boshqa hamma amallar ochiladi.'
            : message || 'Do‘kon hozir ko‘rish rejimida. Do‘kon egasi to‘lov qilgach, bu amal ochiladi.'}
        </p>
        {owner && (
          <div className="mt-1 grid w-full gap-2 sm:grid-cols-3">
            {PLAN_ORDER.map((id) => (
              <div key={id} className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{PLANS[id].name}</p>
                <p className="mt-0.5 text-sm font-extrabold">{formatSum(PLANS[id].price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
