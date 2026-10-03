import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { isFirebaseConfigured } from '../config/firebase'
import { NotConfigured } from '../admin/components/NotConfigured'
import '../admin/admin.css'
import './super.css'
import { applyShopTheme } from '../platform/palette'
import { applyTheme, getStoredTheme } from '../utils/theme'

/**
 * Platforma egasining paneli (super.html → /super).
 *
 * Admin panel bilan bir xil uslub (admin.css) va bir xil Firebase
 * seansi, lekin kirish huquqi `super: true` claim'ida — uni faqat
 * `scripts/create-super.mjs` qo'yadi.
 */
applyShopTheme({ brand: '#5B4CF5', accent: '#C6F432', font: 'modern' })
applyTheme(getStoredTheme())

const root = createRoot(document.getElementById('super-root')!)
const render = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>)

if (isFirebaseConfigured()) void import('./SuperApp').then(({ SuperApp }) => render(<SuperApp />))
else render(<NotConfigured />)
