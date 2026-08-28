/**
 * Fullscreen utility helper for Mobile and Desktop browsers
 */

export async function requestAppFullscreen(element: HTMLElement = document.documentElement): Promise<boolean> {
  try {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }
      return true
    }
  } catch (err) {
    console.warn('Fullscreen request bypassed/unsupported by browser environment:', err)
  }
  return false
}

export async function exitAppFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }
      return true
    }
  } catch (err) {
    console.warn('Exit fullscreen error:', err)
  }
  return false
}

export async function toggleAppFullscreen(element: HTMLElement = document.documentElement): Promise<boolean> {
  if (isAppFullscreen()) {
    await exitAppFullscreen()
    return false
  } else {
    await requestAppFullscreen(element)
    return true
  }
}

export function isAppFullscreen(): boolean {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement)
}
