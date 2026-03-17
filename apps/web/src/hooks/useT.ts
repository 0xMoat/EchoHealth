import { useLanguage } from '../contexts/LanguageContext'

export function useT() {
  return useLanguage().t
}
