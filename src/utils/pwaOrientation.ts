import { ref } from 'vue'

export const isPortrait = ref<boolean>(false)
export const isMobileDevice = ref<boolean>(false)
export const isFullscreen = ref<boolean>(false)
export const isStandalone = ref<boolean>(false)
export const canInstallPwa = ref<boolean>(false)
export const isTelegramWebApp = ref<boolean>(false)

let deferredInstallPrompt: any = null

/**
 * Initializes Telegram Mini App integration if running inside Telegram
 */
export function initTelegramWebApp(): void {
  if (typeof window === 'undefined') return
  const tg = (window as any).Telegram?.WebApp
  if (tg) {
    isTelegramWebApp.value = true
    try {
      if (typeof tg.ready === 'function') tg.ready()
      if (typeof tg.expand === 'function') tg.expand()

      const isVersionAtLeast = (v: string): boolean => {
        try {
          return typeof tg.isVersionAtLeast === 'function' ? tg.isVersionAtLeast(v) : false
        } catch {
          return false
        }
      }

      if (isVersionAtLeast('7.7') && typeof tg.disableVerticalSwipes === 'function') {
        try { tg.disableVerticalSwipes() } catch {}
      }
      if (isVersionAtLeast('8.0') && typeof tg.requestFullscreen === 'function') {
        try { tg.requestFullscreen() } catch {}
      }
      if (isVersionAtLeast('8.0') && typeof tg.lockOrientation === 'function') {
        try { tg.lockOrientation('landscape') } catch {}
      }
    } catch {
      // Silently ignore legacy Telegram client limitations
    }
  }
}

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
 * Detects if the current device is a mobile phone or tablet
 */
export function checkMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window

  // Treat as mobile if UA matches or if touch device with typical mobile/tablet viewport width
  return isMobileUA || (isTouch && Math.min(window.innerWidth, window.innerHeight) <= 1024)
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
    isTelegramWebApp.value
  )
}

/**
 * Programmatically requests landscape orientation lock.
 * If needed, enters Fullscreen first (since Screen Orientation API requires fullscreen on many mobile browsers).
 */
export async function lockLandscape(): Promise<boolean> {
  try {
    // 0. Telegram Mini App native landscape & fullscreen if running in Telegram
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      const isVersionAtLeast = (v: string) => typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast(v)
      if (isVersionAtLeast('8.0')) {
        if (typeof tg.requestFullscreen === 'function') try { tg.requestFullscreen() } catch {}
        if (typeof tg.lockOrientation === 'function') try { tg.lockOrientation('landscape') } catch {}
      }
    }

    // 1. Enter Fullscreen on document element (supporting all browser vendor prefixes)
    const doc = document as any
    const docEl = (document.documentElement || document.body) as any
    const isAlreadyFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    )

    if (!isAlreadyFs) {
      const requestFs =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.webkitRequestFullScreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen

      if (requestFs) {
        try {
          await requestFs.call(docEl)
        } catch {
          // Fullscreen request might require gesture or fail on some iOS versions
        }
      }
    }

    // 2. Attempt Screen Orientation Lock
    const screenAny = window.screen as any
    const orient = screenAny?.orientation
    if (orient && typeof orient.lock === 'function') {
      try {
        await orient.lock('landscape')
        return true
      } catch {
        try {
          await orient.lock('landscape-primary')
          return true
        } catch {}
      }
    } else if (screenAny?.lockOrientation) {
      try {
        screenAny.lockOrientation('landscape')
        return true
      } catch {}
    } else if (screenAny?.webkitLockOrientation) {
      try {
        screenAny.webkitLockOrientation('landscape')
        return true
      } catch {}
    } else if (screenAny?.mozLockOrientation) {
      try {
        screenAny.mozLockOrientation('landscape')
        return true
      } catch {}
    }
  } catch {
    // Silently continue
  }
  return false
}

/**
 * Unlocks orientation lock
 */
export function unlockOrientation(): void {
  try {
    const screenAny = window.screen as any
    if (screenAny?.orientation?.unlock) {
      screenAny.orientation.unlock()
    } else if (screenAny?.unlockOrientation) {
      screenAny.unlockOrientation()
    }
  } catch {
    // Silently continue
  }
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
    isMobileDevice.value = checkMobile()
    isStandalone.value = checkStandalone()
    isFullscreen.value = !!document.fullscreenElement
  }

  // Initialize Telegram Mini App if present
  initTelegramWebApp()

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
