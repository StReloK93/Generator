/**
 * Telegram Mini App integration: the one place that talks to Telegram's WebApp SDK (telegram-web-app.js in
 * index.html). Outside Telegram every function here does nothing, so callers never check where they run.
 */

interface TelegramUser {
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

interface TelegramWebApp {
  initData: string
  initDataUnsafe: { user?: TelegramUser; start_param?: string }
  platform: string
  isVersionAtLeast(version: string): boolean
  ready(): void
  expand(): void
  requestFullscreen(): void
  lockOrientation(): void
  unlockOrientation(): void
  disableVerticalSwipes(): void
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor(color: string): void
  openTelegramLink(url: string): void
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
  HapticFeedback: {
    impactOccurred(style: HapticImpact): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

const sdk = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
/** The SDK script defines WebApp in every browser; only Telegram itself fills initData */
const tg: TelegramWebApp | null = sdk && sdk.initData ? sdk : null

export const isTelegram = tg !== null

const supports = (version: string): boolean => tg?.isVersionAtLeast(version) ?? false
const isPhone = (): boolean => tg !== null && (tg.platform === 'android' || tg.platform === 'ios')

/** The app's background (slate-950): Telegram's header and bars take it so the game has no seams */
const APP_BACKGROUND = '#161210'

/** Starts the Mini App: full screen on phones, colors, no swipe-to-close. Call once on startup. */
export function initTelegram(): void {
  if (!tg) return
  document.documentElement.classList.add('tg-app')
  tg.ready()
  tg.expand()
  if (supports('6.1')) {
    tg.setHeaderColor(APP_BACKGROUND)
    tg.setBackgroundColor(APP_BACKGROUND)
  }
  if (supports('7.10')) tg.setBottomBarColor(APP_BACKGROUND)
  if (supports('7.7')) tg.disableVerticalSwipes()
  if (supports('8.0') && isPhone()) tg.requestFullscreen()
}

/**
 * Telegram can only lock the orientation the phone is in right now. So it is locked once the player has turned the
 * phone sideways in a game, and released everywhere else (locking at startup would trap a portrait phone).
 */
export function setLandscapeLock(lock: boolean): void {
  if (!tg || !supports('8.0') || !isPhone()) return
  if (lock) tg.lockOrientation()
  else tg.unlockOrientation()
}

/** Asks before Telegram closes the app (in a room or a running game, where closing would drop the player) */
export function setClosingConfirmation(enabled: boolean): void {
  if (!tg || !supports('6.2')) return
  if (enabled) tg.enableClosingConfirmation()
  else tg.disableClosingConfirmation()
}

let backHandler: (() => void) | null = null
const onBack = () => backHandler?.()

/** Telegram's own back button: shown while a page gives it a handler, hidden with null */
export function setBackButton(handler: (() => void) | null): void {
  if (!tg || !supports('6.1')) return
  tg.BackButton.offClick(onBack)
  backHandler = handler
  if (handler) {
    tg.BackButton.onClick(onBack)
    tg.BackButton.show()
  } else {
    tg.BackButton.hide()
  }
}

/** A short vibration on taps (phones only) */
export function haptic(style: HapticImpact = 'light'): void {
  if (tg && supports('6.1')) tg.HapticFeedback.impactOccurred(style)
}

export function hapticResult(type: 'error' | 'success' | 'warning'): void {
  if (tg && supports('6.1')) tg.HapticFeedback.notificationOccurred(type)
}

/** The player's Telegram name, used as the default nickname */
export function telegramUserName(): string {
  const user = tg?.initDataUnsafe.user
  if (!user) return ''
  return (user.first_name || user.username || '').trim().slice(0, 20)
}

/** The Telegram app's language (e.g. 'uz', 'ru', 'en') */
export function telegramLanguage(): string {
  return tg?.initDataUnsafe.user?.language_code?.slice(0, 2) ?? ''
}

const ROOM_START_PARAM = /^room_(\d{6})$/

/** The room a friend's invite opened the app with (t.me/<bot>/<app>?startapp=room_123456) */
export function telegramStartRoom(): string | null {
  return tg?.initDataUnsafe.start_param?.match(ROOM_START_PARAM)?.[1] ?? null
}

/** Opens Telegram's "share to chat" screen with a link (inside Telegram only) */
export function shareInTelegram(url: string, text: string): boolean {
  if (!tg) return false
  tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`)
  return true
}

/** The Mini App link that opens a room: t.me/<bot>/<app>?startapp=room_<code> */
export function telegramRoomLink(appUrl: string, roomCode: string): string {
  return `${appUrl}?startapp=room_${roomCode}`
}
