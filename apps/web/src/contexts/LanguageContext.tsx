'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import en, { type TranslationKey } from '../lib/translations/en'
import zh from '../lib/translations/zh'

type Lang = 'en' | 'zh'
type Translations = Record<TranslationKey, string>

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translations
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: en as Translations,
})

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('lang') as Lang | null
  if (saved === 'en' || saved === 'zh') return saved
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith('zh')) return 'zh'
  return 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    setLangState(detectLang())
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const t = (lang === 'zh' ? zh : en) as Translations

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
