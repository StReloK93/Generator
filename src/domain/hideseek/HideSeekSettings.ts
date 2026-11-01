import { HideSeekSettings } from '../../types/map'

/** Single owner of the hide & seek rule defaults (used only when a map does not define a value). */
export const DEFAULT_HIDE_SEEK_SETTINGS: HideSeekSettings = {
  roundTime: 180,
  hideTime: 5,
  runSpeed: 3.2,
  sneakSpeed: 0.8,
  visionRange: 10,
  visionAngle: 90,
  hearingRange: 9,
  catchDistance: 0.9,
  chestCount: 5,
}

function positive(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function normalizeHideSeekSettings(raw?: Partial<Record<keyof HideSeekSettings, unknown>> | null): HideSeekSettings {
  const s = raw || {}
  const d = DEFAULT_HIDE_SEEK_SETTINGS
  return {
    roundTime: positive(s.roundTime, d.roundTime),
    hideTime: positive(s.hideTime, d.hideTime),
    runSpeed: positive(s.runSpeed, d.runSpeed),
    sneakSpeed: positive(s.sneakSpeed, d.sneakSpeed),
    visionRange: positive(s.visionRange, d.visionRange),
    visionAngle: Math.min(180, positive(s.visionAngle, d.visionAngle)),
    hearingRange: positive(s.hearingRange, d.hearingRange),
    catchDistance: positive(s.catchDistance, d.catchDistance),
    chestCount: Math.round(positive(s.chestCount, d.chestCount)),
  }
}
