import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useI18nStore } from './stores/i18nStore'
import { loadProjectileLibrary } from './services/projectileLibrary'
import { loadBuiltinMaps } from './services/mapManager'
import './style.css'

async function initApp() {
  // Ensure the primary UI font is loaded before rendering UI
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.load('16px "Nunito Variable"')
      await document.fonts.ready
    } catch {
      // Graceful fallback
    }
  }

  loadProjectileLibrary()
  await loadBuiltinMaps()

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  const i18n = useI18nStore()
  app.config.globalProperties.$t = (key: string, params?: Record<string, string | number>) => i18n.t(key, params)

  app.mount('#app')
}

initApp()


