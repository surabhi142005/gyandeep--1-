export type Locale = 'en' | 'hi' | 'mr'
let currentLocale: Locale = 'en'
const dictionaries: Record<Locale, Record<string, string>> = {
  en: {},
  hi: {},
  mr: {}
}

export const setLocale = (locale: Locale) => { currentLocale = locale }
export const t = (key: string) => {
  const dict = dictionaries[currentLocale] || {}
  return dict[key] || key
}