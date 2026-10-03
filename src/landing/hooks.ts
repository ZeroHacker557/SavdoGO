import { useEffect, useState, type MouseEvent } from 'react'

/**
 * `data-reveal` belgili elementlar ekranga kirganda `is-in` oladi.
 * Yashirish faqat `html.lp-reveal` bo'lsa ishlaydi — skript
 * ishlamasa ham kontent ko'rinib turadi.
 */
export function useLandingReveal(deps: unknown[] = []) {
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in), [data-reveal-group]:not(.is-in)')]
    if (!items.length) return
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add('is-in'))
      return
    }
    document.documentElement.classList.add('lp-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )
    items.forEach((el) => observer.observe(el))
    // Kafolat: kuzatuvchi javob bermasa ham ekrandagisi ko'rinsin
    const safety = window.setTimeout(() => {
      for (const el of items) {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in')
      }
    }, 2000)
    return () => {
      observer.disconnect()
      window.clearTimeout(safety)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Sahifa shuncha pikseldan ko'p surilganmi. */
export function useScrolled(offset = 12): boolean {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > offset)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

/** Kartochka ustida sichqoncha orqasidan yuruvchi yorug'lik. */
export function spotlight(event: MouseEvent<HTMLElement>) {
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  el.style.setProperty('--my', `${event.clientY - rect.top}px`)
}

/** Foydalanuvchi «kamroq harakat» tanlaganmi. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * Raqam ekranga kirganda 0 dan sanab chiqadi.
 * `ref` — kuzatiladigan element.
 */
export function useCountUp(target: number, active: boolean, duration = 1400): number {
  const [value, setValue] = useState(0)
  // «Kamroq harakat» — animatsiyasiz, darhol yakuniy son
  const still = active && prefersReducedMotion()
  useEffect(() => {
    if (!active || still) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration, still])
  return still ? target : value
}

/** Element ekranga kirdimi (bir marta). */
export function useInView<T extends Element>(ref: { current: T | null }, margin = '0px 0px -15% 0px'): boolean {
  const [inView, setInView] = useState(false)
  // Eski brauzer — kuzatib bo'lmaydi, darhol ko'rsatiladi
  const supported = typeof IntersectionObserver !== 'undefined'
  useEffect(() => {
    const el = ref.current
    if (!el || inView || !supported) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: margin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, margin, inView, supported])
  return inView || !supported
}
