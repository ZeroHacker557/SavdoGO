import { PromoBanner } from '../components/promo/PromoBanner'
import type { Promotion } from '../utils/promotions'
import { ArrowRight, Bell, Heart, PackageOpen, Search } from 'lucide-react'
import { BrandLogo } from '../components/brand/BrandLogo'
import { ProductCard } from '../components/product/ProductCard'
import { HomeHero } from '../components/home/HomeHero'
import { ProductRowSkeleton } from '../components/ui/ProductCardSkeleton'
import { IconButton } from '../components/ui/IconButton'
import { categoryIcon } from '../utils/category-icons'
import { categoryLabel } from '../config/categories'
import { useMemo, useRef } from 'react'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import { useReveal } from '../hooks/use-reveal'
import { useI18n, useT } from '../i18n'
import type { AppPage, Category, Product, ProductActions } from '../types/domain'

type Props = ProductActions & {
  products: Product[]
  categories: Category[]
  loading: boolean
  onSearch: () => void
  onNavigate: (page: AppPage) => void
  /** Hozir ishlayotgan vaqtli aksiyalar (katta chegirmasi birinchi). */
  promotions: Promotion[]
  onOpenCategory: (category: string) => void
  unreadNotificationsCount: number
}

export function HomePage({
  products, categories, loading, promotions, onSearch, onNavigate,
  onOpenCategory, unreadNotificationsCount, ...productActions
}: Props) {
  const t = useT()
  const { lang } = useI18n()

  // Ikkala lenta ham sekin o'ziga surilib turadi (karusel)
  const stripRef = useRef<HTMLDivElement>(null)
  const popularRef = useRef<HTMLDivElement>(null)
  useAutoScroll(stripRef, { speed: 16, enabled: categories.length > 3 })
  /*
   * Faqat admin «Mashhur» deb belgilaganlar, admin tartibida.
   * Hech biri belgilanmagan bo'lsa bo'lim ko'rsatilmaydi — tasodifiy
   * mahsulotlarni «mashhur» deb ko'rsatish mijozni chalg'itadi.
   */
  const popular = useMemo(
    () => products
      .filter((p) => p.popular)
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)),
    [products],
  )
  useAutoScroll(popularRef, { speed: 11, enabled: popular.length > 2 })
  /*
   * «Hamma mahsulotlar» — bosh sahifa faqat bitta lentadan iborat bo'lib
   * qolmasin: mashhurlardan tashqari mahsulotlardan bir to'r. To'liq
   * ro'yxat katalogda, bu yerda — birinchi 8 tasi.
   */
  const more = useMemo(() => {
    const rest = products.filter((p) => !p.popular)
    return (rest.length >= 4 ? rest : products).slice(0, 8)
  }, [products])
  // Bo'limlar scroll qilinganda suzib chiqadi — mahsulotlar kelgach yangilari ham
  useReveal([loading, popular.length, categories.length, more.length])

  return (
    <>
      {/* Header */}
      {/* To'liq ekranda brend tepa panelga chiqadi, qidiruv esa shu qatorga
          ko'tariladi — bosh sahifada bitta qator tejaladi */}
      <header className="page-head home-head flex items-center justify-between gap-2 px-5 pt-7 sm:px-10">
        <BrandLogo size={44} className="home-head__brand" />
        <button onClick={onSearch} className="search-trigger page-head__search" style={{ color: 'var(--faint)' }}>
          <Search className="shrink-0" size={19} />
          <span className="truncate text-sm">{t('home.searchPlaceholder')}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={t('notifications.title')} onClick={() => onNavigate('notifications')}>
            <span className="relative">
              <Bell />
              {unreadNotificationsCount > 0 && (
                <span
                  className="absolute right-0 top-0 size-2.5 rounded-full border-2"
                  style={{ background: 'var(--danger)', borderColor: 'var(--surface)' }}
                />
              )}
            </span>
          </IconButton>
          {/* Savat pastdagi menyuga ko'chdi — tepada yurak qoldi.
              Ilgari savat faqat shu kichik ikonka edi va foydalanuvchilar
              uni topolmasdi. */}
          <IconButton label={t('favorites.title')} onClick={() => onNavigate('favorites')}>
            <Heart />
          </IconButton>
        </div>
      </header>

      {/* Search */}
      <section className="home-search px-5 pt-6 sm:px-10">
        <button
          onClick={onSearch}
          className="search-trigger"
          style={{ color: 'var(--faint)' }}
        >
          <Search className="shrink-0" size={20} />
          <span className="truncate text-sm">{t('home.searchPlaceholder')}</span>
        </button>
      </section>

      {/* Ishlayotgan aksiya — eng katta chegirmasi bilan */}
      {promotions[0] && (
        <section className="px-5 pt-4 sm:px-10" style={{ animation: 'fadeInUp 0.4s ease' }}>
          <PromoBanner
            promotion={promotions[0]}
            onOpen={() =>
              promotions[0].target === 'category' && promotions[0].targetIds[0]
                ? onOpenCategory(promotions[0].targetIds[0])
                : onNavigate('catalog')
            }
          />
        </section>
      )}

      {/* Hero — admin paneldagi «Dizayn va aloqa» → «Bosh sahifa banneri» (ko'rinishi ham o'sha yerda) */}
      <HomeHero
        products={products}
        categories={categories}
        promotions={promotions}
        onNavigate={onNavigate}
        onOpenCategory={onOpenCategory}
        onOpenProduct={productActions.onOpen}
      />

      {/* Kategoriyalar — bosilganda katalog filtrlanadi */}
      {categories.length > 0 && (
        <section className="mt-5" data-reveal>
          <div ref={stripRef} className="category-strip category-strip--compact scrollbar-none">
            {categories.map((category) => {
              const Icon = categoryIcon(category.icon, category.name)
              return (
                <button
                  onClick={() => onOpenCategory(category.name)}
                  key={category.id}
                  className="category-card"
                >
                  <span className="category-icon-wrap">
                    <Icon size={22} />
                  </span>
                  <span className="category-label">{categoryLabel(category, lang)}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Mashhur mahsulotlar — faqat admin belgilaganlar */}
      {(loading || popular.length > 0 || products.length === 0) && (
      <section className="px-5 pt-8 sm:px-10">
        <div className="section-head" data-reveal>
          <h2 className="section-title">{t('home.popular')}</h2>
          <button onClick={() => onNavigate('catalog')} className="section-link">
            {t('home.seeAll')} <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <ProductRowSkeleton />
        ) : popular.length > 0 ? (
          // Lenta ekran chetigacha cho'ziladi — kartochka chetda kesilmay suzib chiqadi
          <div ref={popularRef} className="product-strip mt-5 flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {popular.map((product, index) => (
              <div key={product.id} className="shrink-0" data-reveal style={{ ['--d' as string]: `${Math.min(index, 5) * 70}ms` }}>
                <ProductCard product={product} compact {...productActions} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="mt-8 rounded-2xl border border-dashed p-10 text-center"
            style={{ borderColor: 'var(--line)' }}
          >
            <span
              className="mx-auto grid size-16 place-items-center rounded-full"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <PackageOpen size={30} />
            </span>
            <p className="mt-4 font-bold" style={{ color: 'var(--ink-2)' }}>{t('home.emptyTitle')}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('home.emptyText')}</p>
          </div>
        )}
      </section>
      )}

      {!loading && more.length > 0 && (
        <section className="px-5 pt-10 sm:px-10">
          <div className="section-head" data-reveal>
            <h2 className="section-title">{t('home.more')}</h2>
          </div>
          <div className="mt-5 grid grid-flow-row-dense grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {more.map((product, index) => (
              <div key={product.id} data-reveal style={{ ['--d' as string]: `${(index % 4) * 60}ms` }}>
                <ProductCard product={product} {...productActions} />
              </div>
            ))}
          </div>
          {products.length > more.length && (
            <button onClick={() => onNavigate('catalog')} className="home-catalog-btn" data-reveal>
              {t('home.openCatalog')} <ArrowRight size={18} />
            </button>
          )}
        </section>
      )}

      {/* Pastki menyu tagida qolmasin */}
      <div className="h-32" aria-hidden="true" />
    </>
  )
}
