import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import ms from './locales/ms.json' // 新增

export type MessageSchema = typeof en
type Locales = 'en' | 'zh-CN' | 'ms'
function getInitialLocale(): Locales {
  const savedLocale = localStorage.getItem('user-locale')
  if (savedLocale && ['en', 'zh-CN', 'ms'].includes(savedLocale)) { // 新增 'ms'
    return savedLocale as Locales
  }

  const browserLang = navigator.language
  if (browserLang.startsWith('en')) {
    return 'en'
  }
  if (browserLang.startsWith('ms')) { // 新增
    return 'ms' // 新增
  }

  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    'ms': ms,
  },
})

export default i18n
