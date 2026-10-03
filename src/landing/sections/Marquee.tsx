import { Sparkle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { BUSINESS_TYPES } from '../../platform/business-types'
import { typeIcon } from '../../platform/business-icons'

/** Biznes turlari lentasi — cheksiz aylanadi (ro'yxat ikki marta). */
export function Marquee() {
  const items = BUSINESS_TYPES.filter((t) => t.id !== 'other')
  const row = [...items, ...items]
  return (
    // Lenta qiya turadi va chetdan chiqadi — o'rab turgan blok kesadi,
    // aks holda telefonda sahifa yon tomonga suriladi
    <div className="lp-marquee-wrap">
      <div className="lp-marquee" aria-label="Qo‘llab-quvvatlanadigan bizneslar">
        <div className="lp-marquee__track">
          {row.map((type, i) => {
            const Icon = typeIcon(type.id)
            return (
              <span className="lp-marquee__item" key={`${type.id}-${i}`} aria-hidden={i >= items.length}>
                <span style={{ '--mq-color': type.brand } as CSSProperties}>
                  <Icon size={17} />
                </span>
                {type.name}
                <Sparkle size={14} className="lp-marquee__star" />
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
