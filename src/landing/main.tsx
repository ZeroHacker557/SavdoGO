import { StrictMode } from 'react'
import type { Root } from 'react-dom/client'
import { LandingApp } from './LandingApp'
import './landing.css'

/**
 * Landing shriftlari: Unbounded (sarlavha), Manrope (matn) va
 * dizayn studiyasida tanlanadigan to'rt juftlik. Hammasi kirillni
 * qo'llaydi (Archivo Black'dan tashqari — u faqat lotin sarlavha).
 */
const FONTS =
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Manrope:wght@400;500;600;700;800' +
  '&family=Playfair+Display:wght@700&family=Nunito:wght@700;800&family=Archivo+Black&family=Montserrat:wght@600;700&display=swap'

function loadFonts() {
  if (document.getElementById('lp-fonts')) return
  const link = document.createElement('link')
  link.id = 'lp-fonts'
  link.rel = 'stylesheet'
  link.href = FONTS
  document.head.appendChild(link)
}

export function mountLanding(root: Root) {
  loadFonts()
  document.title = 'SavdoGO — biznesingiz uchun tayyor onlayn do‘kon'
  root.render(
    <StrictMode>
      <LandingApp />
    </StrictMode>,
  )
}
