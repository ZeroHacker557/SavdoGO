import { ArrowRight, Check, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ADDON_BENEFITS, ADDON_NAME } from '../../platform/addon'
import { ADDON_EVENT } from '../lib/api'
import { Modal } from './Modal'

function openAddonPage() {
  window.location.hash = '#/telegram'
}

/**
 * Kuryer imkoniyati turadigan joyda — botni ulash haqida qisqa taklif.
 * `compact` — bitta qator (buyurtma oynasi kabi tor joylar uchun).
 */
export function AddonTeaser({ title, compact = false }: { title: string; compact?: boolean }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={openAddonPage}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs"
        style={{ background: 'var(--brand-soft)', color: 'var(--ink-2)' }}
      >
        <Send size={14} className="shrink-0" style={{ color: '#229ED9' }} />
        <span className="min-w-0 flex-1">{title} — Telegram botingizni <b>bepul</b> ulang</span>
        <ArrowRight size={14} className="shrink-0" style={{ color: 'var(--brand)' }} />
      </button>
    )
  }
  return (
    <div className="addon-teaser">
      <span className="addon-teaser__icon"><Send size={20} /></span>
      <div className="min-w-[180px] flex-1">
        <b className="block text-sm">{title}</b>
        <span className="block text-xs" style={{ color: 'var(--muted)' }}>
          Do‘koningizning Telegram boti bilan ochiladi: kuryerlar ilovasi, jonli xarita, buyurtmalar Telegram’ga.
          Botni ulash bepul — 2 daqiqa.
        </span>
      </div>
      <button type="button" className="adm-btn adm-btn--primary shrink-0" onClick={openAddonPage}>
        Botni ulash <ArrowRight size={15} />
      </button>
    </div>
  )
}

/**
 * Server «addon-required» qaytarganda (bot ulanmagan do'konda kuryer amali) —
 * lib/api.ts hodisasini tinglaydi, xuddi to'lov oynasi kabi.
 */
export function AddonModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onEvent = () => setOpen(true)
    window.addEventListener(ADDON_EVENT, onEvent)
    return () => window.removeEventListener(ADDON_EVENT, onEvent)
  }, [])

  if (!open) return null
  const close = () => setOpen(false)

  return (
    <Modal
      title={`«${ADDON_NAME}» uchun bot kerak`}
      onClose={close}
      footer={
        <>
          <button className="adm-btn adm-btn--ghost flex-1" onClick={close}>Keyinroq</button>
          <button className="adm-btn adm-btn--primary flex-1" onClick={() => { close(); openAddonPage() }}>
            Botni ulash <ArrowRight size={16} />
          </button>
        </>
      }
    >
      <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
        Bu imkoniyat do‘koningizning Telegram boti bilan ishlaydi. Botni o‘zingiz ulaysiz — bepul, 2 daqiqada:
      </p>
      <ul className="mt-3 grid gap-2">
        {ADDON_BENEFITS.slice(0, 4).map((benefit) => (
          <li key={benefit.title} className="flex items-start gap-2 text-sm">
            <Check size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
            <span><b>{benefit.title}.</b> <span style={{ color: 'var(--muted)' }}>{benefit.text}</span></span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
