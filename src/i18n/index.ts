import { createContext, useContext } from 'react'
import en from './en'
import fr from './fr'
import type { TranslationKey } from './en'

export type Locale = 'en' | 'fr'

const translations: Record<Locale, Record<TranslationKey, string>> = { en, fr }

export interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => en[key],
})

export function useI18n() {
  return useContext(I18nContext)
}

export function getTranslator(locale: Locale) {
  return (key: TranslationKey) => translations[locale]?.[key] ?? en[key] ?? key
}

export { type TranslationKey }
