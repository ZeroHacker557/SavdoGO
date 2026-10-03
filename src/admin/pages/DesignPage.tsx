import { ImageUp, Loader2, Pipette, Save, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { COLOR_PRESETS, FONT_PAIRS, businessType, type FontPairId } from '../../platform/business-types'
import { ShopPreview } from '../../platform/preview/ShopPreview'
import { inkOn } from '../../platform/palette'
import { initials, type ShopConfig } from '../../platform/shop'
import { processLogo } from '../../landing/onboarding/logo'
import { apiPost } from '../lib/api'
import { useAdminShop } from '../lib/shop'
import { useToast } from '../components/Toast'
import { HeroEditor } from '../components/HeroEditor'

type Brand = Pick<ShopConfig, 'name' | 'tagline' | 'logo' | 'theme' | 'hero' | 'contacts'>

function fromShop(shop: ShopConfig): Brand {
  return { name: shop.name, tagline: shop.tagline, logo: shop.logo, theme: { ...shop.theme }, hero: { ...shop.hero }, contacts: { ...shop.contacts } }
}

/** Ko'rinish tanlovidagi to'rt shriftni bir marta yuklaydi. */
function useFontPairs() {
  useEffect(() => {
    for (const [id, pair] of Object.entries(FONT_PAIRS)) {
      if (document.getElementById(`font-${id}`)) continue
      const link = document.createElement('link')
      link.id = `font-${id}`
      link.rel = 'stylesheet'
      link.href = pair.href
      document.head.appendChild(link)
    }
  }, [])
}

/**
 * Dizayn va aloqa — ro'yxatdan o'tishdagi «Dizayn» va «Ma'lumotlar»
 * qadamlarining davomi. O'ng tomonda sayt telefonda qanday
 * ko'rinishi darhol chiziladi; «Saqlash» bosilgach mijozlar saytida
 * ham (ochiq turgan bo'lsa ham) o'zi yangilanadi.
 */
export function DesignPage() {
  const shop = useAdminShop()
  const { show, node: toast } = useToast()
  const [brand, setBrand] = useState<Brand>(() => fromShop(shop))
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useFontPairs()

  const type = businessType(shop.type)
  const dirty = JSON.stringify(brand) !== JSON.stringify(fromShop(shop))
  const set = (patch: Partial<Brand>) => setBrand((b) => ({ ...b, ...patch }))
  const setTheme = (patch: Partial<Brand['theme']>) => setBrand((b) => ({ ...b, theme: { ...b.theme, ...patch } }))
  const setContact = (patch: Partial<Brand['contacts']>) => setBrand((b) => ({ ...b, contacts: { ...b.contacts, ...patch } }))

  const pickLogo = async (file: File | undefined) => {
    if (!file) return
    setLogoBusy(true)
    try {
      set({ logo: await processLogo(file) })
    } catch (error) {
      show(error instanceof Error ? error.message : 'Rasmni yuklab bo‘lmadi', 'error')
    } finally {
      setLogoBusy(false)
    }
  }

  const save = async () => {
    setBusy(true)
    try {
      await apiPost('action', { action: 'settings.save', section: 'brand', ...brand })
      show('Saqlandi — sayt yangilandi')
    } catch (error) {
      show(error instanceof Error ? error.message : 'Saqlanmadi', 'error')
    } finally {
      setBusy(false)
    }
  }

  const accents = Array.from(new Set([type.accent, '#FFB400', '#F472B6', '#22D3EE', '#C9A227', '#22C55E', '#F97316', '#A3E635']))

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-5">
        <section className="adm-card grid gap-4 sm:grid-cols-2 p-4 sm:p-5">
          <h2 className="text-base font-extrabold sm:col-span-2">Nom va logotip</h2>
          <div className="flex items-center gap-4 sm:col-span-2">
            <span
              className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-3xl text-2xl font-extrabold"
              style={{
                background: brand.logo ? '#fff' : brand.theme.brand,
                color: inkOn(brand.theme.brand),
                fontFamily: FONT_PAIRS[brand.theme.font].display,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {logoBusy ? <Loader2 className="animate-spin" /> : brand.logo ? <img src={brand.logo} alt="" className="size-full object-cover" /> : initials(brand.name)}
            </span>
            <div className="flex flex-wrap gap-2">
              <button className="adm-btn adm-btn--ghost" onClick={() => fileRef.current?.click()}>
                <ImageUp size={16} /> {brand.logo ? 'Almashtirish' : 'Logo yuklash'}
              </button>
              {brand.logo && (
                <button className="adm-btn adm-btn--danger" onClick={() => set({ logo: null })}>
                  <Trash2 size={16} /> O‘chirish
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <div>
            <label className="adm-label">Do‘kon nomi</label>
            <input className="adm-input" maxLength={60} value={brand.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className="adm-label">Qisqa shior</label>
            <input className="adm-input" maxLength={80} value={brand.tagline} placeholder={type.hero.subtitle} onChange={(e) => set({ tagline: e.target.value })} />
          </div>
        </section>

        <section className="adm-card grid gap-4 p-4 sm:p-5">
          <h2 className="text-base font-extrabold">Ranglar va shrift</h2>
          <ColorRow label="Asosiy rang" value={brand.theme.brand} options={[type.brand, ...COLOR_PRESETS]} onChange={(brandColor) => setTheme({ brand: brandColor })} />
          <ColorRow label="Qo‘shimcha rang — chegirma va kategoriya tugmalari" value={brand.theme.accent} options={accents} onChange={(accent) => setTheme({ accent })} />
          <div>
            <label className="adm-label">Shrift uslubi</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(FONT_PAIRS) as FontPairId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme({ font: id })}
                  className="grid gap-1 rounded-2xl border-2 p-3 text-center"
                  style={{ borderColor: brand.theme.font === id ? 'var(--brand)' : 'var(--line)', background: 'var(--surface)' }}
                >
                  <b style={{ fontFamily: FONT_PAIRS[id].display, fontSize: 22 }}>Aa</b>
                  <small className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{FONT_PAIRS[id].label}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <HeroEditor
          hero={brand.hero}
          shop={shop}
          onChange={(hero) => set({ hero })}
          onError={(message) => show(message, 'error')}
        />

        <section className="adm-card grid gap-4 sm:grid-cols-2 p-4 sm:p-5">
          <h2 className="text-base font-extrabold sm:col-span-2">Aloqa — saytdagi «Yordam» bo‘limi va olib ketish manzili</h2>
          {([
            ['phone', 'Telefon', '+998 90 123 45 67'],
            ['telegram', 'Telegram', '@dokon'],
            ['instagram', 'Instagram', 'dokon.uz'],
            ['city', 'Shahar', 'Toshkent'],
            ['workHours', 'Ish vaqti', '09:00 — 21:00'],
            ['address', 'Manzil', 'Chilonzor tumani, Bunyodkor ko‘chasi, 12'],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
              <label className="adm-label">{label}</label>
              <input
                className="adm-input"
                value={brand.contacts[key]}
                placeholder={placeholder}
                onChange={(e) => setContact({ [key]: e.target.value } as Partial<Brand['contacts']>)}
              />
            </div>
          ))}
        </section>
      </div>

      {/* Jonli ko'rinish va saqlash */}
      <aside className="grid content-start gap-4 lg:sticky lg:top-[88px] lg:self-start">
        <div className="adm-card grid justify-items-center gap-3 overflow-hidden p-4 sm:p-5" style={{ background: 'var(--surface-2)' }}>
          <div style={{ scale: '0.9', margin: '-24px 0' }}>
            <ShopPreview name={brand.name} tagline={brand.tagline} logo={brand.logo} theme={brand.theme} hero={brand.hero} type={shop.type} />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="adm-btn adm-btn--primary flex-1" disabled={!dirty || busy || brand.name.trim().length < 2} onClick={save}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
          </button>
          {dirty && (
            <button className="adm-btn adm-btn--ghost" onClick={() => setBrand(fromShop(shop))} title="Bekor qilish">
              <Undo2 size={16} />
            </button>
          )}
        </div>
      </aside>

      {toast}
    </div>
  )
}

function ColorRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (color: string) => void }) {
  const list = Array.from(new Set(options.map((c) => c.toUpperCase())))
  return (
    <div>
      <label className="adm-label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {list.map((color) => {
          const active = color === value.toUpperCase()
          return (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => onChange(color)}
              className="size-9 rounded-xl transition hover:-translate-y-0.5"
              style={{
                background: color,
                boxShadow: active ? `0 0 0 3px var(--surface), 0 0 0 5px ${color}` : 'none',
              } as CSSProperties}
            />
          )
        })}
        <label
          className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-xl text-white"
          style={{ background: 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)' }}
          title="O‘z rangingiz"
        >
          <Pipette size={16} />
          <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      </div>
    </div>
  )
}
