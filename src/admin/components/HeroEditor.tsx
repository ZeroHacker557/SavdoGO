import { ImageOff, ImageUp, Loader2, Palette, Pipette, Sparkles } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { businessType } from '../../platform/business-types'
import { HERO_LAYOUTS, type HeroLayout, type ShopConfig, type ShopHero } from '../../platform/shop'
import { HeroView } from '../../components/home/HomeHero'
import { demoProducts } from '../../shop/demo-catalog'
import { uz } from '../../i18n/uz'
import { interpolate } from '../../i18n/context'
import type { TranslationKey } from '../../i18n'
import type { Category } from '../../types/domain'

/** Banner ko'rinishlari — sxematik belgi bilan tanlanadi (admin.css → .hl-thumb). */
const LAYOUTS: Record<HeroLayout, { name: string; text: string }> = {
  classic: { name: 'Klassik', text: 'Rangli karta, o‘ngda rasm' },
  immersive: { name: 'Kinematografik', text: 'Butun banner — rasm, matn ustida' },
  split: { name: 'Ajratilgan', text: 'Matn va raqamlar, yonida rasm' },
  bento: { name: 'Mozaika', text: 'Banner + kategoriya va yetkazish plitalari' },
}

const noop = () => {}

/** Banner foni uchun tayyor ranglar — hammasi oq matn bilan o'qiladi. */
const HERO_COLORS = ['#111827', '#1E293B', '#7C2D12', '#14532D', '#1E3A8A', '#581C87', '#831843', '#B45309']

/**
 * Rasmni banner uchun tayyorlaydi: 1600px gacha kichraytiriladi, WebP
 * (eski Safari'da JPEG). 10 MB lik telefon fotosi ~300 KB ga tushadi.
 */
async function compressHero(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Faqat rasm fayl yuklang (JPG, PNG, WebP)')
  if (file.size > 15 * 1024 * 1024) throw new Error('Rasm juda katta — 15 MB dan kichik fayl tanlang')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Rasmni qayta ishlab bo‘lmadi')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const webp = canvas.toDataURL('image/webp', 0.82)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}

type Mode = 'default' | 'custom' | 'none'

function modeOf(hero: ShopHero): Mode {
  if (hero.image === 'none') return 'none'
  return hero.image ? 'custom' : 'default'
}

/**
 * «Bosh sahifa banneri» — do'kon saytidagi katta blok.
 *
 * Rasm: biznes turining standarti, egasining o'z rasmi yoki rasmsiz.
 * Fon: brend rangi yoki boshqa rang (oq matn o'qilishi uchun juda och
 * rang avtomatik to'qlashtiriladi). Sarlavha va izoh bo'sh bo'lsa —
 * biznes turining matni.
 */
export function HeroEditor({
  hero, shop, onChange, onError,
}: {
  hero: ShopHero
  /** Yetkazish sharti va ish vaqti namunada ham haqiqiy ko'rinsin. */
  shop: Pick<ShopConfig, 'type' | 'delivery' | 'contacts'>
  onChange: (hero: ShopHero) => void
  onError: (message: string) => void
}) {
  const type = shop.type
  const preset = businessType(type)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  // Yuklangan, lekin keyin «Standart»ga o'tilgan rasm — qayta tanlansa yo'qolmasin
  const [lastCustom, setLastCustom] = useState<string | null>(modeOf(hero) === 'custom' ? hero.image : null)
  const mode = modeOf(hero)
  const set = (patch: Partial<ShopHero>) => onChange({ ...hero, ...patch })

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const image = await compressHero(file)
      setLastCustom(image)
      set({ image })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Rasmni yuklab bo‘lmadi')
    } finally {
      setBusy(false)
    }
  }

  const choose = (next: Mode) => {
    if (next === 'default') set({ image: null })
    else if (next === 'none') set({ image: 'none' })
    else if (lastCustom) set({ image: lastCustom })
    else fileRef.current?.click()
  }

  // Namuna saytdagi bilan bir xil komponent — matnlar o'zbekcha lug'atdan,
  // biznes turining atamalari («Menyu») va egasining matni ustidan
  const t = useMemo(() => {
    const overrides: Partial<Record<TranslationKey, string>> = {
      'nav.catalog': preset.terms.catalog,
      'home.heroTitle': hero.title || preset.hero.title,
      'home.heroSubtitle': hero.subtitle || preset.hero.subtitle,
    }
    return (key: TranslationKey, values?: Record<string, string | number>) => interpolate(overrides[key] ?? uz[key] ?? key, values)
  }, [preset, hero.title, hero.subtitle])
  const sample = useMemo(() => {
    const categories: Category[] = preset.categories.map((c, i) => ({ id: i + 1, name: c.name, nameRu: c.nameRu, icon: c.icon }))
    return { products: demoProducts(type), categories }
  }, [preset, type])

  return (
    <section className="adm-card hl-editor grid gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-extrabold">Bosh sahifa banneri</h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
          Saytni ochganda birinchi ko‘rinadigan katta blok — rasmi, foni va matni.
        </p>
      </div>

      <div>
        <label className="adm-label">Ko‘rinish</label>
        <div className="hl-grid" role="radiogroup" aria-label="Banner ko‘rinishi">
          {HERO_LAYOUTS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={hero.layout === id}
              className={'hl-option' + (hero.layout === id ? ' is-active' : '')}
              onClick={() => set({ layout: id })}
            >
              <span className={`hl-thumb hl-thumb--${id}`} aria-hidden="true"><i /><i /><i /><i /></span>
              <b>{LAYOUTS[id].name}</b>
              <small>{LAYOUTS[id].text}</small>
            </button>
          ))}
        </div>
      </div>

      {/* Namuna — saytdagi aynan shu komponent (components/home/HomeHero.tsx) */}
      <div className="hl-preview">
        <HeroView
          key={hero.layout}
          shop={{ ...shop, hero }}
          t={t}
          lang="uz"
          inset={false}
          products={sample.products}
          categories={sample.categories}
          promotions={[]}
          onNavigate={noop}
          onOpenCategory={noop}
          onOpenProduct={noop}
        />
        {busy && (
          <span className="hl-preview__busy">
            <Loader2 className="animate-spin" />
          </span>
        )}
      </div>

      <div>
        <label className="adm-label">Rasm</label>
        <div className="flex flex-wrap gap-2">
          {([
            ['default', 'Standart rasm', Sparkles],
            ['custom', lastCustom ? 'O‘z rasmim' : 'Rasm yuklash', ImageUp],
            ['none', 'Rasmsiz', ImageOff],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => choose(id)}
              className={'adm-chip inline-flex items-center gap-1.5 ' + (mode === id ? 'active' : '')}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
          {mode === 'custom' && (
            <button type="button" className="adm-chip inline-flex items-center gap-1.5" onClick={() => fileRef.current?.click()}>
              <ImageUp size={15} /> Boshqa rasm
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--faint)' }}>
          Keng (yotiq), sifatli foto tanlang — ko‘rinishga qarab rasm butun bannerni yoki uning bir qismini egallaydi.
        </p>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      <div>
        <label className="adm-label">Fon rangi</label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => set({ color: null })}
            className={'adm-chip inline-flex items-center gap-1.5 ' + (hero.color === null ? 'active' : '')}
          >
            <Palette size={15} /> Brend rangi
          </button>
          {HERO_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => set({ color: c })}
              className="size-9 rounded-xl transition hover:-translate-y-0.5"
              style={{ background: c, boxShadow: hero.color?.toUpperCase() === c ? `0 0 0 3px var(--surface), 0 0 0 5px ${c}` : 'none' }}
            />
          ))}
          <label
            className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-xl text-white"
            style={{ background: 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)' }}
            title="O‘z rangingiz"
          >
            <Pipette size={16} />
            <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={hero.color ?? '#111827'} onChange={(e) => set({ color: e.target.value })} />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="adm-label">Sarlavha</label>
          <input className="adm-input" maxLength={80} value={hero.title} placeholder={preset.hero.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
        <div>
          <label className="adm-label">Qisqa izoh</label>
          <input className="adm-input" maxLength={120} value={hero.subtitle} placeholder={preset.hero.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
        </div>
        <p className="text-xs sm:col-span-2" style={{ color: 'var(--faint)' }}>
          Bo‘sh qoldirsangiz — biznes turingizga mos matn (o‘zbek va rus tilida) ko‘rsatiladi.
        </p>
      </div>
    </section>
  )
}
