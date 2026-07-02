import { createI18n } from 'vue-i18n'

import enAuth from './locales/en/auth.json'
import kmAuth from './locales/km/auth.json'
import enCommon from './locales/en/common.json'
import kmCommon from './locales/km/common.json'
import enDashboard from './locales/en/dashboard.json'
import kmDashboard from './locales/km/dashboard.json'

// ✅ get saved language from browser
const savedLang = localStorage.getItem('lang')

// ✅ use saved language OR fallback to 'en'
const locale = savedLang ? savedLang : 'en'

const messages = {
  en: {
    auth: enAuth,
    common: enCommon,
    dashboard: enDashboard,
  },
  km: {
    auth: kmAuth,
    common: kmCommon,
    dashboard: kmDashboard,
  },
}

const i18n = createI18n({
  legacy: false,
  locale, 
  fallbackLocale: 'en',
  messages,
})

export default i18n
