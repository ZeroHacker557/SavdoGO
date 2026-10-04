import { Loader2, ShieldAlert } from 'lucide-react'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AdminApiError, apiGet, apiPost } from './lib/api'
import { getInitData, isInTelegram } from './lib/telegram'
import { withRetry } from './lib/retry'
import { auth, loginWithCode, loginWithTelegram, logout, watchUser, PasswordlessError, type Staff } from './lib/auth'
import { resolveSiteTarget } from '../platform/config'
import { useRoute } from './lib/router'
import { useCashHandovers, useOrders, useSupportThreads } from './lib/live'
import { Shell } from './components/Shell'
import { ConnectionError } from './components/ConnectionError'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { SectionsPage } from './pages/SectionsPage'
import { BrainPage } from './pages/BrainPage'
import { PromotionsPage } from './pages/PromotionsPage'
import { AdsPage } from './pages/AdsPage'
import { BillingPage } from './pages/BillingPage'
import { AccountPage } from './pages/AccountPage'
import { NewShopPage } from './pages/NewShopPage'
import { DesignPage } from './pages/DesignPage'
import { Paywall } from './components/Paywall'
import { AddonModal } from './components/AddonTeaser'
import { TelegramAddonPage } from './pages/TelegramAddonPage'
import { addonState } from '../platform/addon'
import { useAdminShop } from './lib/shop'
import { setAdminShop } from './lib/shop'
import { setOwnedShops, type OwnedShop } from './lib/owned'
import { rememberOwnerShop } from '../platform/owner-marker'
import { ReportsPage } from './pages/ReportsPage'
import { PromocodesPage } from './pages/PromocodesPage'
import { CustomersPage } from './pages/CustomersPage'
import { BroadcastPage } from './pages/BroadcastPage'
import { SupportPage } from './pages/SupportPage'
import { CashPage } from './pages/CashPage'

// Xarita kutubxonasi og'ir (~150 KB) — faqat shu bo'lim ochilganda yuklanadi
const MapPage = lazy(() => import('./pages/MapPage'))
import { StaffPage } from './pages/StaffPage'
import { SettingsPage } from './pages/SettingsPage'
import { can } from './lib/auth'
import { applyTheme, getStoredTheme } from '../utils/theme'
import { playNewOrderChime, unlockAudio } from './lib/chime'

/**
 * Panel Telegram ichida ochilgan bo'lsa, xodimning Telegram ID sini
 * o'z hisobiga biriktiradi.
 *
 * Shundan keyin bot unga «🛠 Admin panel» tugmasini ko'rsatadi —
 * ID ni qo'lda yozib qo'yish shart emas. Imzoni server tekshiradi.
 * Seansda bir marta: qayta-qayta so'rov yubormaymiz.
 */
let telegramLinkTried = false

async function linkTelegramOnce() {
  if (telegramLinkTried || !isInTelegram()) return
  telegramLinkTried = true
  try {
    await apiPost('action', { action: 'staff.linkTelegram', initData: getInitData() })
  } catch (error) {
    // Biriktirib bo'lmadi — panel baribir ishlaydi, faqat botdagi
    // tugma ko'rinmaydi. Sababi konsolda qoladi.
    console.warn('[admin] Telegram ID biriktirilmadi:', error)
  }
}

/**
 * Seansni serverdan tekshiradi, o'tkinchi xatolarda qayta urinadi.
 *
 * Tarmoq uzilishi, serverning sovuq ishga tushishi yoki eskirgan
 * token — bularning hammasi bir lahzalik. Ilgari shunday xato
 * darhol «Ruxsat berilmadi» ekraniga olib borardi va admin
 * qaytadan kirishga majbur bo'lardi. Endi faqat HAQIQIY rad javobi
 * (403) shu ekranni chiqaradi.
 */
async function loadSession(): Promise<Staff> {
  const { staff, shop, shops } = await withRetry(
    () => apiGet<{ staff: Staff; shop: Record<string, unknown> & { id: string }; shops?: OwnedShop[] }>('session'),
    {
      // 403 — bu hisob xodim emas yoki bloklangan: urinib ham foyda yo'q
      isFatal: (error) => error instanceof AdminApiError && (error.status === 403 || error.status === 404),
    },
  )
  // Panel shu do'konning yo'llari, logosi va ranglarida ishlaydi (lib/shop.ts)
  setAdminShop(shop.id, shop)
  // Hisobda bir nechta do'kon bo'lsa — yon menyuda almashtirish (lib/owned.ts)
  setOwnedShops(shops)
  // Shu qurilmada do'kon egasi bor — /start ikkinchi do'kon formasini emas, ariza yo'lini ko'rsatadi
  if (staff.role === 'owner') rememberOwnerShop(shop.id, String(shop.name || shop.id))
  return staff
}

/**
 * Parolsiz kirish — sahifa ochilganda bir marta:
 *   ?login=<kod>    — SavdoGO botidagi «💻 Kompyuterda ochish» havolasi
 *   Telegram ichida — initData: SavdoGO boti (ega) yoki do'kon boti (xodim)
 * Muvaffaqiyatda onAuthStateChanged foydalanuvchi bilan qayta keladi.
 * Xatoda kirish oynasi ochiladi; matn bo'lsa — o'sha oynada ko'rinadi.
 */
let passwordlessTried = false

async function tryPasswordless(): Promise<{ ok: boolean; notice?: string }> {
  if (passwordlessTried) return { ok: false }
  passwordlessTried = true

  const params = new URLSearchParams(window.location.search)
  const code = params.get('login')
  if (code) {
    // Kod manzil satrida qolmasin (tarix, skrinshot)
    params.delete('login')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    try {
      await loginWithCode(code)
      return { ok: true }
    } catch (error) {
      return { ok: false, notice: error instanceof Error ? error.message : 'Havola ishlamadi' }
    }
  }

  if (isInTelegram()) {
    const target = resolveSiteTarget(window.location)
    try {
      await loginWithTelegram(getInitData(), target.kind === 'shop' ? target.slug : null)
      return { ok: true }
    } catch (error) {
      // Biriktirilmagan Telegram — oddiy kirish oynasi, ortiqcha xabarsiz
      if (error instanceof PasswordlessError && error.code === 'not-linked') return { ok: false }
      return { ok: false, notice: error instanceof Error ? error.message : undefined }
    }
  }
  return { ok: false }
}

/** Botdagi tugma: `/admin?open=orders/<id>` — kirgandan keyin shu bo'lim ochiladi. */
function openRequestedRoute() {
  const params = new URLSearchParams(window.location.search)
  const open = params.get('open')
  if (!open) return
  params.delete('open')
  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  if (/^[a-z0-9/_-]+$/i.test(open)) window.location.hash = `#/${open}`
}

type State =
  | { phase: 'loading' }
  | { phase: 'anonymous'; notice?: string }
  | { phase: 'denied'; reason: string }
  | { phase: 'error'; reason: string }
  | { phase: 'ready'; staff: Staff }

export function AdminApp() {
  const [state, setState] = useState<State>({ phase: 'loading' })
  /** «Qayta urinish» bosilganda tekshiruv qaytadan ishga tushadi. */
  const [attempt, setAttempt] = useState(0)
  const { route, param, navigate } = useRoute()

  // Tema mini app bilan bir xil kalitdan o'qiladi
  useEffect(() => applyTheme(getStoredTheme()), [])

  useEffect(() => {
    return watchUser(async (user) => {
      if (!user) {
        const passwordless = await tryPasswordless()
        if (passwordless.ok) return
        setState({ phase: 'anonymous', notice: passwordless.notice })
        return
      }
      setState({ phase: 'loading' })
      try {
        // Rolga mijoz tomonida ishonilmaydi — serverdan so'raladi
        const staff = await loadSession()
        setState({ phase: 'ready', staff })
        openRequestedRoute()
        void linkTelegramOnce()
      } catch (error) {
        // Shu orada hisob almashgan yoki o'chirilgan (bog'lanmagan Google
        // hisobi — loginWithGoogle uni o'chiradi): eski natija ekranni buzmasin
        if (auth.currentUser?.uid !== user.uid) return
        const reason = error instanceof Error ? error.message : 'Noma‘lum xato'
        const status = error instanceof AdminApiError ? error.status : 0
        if (status === 403) {
          // Hisob xodim emas yoki bloklangan
          setState({ phase: 'denied', reason })
        } else if (status === 401) {
          // Token haqiqatan eskirgan (yangilangani ham yaramadi) —
          // chalkash «ruxsat yo‘q» o‘rniga toza kirish oynasi
          setState({ phase: 'anonymous' })
          void logout()
        } else {
          // Aloqa yoki server muammosi — seansdan chiqarmaymiz
          setState({ phase: 'error', reason })
        }
      }
    })
  }, [attempt])

  if (state.phase === 'loading') {
    return (
      <div className="adm-login">
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  if (state.phase === 'anonymous') return <LoginPage notice={state.notice} />

  /*
   * Aloqa uzilgan yoki server javob bermadi.
   *
   * Bu ruxsat masalasi EMAS, shuning uchun seansdan chiqarilmaydi:
   * admin «Qayta urinish» ni bosadi va ishini davom ettiradi.
   */
  if (state.phase === 'error') {
    return (
      <ConnectionError
        reason={state.reason}
        onRetry={() => { setState({ phase: 'loading' }); setAttempt((n) => n + 1) }}
        onLogout={() => logout()}
      />
    )
  }

  if (state.phase === 'denied') {
    return (
      <div className="adm-login">
        <div className="adm-login__card text-center">
          <span
            className="mx-auto grid size-14 place-items-center rounded-2xl"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            <ShieldAlert size={26} />
          </span>
          <h1 className="mt-4 text-lg font-extrabold">Ruxsat berilmadi</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            {state.reason}
          </p>
          <button className="adm-btn adm-btn--ghost mt-5 w-full" onClick={() => logout()}>
            Boshqa hisob bilan kirish
          </button>
        </div>
      </div>
    )
  }

  return <AdminPanel staff={state.staff} route={route} param={param} navigate={navigate} />
}

function AdminPanel({
  staff, route, param, navigate,
}: {
  staff: Staff
  route: ReturnType<typeof useRoute>['route']
  param: ReturnType<typeof useRoute>['param']
  navigate: ReturnType<typeof useRoute>['navigate']
}) {
  const courierId = staff.role === 'courier' ? staff.uid : undefined
  // Kuryer bo'limlari faqat «Telegram va kuryerlar» to'plami bilan
  const shop = useAdminShop()
  const addonOn = addonState(shop) === 'active'
  const addonPage = <TelegramAddonPage owner={staff.role === 'owner'} navigate={navigate} />
  const { orders } = useOrders(courierId)
  const newOrders = useMemo(() => orders.filter((o) => o.status === 'Yangi').length, [orders])
  // Kuryerlarning javob kutayotgan xabarlari — menyuda nishon
  const { threads: supportThreads } = useSupportThreads(addonOn && can(staff.role, 'admin'))
  const supportUnread = supportThreads.reduce((sum, thread) => sum + thread.unreadAdmin, 0)
  // Kuryerlar kassaga topshirgan, admin tasdig'ini kutayotgan naqd
  const { handovers } = useCashHandovers(addonOn && can(staff.role, 'admin'))
  const cashPending = handovers.filter((h) => h.status === 'pending').length

  // Yangi murojaat xabari kelganda ham ovoz
  const lastSupport = useRef<number | null>(null)
  useEffect(() => {
    if (lastSupport.current !== null && supportUnread > lastSupport.current) playNewOrderChime()
    lastSupport.current = supportUnread
  }, [supportUnread])

  /*
   * Yangi buyurtma kelganda ovoz.
   *
   * Faqat SON OSHGANDA chalinadi — birinchi yuklanishda ham, holat
   * o'zgarganda ham emas. `null` boshlang'ich qiymati shu uchun:
   * sahifa ochilganda 5 ta kutayotgan buyurtma bo'lsa, 5 marta
   * jaranglab yubormasin.
   */
  const lastCount = useRef<number | null>(null)
  useEffect(() => {
    if (lastCount.current !== null && newOrders > lastCount.current) {
      playNewOrderChime()
    }
    lastCount.current = newOrders
  }, [newOrders])

  // Brauzer birinchi bosishgacha ovozga ruxsat bermaydi
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [])

  return (
    <Shell staff={staff} route={route} onNavigate={navigate} newOrders={newOrders} supportUnread={supportUnread} cashPending={cashPending}>
      {route === 'dashboard' && <DashboardPage courierId={courierId} />}
      {route === 'orders' && <OrdersPage staff={staff} focusId={param} />}
      {route === 'map' && (!addonOn ? addonPage : can(staff.role, 'admin') ? (
        <Suspense fallback={<div className="adm-skeleton h-96" />}>
          <MapPage me={staff} />
        </Suspense>
      ) : <NoAccess />)}

      {/* Katalog — kuryerga yopiq */}
      {route === 'products' && (can(staff.role, 'admin') ? <ProductsPage /> : <NoAccess />)}
      {route === 'categories' && (can(staff.role, 'admin') ? <CategoriesPage /> : <NoAccess />)}
      {route === 'sections' && (can(staff.role, 'admin') ? <SectionsPage /> : <NoAccess />)}
      {route === 'promotions' && (can(staff.role, 'admin') ? <PromotionsPage /> : <NoAccess />)}
      {route === 'ads' && (can(staff.role, 'admin') ? <AdsPage /> : <NoAccess />)}
      {route === 'promocodes' && (can(staff.role, 'admin') ? <PromocodesPage /> : <NoAccess />)}
      {route === 'reports' && (can(staff.role, 'admin') ? <ReportsPage /> : <NoAccess />)}

      {route === 'customers' && (can(staff.role, 'admin') ? <CustomersPage /> : <NoAccess />)}
      {route === 'broadcast' && (!addonOn ? addonPage : can(staff.role, 'admin') ? <BroadcastPage /> : <NoAccess />)}
      {route === 'support' && (!addonOn ? addonPage : can(staff.role, 'admin') ? <SupportPage focusId={param} navigate={navigate} /> : <NoAccess />)}
      {route === 'cash' && (!addonOn ? addonPage : can(staff.role, 'admin') ? <CashPage /> : <NoAccess />)}
      {route === 'telegram' && (can(staff.role, 'admin') ? addonPage : <NoAccess />)}

      {/* Faqat ega */}
      {route === 'staff' && (staff.role === 'owner' ? <StaffPage me={staff} /> : <NoAccess />)}
      {route === 'settings' && (staff.role === 'owner' ? <SettingsPage /> : <NoAccess />)}
      {route === 'design' && (staff.role === 'owner' ? <DesignPage /> : <NoAccess />)}
      {route === 'billing' && (staff.role === 'owner' ? <BillingPage /> : <NoAccess />)}
      {route === 'account' && <AccountPage me={staff} />}
      {route === 'newshop' && (staff.role === 'owner' ? <NewShopPage /> : <NoAccess />)}

      {/* Ega va adminlar */}
      {route === 'brain' && (can(staff.role, 'admin') ? <BrainPage staff={staff} /> : <NoAccess />)}

      {/* To'lanmagan do'konda amal bajarilmoqchi bo'lsa — «To'lov qiling» oynasi */}
      <Paywall owner={staff.role === 'owner'} onPay={() => navigate('billing')} />
      <AddonModal />
    </Shell>
  )
}

/**
 * Rol yetmaganda ko'rsatiladi.
 *
 * Yon menyuda bu bo'limlar allaqachon yashirilgan — bu ekran manzilni
 * qo'lda yozib kirgan holat uchun. Haqiqiy himoya baribir serverda
 * va Firestore Rules'da.
 */
function NoAccess() {
  return (
    <div className="adm-card adm-empty">
      <p className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
        Bu bo‘limga ruxsatingiz yo‘q
      </p>
      <p className="max-w-sm text-sm">Kerak bo‘lsa ega sizga huquq bera oladi.</p>
    </div>
  )
}
