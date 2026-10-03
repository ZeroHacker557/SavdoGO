import { Suspense, lazy } from 'react'
import { LandingPage } from './LandingPage'
import { useLandingRoute } from './router'

// Forma alohida bo'lak: landingni ochgan hamma ham ro'yxatdan o'tmaydi.
// Oldida tekshiruv — do'kon ochib bo'lgan egaga ikkinchi do'kon yo'li (Gate.tsx)
const StartGate = lazy(() => import('./onboarding/Gate').then((m) => ({ default: m.StartGate })))

export function LandingApp() {
  const route = useLandingRoute()
  return route === 'start' ? (
    <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
      <StartGate />
    </Suspense>
  ) : (
    <LandingPage />
  )
}
