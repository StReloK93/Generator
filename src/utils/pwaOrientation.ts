import { ref } from 'vue'
import { isTelegram } from '../services/telegram'

export const isPortrait = ref<boolean>(false)
export const isFullscreen = ref<boolean>(false)
export const isStandalone = ref<boolean>(false)
export const canInstallPwa = ref<boolean>(false)

let deferredInstallPrompt: any = null

/**
 * Checks whether the current screen is in portrait orientation
 */
export function checkOrientation(): boolean {
  if (typeof window === 'undefined') return false
  
  // 1. Screen Orientation API check
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('portrait')
  }

  // 2. Aspect ratio fallback (window dimensions)
  return window.innerHeight > window.innerWidth
}

/**
 * Checks if running as an installed PWA (Standalone/Fullscreen display mode)
 */
export function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    isTelegram
  )
}

/**
 * Triggers native PWA install prompt if available
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) return false
  try {
    deferredInstallPrompt.prompt()
    const choiceResult = await deferredInstallPrompt.userChoice
    deferredInstallPrompt = null
    canInstallPwa.value = false
    return choiceResult.outcome === 'accepted'
  } catch {
    return false
  }
}

/**
 * Initializes listeners for orientation, resize, fullscreen, and PWA install events
 */
export function initPwaAndOrientation(): () => void {
  if (typeof window === 'undefined') return () => {}

  const updateState = () => {
    isPortrait.value = checkOrientation()
    isStandalone.value = checkStandalone()
    isFullscreen.value = !!document.fullscreenElement
  }

  // Initial read
  updateState()

  // Orientation & Resize listeners
  const onOrientationChange = () => {
    // Delay slightly to let viewport dimensions stabilize after rotation animation
    setTimeout(updateState, 100)
    setTimeout(updateState, 300)
  }

  window.addEventListener('resize', updateState, { passive: true })
  window.addEventListener('orientationchange', onOrientationChange, { passive: true })
  document.addEventListener('fullscreenchange', updateState, { passive: true })

  if (window.screen?.orientation) {
    window.screen.orientation.addEventListener('change', updateState)
  }

  // PWA Install Prompt Listener
  const onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault()
    deferredInstallPrompt = e
    canInstallPwa.value = true
  }

  // PWA App Installed Listener
  const onAppInstalled = () => {
    deferredInstallPrompt = null
    canInstallPwa.value = false
    isStandalone.value = true
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path for subpath deployment compatibility
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('[PWA] Service worker registration warning:', err)
      })
    })
  }

  return () => {
    window.removeEventListener('resize', updateState)
    window.removeEventListener('orientationchange', onOrientationChange)
    document.removeEventListener('fullscreenchange', updateState)
    if (window.screen?.orientation) {
      window.screen.orientation.removeEventListener('change', updateState)
    }
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  }
}
