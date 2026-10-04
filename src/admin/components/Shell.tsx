import {
  BarChart3, BrainCircuit, Boxes, Check, ChevronsUpDown, Clapperboard, CreditCard, ExternalLink, Eye, FileBarChart, Flame,
  Gift, Globe, Headset, KeyRound, Layers, LayoutGrid, Loader2, LogOut, Map as MapIcon, Maximize2, Wallet, Megaphone, Menu, Minimize2,
  Moon, Palette, Plus, Settings, Send, ShoppingBag, Store, Sun, Tag, Users, UserCog, X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  fullscreenState, isInTelegram, openInBrowser, subscribeFullscreen, toggleFullscreen,
} from '../lib/telegram'
import { BrandLogo } from '../../components/brand/BrandLogo'
import { can, logout, type Staff, type StaffRole } from '../lib/auth'
import { ROUTES, type Route } from '../lib/router'
import { applyTheme, getStoredTheme, storeTheme, type ThemeMode } from '../../utils/theme'
import { shopLink } from '../../platform/config'
import { daysLeft, isLocked, useAdminShop } from '../lib/shop'
import { ADDON_PRICE, addonState } from '../../platform/addon'
import { ownedShops, switchToShop, type OwnedShop } from '../lib/owned'
import { initials } from '../../platform/shop'
import { inkOn } from '../../platform/palette'

type NavEntry = {
  route: Route
  label: string
  icon: typeof BarChart3
  /** Shu roldan past xodimga ko'rinmaydi. */
  min: StaffRole
  section?: string
  /** Menyu oxirida alohida ajralib turadigan maxsus bo'lim. */
  special?: boolean
  /** Faqat «Telegram va kuryerlar» to'plami ulanganda (platform/addon.ts). */
  addon?: 'only' | 'teaser'
}

const NAV: NavEntry[] = [
  { route: 'dashboard', label: 'Boshqaruv paneli', icon: BarChart3, min: 'courier' },
  { route: 'orders', label: 'Buyurtmalar', icon: ShoppingBag, min: 'courier' },
  { route: 'map', label: 'Kuryerlar xaritasi', icon: MapIcon, min: 'admin', addon: 'only' },
  { route: 'reports', label: 'Hisobotlar', icon: FileBarChart, min: 'admin' },

  { route: 'products', label: 'Mahsulotlar', icon: Boxes, min: 'admin', section: 'Katalog' },
  { route: 'categories', label: 'Kategoriyalar', icon: LayoutGrid, min: 'admin' },
  { route: 'sections', label: 'Bo‘limlar va tartib', icon: Layers, min: 'admin' },
  { route: 'promotions', label: 'Vaqtli aksiyalar', icon: Flame, min: 'admin' },
  { route: 'ads', label: 'Reklama banneri', icon: Clapperboard, min: 'admin' },
  { route: 'promocodes', label: 'Promokodlar', icon: Tag, min: 'admin' },

  { route: 'customers', label: 'Mijozlar', icon: Users, min: 'admin', section: 'Odamlar' },
  { route: 'broadcast', label: 'Ommaviy xabar', icon: Megaphone, min: 'admin', addon: 'only' },
  { route: 'support', label: 'Kuryerlar chati', icon: Headset, min: 'admin', addon: 'only' },
  { route: 'cash', label: 'Kuryerlar kassasi', icon: Wallet, min: 'admin', addon: 'only' },
  // To'plam ulanmaguncha — kuryer bo'limlari o'rnida taklif sahifasi
  { route: 'telegram', label: 'Kuryerlar va bot', icon: Send, min: 'admin', addon: 'teaser' },
  { route: 'staff', label: 'Xodimlar', icon: UserCog, min: 'owner' },

  { route: 'design', label: 'Dizayn va aloqa', icon: Palette, min: 'owner', section: 'Do‘kon' },
  { route: 'settings', label: 'Yetkazish va to‘lov', icon: Settings, min: 'owner' },
  { route: 'billing', label: 'Obuna va to‘lov', icon: CreditCard, min: 'owner' },
  { route: 'newshop', label: 'Yangi do‘kon', icon: Store, min: 'owner' },
  // Zaxira kirish usullari (Google, email) — hamma xodimga
  { route: 'account', label: 'Hisobim', icon: KeyRound, min: 'courier' },

  // Eng pastda — butun tizimning galaktika ko'rinishi
  { route: 'brain', label: 'Miya', icon: BrainCircuit, min: 'admin', special: true },
]

const TITLES: Record<Route, string> = {
  dashboard: 'Boshqaruv paneli',
  orders: 'Buyurtmalar',
  map: 'Kuryerlar xaritasi',
  products: 'Mahsulotlar',
  categories: 'Kategoriyalar',
  sections: 'Bo‘limlar va tartib',
  promotions: 'Vaqtli aksiyalar',
  ads: 'Reklama banneri',
  reports: 'Hisobotlar',
  customers: 'Mijozlar',
  broadcast: 'Ommaviy xabar',
  support: 'Kuryerlar chati',
  cash: 'Kuryerlar kassasi',
  staff: 'Xodimlar',
  promocodes: 'Promokodlar',
  settings: 'Yetkazish, to‘lov va kuryerlar',
  design: 'Dizayn va aloqa',
  billing: 'Obuna va to‘lov',
  telegram: 'Kuryerlar va Telegram',
  newshop: 'Yangi do‘kon',
  account: 'Hisobim — kirish usullari',
  brain: 'Miya',
}

type Props = {
  staff: Staff
  route: Route
  onNavigate: (route: Route) => void
  /** Yangi buyurtmalar soni — yon menyuda nishon bo'lib chiqadi. */
  newOrders?: number
  /** Kuryerlarning javob kutayotgan xabarlari. */
  supportUnread?: number
  /** Tasdiq kutayotgan kassa topshirishlari. */
  cashPending?: number
  children: ReactNode
}

export function Shell({ staff, route, onNavigate, newOrders = 0, supportUnread = 0, cashPending = 0, children }: Props) {
  const [open, setOpen] = useState(false)
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme)

  // Yon panel ochiq turganda orqa fon aylanmasin
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const shop = useAdminShop()
  const addonOn = addonState(shop) === 'active'
  const visible = NAV.filter(
    (entry) =>
      can(staff.role, entry.min) &&
      !(entry.addon === 'only' && !addonOn) &&
      !(entry.addon === 'teaser' && addonOn),
  )

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    storeTheme(next)
    setThemeState(next)
  }

  return (
    <div className="adm-shell">
      <aside className={'adm-sidebar ' + (open ? 'open' : '')}>
        <div className="flex items-center justify-between gap-2">
          {ownedShops().length > 1 ? <ShopSwitcher shops={ownedShops()} onAdd={staff.role === 'owner' ? () => { setOpen(false); onNavigate('newshop') } : undefined} /> : <BrandLogo size={36} />}
          <button
            className="grid size-9 place-items-center rounded-xl lg:hidden"
            style={{ background: 'var(--surface-2)' }}
            onClick={() => setOpen(false)}
            aria-label="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="adm-nav">
          {visible.map((entry) => {
            const Icon = entry.icon
            return (
              <div key={entry.route} className={entry.special ? 'adm-nav__special' : undefined}>
                {entry.section && <p className="adm-nav__section">{entry.section}</p>}
                <button
                  className={
                    'adm-nav__item w-full ' +
                    (entry.special ? 'adm-nav__item--brain ' : '') +
                    (route === entry.route ? 'active' : '')
                  }
                  onClick={() => {
                    // Telefonda bo'lim tanlangach yon panel yopiladi
                    setOpen(false)
                    onNavigate(entry.route)
                  }}
                  aria-current={route === entry.route ? 'page' : undefined}
                >
                  <Icon size={18} />
                  <span className="truncate">{entry.label}</span>
                  {entry.route === 'orders' && newOrders > 0 && (
                    <span className="adm-nav__badge">{newOrders > 99 ? '99+' : newOrders}</span>
                  )}
                  {entry.route === 'support' && supportUnread > 0 && (
                    <span className="adm-nav__badge">{supportUnread > 99 ? '99+' : supportUnread}</span>
                  )}
                  {entry.route === 'cash' && cashPending > 0 && (
                    <span className="adm-nav__badge">{cashPending}</span>
                  )}
                  {entry.addon === 'teaser' && (
                    <span className="adm-nav__addon">{ADDON_PRICE}</span>
                  )}
                </button>
              </div>
            )
          })}
        </nav>

        <div className="mt-auto pt-4">
          <div
            className="flex items-center gap-2.5 rounded-xl p-2.5"
            style={{ background: 'var(--surface-2)' }}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold"
              style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
            >
              {(staff.name || staff.email).charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{staff.name || staff.email}</p>
              <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                {staff.role === 'owner' ? 'Ega' : staff.role === 'admin' ? 'Admin' : 'Kuryer'}
              </p>
            </div>
            <button
              className="grid size-8 shrink-0 place-items-center rounded-lg transition active:scale-90"
              style={{ color: 'var(--danger)' }}
              onClick={() => logout()}
              aria-label="Chiqish"
              title="Chiqish"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="adm-backdrop lg:hidden" onClick={() => setOpen(false)} />}

      <header className="adm-topbar">
        <button
          className="grid size-10 place-items-center rounded-xl transition active:scale-90 lg:hidden"
          style={{ background: 'var(--surface-2)' }}
          onClick={() => setOpen(true)}
          aria-label="Menyu"
        >
          <Menu size={20} />
        </button>
        <h1 className="adm-topbar__title mr-auto truncate">{TITLES[route]}</h1>

        {/* Do'kon sayti — yangi oynada */}
        {/* Telefonda faqat ikonka — sahifa sarlavhasi kesilib qolmasin */}
        <a
          className="adm-btn adm-btn--ghost adm-topbar__site shrink-0"
          href={shopLink(shop.id)}
          target="_blank"
          rel="noreferrer"
          aria-label="Saytni ochish"
          title="Saytni ochish"
        >
          <Globe size={16} /> <span className="adm-hide-sm">Saytni ochish</span>
        </a>

        {/* Telegram ichida: oynani kattalashtirish yoki brauzerda ochish */}
        <TelegramWindowButtons />

        <button
          className="grid size-10 shrink-0 place-items-center rounded-xl transition active:scale-90"
          style={{ background: 'var(--surface-2)' }}
          onClick={toggleTheme}
          aria-label="Rejimni almashtirish"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="adm-main">
        {route !== 'billing' && <SubscriptionBanner owner={staff.role === 'owner'} onPay={() => onNavigate('billing')} />}
        {/* Miya sahifasi butun maydonni egallaydi — chekka bo'shliqlarsiz */}
        <div className={'adm-content ' + (route === 'brain' ? 'adm-content--bleed' : '')} key={route}>
          {children}
        </div>
      </main>
    </div>
  )
}

/**
 * Obuna holati — har sahifa tepasida.
 *
 *   Bepul sinov — butun sinov davomida: necha kun qolgani va tarif tugmasi.
 *   To'lanmagan / muddati tugagan — ko'rish rejimi: panel ochiq, lekin
 *     o'zgartirish va buyurtma qabul qilish to'lovdan keyin.
 *   3 kundan kam qolgan — sariq eslatma.
 */
function SubscriptionBanner({ owner, onPay }: { owner: boolean; onPay: () => void }) {
  const shop = useAdminShop()
  const left = daysLeft(shop)
  const locked = isLocked(shop)
  if (shop.status === 'blocked') {
    return (
      <div className="adm-sub-banner adm-sub-banner--danger">
        <Eye size={18} />
        <span>Do‘kon platforma tomonidan to‘xtatilgan. Biz bilan bog‘laning.</span>
      </div>
    )
  }
  if (shop.trial && !locked && left !== null) {
    return (
      <div className={'adm-sub-banner ' + (left > 3 ? 'adm-sub-banner--trial' : 'adm-sub-banner--warn')}>
        <Gift size={18} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <b>Bepul sinov: {left} kun qoldi.</b> Hamma imkoniyat ochiq. Tarifni oldindan to‘lasangiz, qolgan kunlar ham saqlanadi.
        </span>
        {owner && (
          <button className="adm-btn adm-btn--primary shrink-0" onClick={onPay}>
            <CreditCard size={16} /> Tarifni tanlash
          </button>
        )}
      </div>
    )
  }
  if (!locked && (left === null || left > 3)) return null

  return (
    <div className={'adm-sub-banner ' + (locked ? 'adm-sub-banner--lock' : 'adm-sub-banner--warn')}>
      <Eye size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">
        {locked
          ? shop.status === 'demo'
            ? <><b>Ko‘rish rejimi.</b> Hamma bo‘limni ko‘rasiz; mahsulot qo‘shish va buyurtma qabul qilish to‘lovdan keyin ochiladi.</>
            : shop.trial
              ? <><b>Bepul sinov tugadi.</b> Sayt ochiq, lekin buyurtma qabul qilinmayapti — davom ettirish uchun tarifni faollashtiring.</>
              : <><b>Obuna muddati tugagan.</b> Sayt ochiq, lekin buyurtma qabul qilinmayapti.</>
          : <>Obuna <b>{left} kundan</b> keyin tugaydi — uzaytirishni unutmang.</>}
      </span>
      {owner && (
        <button className="adm-btn adm-btn--primary shrink-0" onClick={onPay}>
          <CreditCard size={16} /> {locked ? 'To‘lov qilish' : 'Uzaytirish'}
        </button>
      )}
    </div>
  )
}

/**
 * Telegram oynasini boshqarish tugmalari.
 *
 * Kompyuterda Telegram mini appni telefon o'lchamidagi kichik oynada
 * ochadi. «To'liq ekran» uni butun ekranga chiqaradi (Bot API 8.0+).
 * Telegram bu qurilmada qo'llab-quvvatlamasa, tugma o'rniga panelni
 * brauzerda ochish taklif qilinadi — u yerda oyna baribir katta.
 *
 * Brauzerda (Telegramsiz) hech qanday tugma ko'rinmaydi.
 */
function TelegramWindowButtons() {
  const [fs, setFs] = useState(fullscreenState)
  useEffect(() => subscribeFullscreen(setFs), [])

  if (!isInTelegram()) return null

  return (
    <>
      {fs.available && !fs.failed && (
        <button
          className="grid size-10 shrink-0 place-items-center rounded-xl transition active:scale-90"
          style={{ background: 'var(--surface-2)' }}
          onClick={toggleFullscreen}
          aria-label={fs.active ? 'Oynani kichraytirish' : "To'liq ekran"}
          title={fs.active ? 'Oynani kichraytirish' : "To'liq ekran"}
        >
          {fs.active ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      )}

      <button
        className="grid size-10 shrink-0 place-items-center rounded-xl transition active:scale-90"
        style={{ background: 'var(--surface-2)' }}
        onClick={openInBrowser}
        aria-label="Brauzerda ochish"
        title="Brauzerda ochish — katta ekranda ishlash uchun"
      >
        <ExternalLink size={18} />
      </button>
    </>
  )
}

export { ROUTES }

/**
 * Hisobda bir nechta do'kon bo'lsa — logotip o'rnida do'kon tanlagich.
 * Tanlanganda server faol do'konni almashtiradi va panel qayta yuklanadi
 * (lib/owned.ts).
 */
function ShopSwitcher({ shops, onAdd }: { shops: OwnedShop[]; onAdd?: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const current = shops.find((s) => s.current) ?? shops[0]

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.adm-switch')) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = async (shop: OwnedShop) => {
    if (shop.current) return setOpen(false)
    setBusy(shop.id)
    setError(null)
    try {
      await switchToShop(shop.id)
    } catch (err) {
      setBusy(null)
      setError(err instanceof Error ? err.message : 'O‘tib bo‘lmadi')
    }
  }

  return (
    <div className="adm-switch">
      <button type="button" className="adm-switch__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox">
        <SwitchMark shop={current} />
        <span className="min-w-0 flex-1 text-left">
          <b className="block truncate">{current.name}</b>
          <small>{shops.length} ta do‘kon</small>
        </span>
        <ChevronsUpDown size={16} className="shrink-0" style={{ color: 'var(--muted)' }} />
      </button>
      {open && (
        <div className="adm-switch__menu" role="listbox" aria-label="Do‘konni tanlash">
          {shops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              role="option"
              aria-selected={shop.current}
              className={'adm-switch__item' + (shop.current ? ' is-current' : '')}
              disabled={busy !== null}
              onClick={() => void pick(shop)}
            >
              <SwitchMark shop={shop} size={30} />
              <span className="min-w-0 flex-1 text-left">
                <b className="block truncate">{shop.name}</b>
                <small className="block truncate">{shop.id}</small>
              </span>
              {busy === shop.id ? <Loader2 size={15} className="animate-spin" /> : shop.current ? <Check size={15} style={{ color: 'var(--brand)' }} /> : null}
            </button>
          ))}
          {error && <p className="adm-switch__error">{error}</p>}
          {onAdd && (
            <button type="button" className="adm-switch__add" onClick={() => { setOpen(false); onAdd() }}>
              <Plus size={15} /> Yana do‘kon
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SwitchMark({ shop, size = 36 }: { shop: OwnedShop; size?: number }) {
  return shop.logo ? (
    <img src={shop.logo} alt="" className="shrink-0 object-cover" style={{ width: size, height: size, borderRadius: size * 0.28, background: '#fff' }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center text-xs font-extrabold"
      style={{ width: size, height: size, borderRadius: size * 0.28, background: shop.brand, color: inkOn(shop.brand) }}
    >
      {initials(shop.name)}
    </span>
  )
}
