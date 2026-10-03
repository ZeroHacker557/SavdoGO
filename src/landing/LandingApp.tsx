import { Suspense, lazy } from 'react'
import { LandingPage } from './LandingPage'
import { useLandingRoute } from './router'

// Forma alohida bo'lak: landingni ochgan hamma ham ro'yxatdan o'tmaydi.
// Oldida tekshiruv — do'kon ochib bo'lgan egaga ikkinchi do'kon yo'li (Gate.tsx)
const StartGate = lazy(() => import('./onboarding/Gate').then((m) => ({ default: m.StartGate })))
// Qo'llanma — SavdoGO botidagi «📖 Qo'llanma» tugmasi ochadi (mini app)
const GuidePage = lazy(() => import('./guide/GuidePage').then((m) => ({ default: m.GuidePage })))

export function LandingApp() {
  const route = useLandingRoute()
  if (route === 'home') return <LandingPage />
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      {route === 'start' ? <StartGate /> : <GuidePage />}
    </Suspense>
  )
}
