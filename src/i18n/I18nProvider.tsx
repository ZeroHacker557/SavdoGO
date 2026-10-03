import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { uz } from './uz'
import { setCurrencyLabel } from '../data'
import { shopTerms } from '../shop/terms'
import {
  DICTIONARIES, I18nContext, STORAGE_KEY, detectLanguage, interpolate,
  type I18nValue, type Language,
} from './context'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage)

  useEffect(() => {
    document.documentElement.lang = lang
    // formatPrice() hook ishlatolmaydi — valyuta nomini shu yerdan beramiz
    setCurrencyLabel(DICTIONARIES[lang]['common.currency'])
  }, [lang])

  const setLang = useCallback((next: Language) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // saqlab bo'lmasa ham ilova ishlashda davom etadi
    }
  }, [])

  // Biznes turiga mos so'zlar («Menyu», «Porsiya»...) — lug'at ustidan
  const terms = useMemo(() => shopTerms(lang), [lang])

  const t = useCallback<I18nValue['t']>(
    (key, values) => {
      // Tarjima topilmasa o'zbekchaga qaytamiz — bo'sh joy qolmaydi
      return interpolate(terms[key] ?? DICTIONARIES[lang][key] ?? uz[key] ?? key, values)
    },
    [lang, terms],
  )

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
