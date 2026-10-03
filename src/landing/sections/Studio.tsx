import { ArrowRight, Pipette } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import {
  BUSINESS_TYPES, COLOR_PRESETS, FONT_PAIRS, businessType, type BusinessTypeId, type FontPairId,
} from '../../platform/business-types'
import { typeIcon } from '../../platform/business-icons'
import { ShopPreview } from '../../platform/preview/ShopPreview'
import { emptyDraft, loadDraft, saveDraft } from '../../platform/shop'
import { goTo } from '../router'

/**
 * «O'zingiz sinab ko'ring» — landingning o'zida rang, shrift va biznes
 * turini tanlab, telefondagi do'kon qanday o'zgarishini ko'rish.
 * «Shu dizayn bilan boshlash» tanlovni ro'yxatdan o'tish formasiga
 * olib o'tadi (qoralama localStorage'da).
 */
export function Studio() {
  const [type, setType] = useState<BusinessTypeId>('restaurant')
  const [brand, setBrand] = useState(businessType('restaurant').brand)
  const [font, setFont] = useState<FontPairId>(businessType('restaurant').font)
  const [name, setName] = useState('')
  const preset = businessType(type)

  const chooseType = (id: BusinessTypeId) => {
    const next = businessType(id)
    setType(id)
    setBrand(next.brand)
    setFont(next.font)
  }

  const start = () => {
    const base = loadDraft() ?? emptyDraft(type)
    saveDraft({
      ...base,
      ...(base.type !== type ? emptyDraft(type) : {}),
      name: name.trim() || base.name,
      type,
      theme: { brand, accent: preset.accent, font },
    })
    goTo('start')
  }

  return (
    <section className="lp-section lp-section--tight" id="studio">
      <div className="lp-container">
        <div className="lp-studio" style={{ '--studio-brand': brand } as CSSProperties} data-reveal="zoom">
          <div className="lp-studio__controls">
            <span className="lp-kicker">O‘zingiz sinab ko‘ring</span>
            <h2 className="lp-h2">Rangni bosing — do‘kon shu zahoti o‘zgaradi</h2>
            <p className="lp-sub">
              Formadagi dizayn qadami aynan shunday ishlaydi. Tanlang, o‘zgartiring, yoqqanini qoldiring.
            </p>

            <span className="lp-studio__label">Biznes turi</span>
            <div className="lp-studio__types">
              {BUSINESS_TYPES.filter((t) => t.id !== 'other').map((t) => {
                const Icon = typeIcon(t.id)
                return (
                  <button
                    key={t.id}
                    className={`lp-pill${t.id === type ? ' is-active' : ''}`}
                    onClick={() => chooseType(t.id)}
                  >
                    <Icon size={15} /> {t.name}
                  </button>
                )
              })}
            </div>

            <span className="lp-studio__label">Brend rangi</span>
            <div className="lp-swatches">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  aria-label={`Rang ${c}`}
                  className={`lp-swatch${c.toLowerCase() === brand.toLowerCase() ? ' is-active' : ''}`}
                  style={{ '--c': c } as CSSProperties}
                  onClick={() => setBrand(c)}
                />
              ))}
              <label className="lp-swatch lp-swatch--custom" aria-label="O‘z rangingiz">
                <Pipette size={16} />
                <input type="color" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
            </div>

            <span className="lp-studio__label">Shrift uslubi</span>
            <div className="lp-fonts">
              {(Object.keys(FONT_PAIRS) as FontPairId[]).map((id) => (
                <button
                  key={id}
                  className={`lp-font${id === font ? ' is-active' : ''}`}
                  style={{ fontFamily: FONT_PAIRS[id].display }}
                  onClick={() => setFont(id)}
                >
                  {FONT_PAIRS[id].label}
                </button>
              ))}
            </div>

            <span className="lp-studio__label">Do‘kon nomi</span>
            <input
              className="lp-studio__name"
              placeholder="Masalan: Kafe Nur"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="lp-studio__cta">
              <button className="lp-btn lp-btn--lime" onClick={start}>
                Shu dizayn bilan boshlash <ArrowRight size={19} />
              </button>
            </div>
          </div>

          <ShopPreview
            name={name || 'Sizning do‘koningiz'}
            theme={{ brand, accent: preset.accent, font }}
            type={type}
            swapKey={type}
          />
        </div>
      </div>
    </section>
  )
}
