import { gridToScreen } from '../../utils/isometric'
import { GridCoord, TowerTraitType } from '../../types/map'
import { CharacterUnit, UnitStatusEffect } from '../../stores/characterStore'

export interface ProcessStatusEffectsResult {
  maxSlowPercent: number
  dotDamage: number
  dotColor?: number
  dotText?: string
  unitDied: boolean
}

export class CrowdSimulation {
  /**
   * Calculates the 0..7 isometric angle direction between two grid cells.
   */
  public static calculateDirection(
    fromCol: number,
    fromRow: number,
    toCol: number,
    toRow: number,
    tileWidth: number,
    tileHeight: number
  ): number {
    const fromScreen = gridToScreen(fromCol, fromRow, tileWidth, tileHeight)
    const toScreen = gridToScreen(toCol, toRow, tileWidth, tileHeight)

    const dx = toScreen.x - fromScreen.x
    const dy = toScreen.y - fromScreen.y

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 2

    let angle = Math.atan2(dy, dx)
    if (angle < 0) angle += 2 * Math.PI

    const sector = Math.floor(((angle + Math.PI / 8) % (2 * Math.PI)) / (Math.PI / 4))
    const dirMap = [1, 2, 3, 4, 5, 6, 7, 0]
    return dirMap[sector] !== undefined ? dirMap[sector] : 2
  }

  /**
   * Calculates perpendicular offset for 2 units marching side-by-side.
   */
  public static calculateSideOffset(
    baseScreenX: number,
    baseScreenY: number,
    ptA: GridCoord,
    ptB: GridCoord,
    sideOffset: number,
    tileWidth: number,
    tileHeight: number
  ): { screenX: number; screenY: number } {
    if (sideOffset === 0) {
      return { screenX: baseScreenX, screenY: baseScreenY }
    }

    const ptAScreen = gridToScreen(ptA.col, ptA.row, tileWidth, tileHeight)
    const ptBScreen = gridToScreen(ptB.col, ptB.row, tileWidth, tileHeight)
    const dx = ptBScreen.x - ptAScreen.x
    const dy = ptBScreen.y - ptAScreen.y
    const len = Math.hypot(dx, dy) || 1
    const perpX = -dy / len
    const perpY = dx / len

    const offsetDist = tileWidth * 0.15 * sideOffset
    return {
      screenX: baseScreenX + perpX * offsetDist,
      screenY: baseScreenY + perpY * offsetDist,
    }
  }

  /**
   * Processes DoT ticks, slows, and effect expirations for a unit.
   */
  public static processStatusEffects(
    unit: CharacterUnit,
    deltaSec: number
  ): ProcessStatusEffectsResult {
    let maxSlowPercent = 0
    let dotDamage = 0
    let dotColor: number | undefined
    let dotText: string | undefined
    let unitDied = false

    if (!unit.statusEffects || unit.statusEffects.length === 0) {
      return { maxSlowPercent: 0, dotDamage: 0, unitDied: false }
    }

    let activeCount = 0
    for (let i = 0; i < unit.statusEffects.length; i++) {
      const effect = unit.statusEffects[i]
      effect.duration -= deltaSec

      if (effect.slowPercent && effect.slowPercent > maxSlowPercent) {
        maxSlowPercent = effect.slowPercent
      }

      // DoT tick damage
      if (effect.dps && effect.dps > 0 && !unit.isDead) {
        effect.tickTimer = (effect.tickTimer || 0) + deltaSec
        if (effect.tickTimer >= 0.5) {
          const tickDmg = Math.max(1, Math.round(effect.dps * effect.tickTimer))
          effect.tickTimer = 0
          dotDamage += tickDmg

          dotColor = 0xf97316
          dotText = `-${tickDmg}`
          if (effect.type === 'fire') { dotColor = 0xef4444; dotText = `-${tickDmg}` }
          else if (effect.type === 'poison') { dotColor = 0x10b981; dotText = `-${tickDmg}` }
          else if (effect.type === 'blood') { dotColor = 0xf43f5e; dotText = `-${tickDmg}` }
        }
      }

      if (effect.duration > 0) {
        unit.statusEffects[activeCount++] = effect
      }
    }
    unit.statusEffects.length = activeCount

    if (dotDamage > 0) {
      unit.currentHp = Math.max(0, unit.currentHp - dotDamage)
      if (unit.currentHp <= 0) {
        unitDied = true
        unit.isDead = true
        unit.action = 'Pickup'
        unit.frameIndex = 0
        unit.animTimer = 0
        unit.deathFade = 1.0
      }
    }

    return {
      maxSlowPercent,
      dotDamage,
      dotColor,
      dotText,
      unitDied,
    }
  }
}
