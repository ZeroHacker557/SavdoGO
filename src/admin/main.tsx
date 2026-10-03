import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './admin.css'
import { initAdminTelegram } from './lib/telegram'
import { isFirebaseConfigured } from '../config/firebase'
import { NotConfigured } from './components/NotConfigured'
import { applyShopTheme } from '../platform/palette'

/**
 * Admin panel kirish nuqtasi (admin.html).
 *
 * Mini appdan mustaqil: oddiy brauzerda email/parol bilan ochiladi.
 * Botdagi «🛠 Admin panel» tugmasi orqali Telegram ichida ham
 * ochilishi mumkin — o'sha holatda oyna to'liq ekranga chiqariladi
 * (src/admin/lib/telegram.ts). Kirish ikkala holatda ham bir xil.
 */
// Render'dan OLDIN: Telegram oynasi o'lchamini darhol to'g'rilaydi
initAdminTelegram()
// Kirishgacha — platforma ranglari; kirgach do'konniki qo'llanadi (lib/shop.ts)
applyShopTheme({ brand: '#5B4CF5', accent: '#C6F432', font: 'modern' })

const root = createRoot(document.getElementById('admin-root')!)
const render = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>)

// Firebase sozlanmagan bo'lsa auth moduli yuklanishida yiqiladi — ilova keyin yuklanadi
if (isFirebaseConfigured()) void import('./AdminApp').then(({ AdminApp }) => render(<AdminApp />))
else render(<NotConfigured />)
