import { gridToScreen } from '../../utils/isometric'
import { GridCoord } from '../../types/map'
import { CharacterUnit } from '../../types/unit'

export interface ProcessStatusEffectsResult {
  maxSlowPercent: number
  dotDamage: number
  dotColor?: number
  dotText?: string
  unitDied: boolean
}

export interface UnitAdvanceResult {
  hasReachedEnd: boolean
  isJustReachedEnd: boolean
}

/**
 * CrowdSimulation — Pure Domain Logic for Unit and Crowd Simulation.
 * 
 * SOLID: Single Responsibility Principle (SRP)
 * Pure domain calculations: isometric direction angles, side offsets, route progress interpolation,
 * animation updates, and DoT/slow status tick processing.
 */
export class CrowdSimulation {
  /**
   * Calculates 0..7 isometric direction angle between two points.
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
   * Calculates side offset perpendicular to the movement segment for pairs formation.
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
   * Processes status effects (DoT: burn, poison, bleed and Slow: frost) on a unit.
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

    const effects = unit.combat.statusEffects
    if (!effects || effects.length === 0) {
      return { maxSlowPercent: 0, dotDamage: 0, unitDied: false }
    }

    let activeCount = 0
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i]
      effect.duration -= deltaSec

      if (effect.slowPercent && effect.slowPercent > maxSlowPercent) {
        maxSlowPercent = effect.slowPercent
      }

      // DoT damage tick (every 0.5 seconds)
      if (effect.dps && effect.dps > 0 && !unit.lifecycle.isDead) {
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
        effects[activeCount++] = effect
      }
    }
    effects.length = activeCount

    if (dotDamage > 0) {
      unit.combat.currentHp = Math.max(0, unit.combat.currentHp - dotDamage)
      if (unit.combat.currentHp <= 0) {
        unitDied = true
        unit.lifecycle.isDead = true
        unit.animation.action = 'Pickup'
        unit.animation.frameIndex = 0
        unit.animation.animTimer = 0
        unit.lifecycle.deathFade = 1.0
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

  /**
   * Advances the unit position along the route using authoritative grid interpolation.
   */
  public static advanceUnitPosition(
    unit: CharacterUnit,
    route: GridCoord[],
    deltaSec: number,
    baseSpeed: number,
    speedMultiplier: number,
    formation: 'single' | 'pairs',
    tileWidth: number,
    tileHeight: number
  ): UnitAdvanceResult {
    unit.movement.distanceTraveled += (baseSpeed * speedMultiplier) * deltaSec

    const unitDist = unit.movement.distanceTraveled
    const maxRouteIndex = route.length - 1

    // Route end reached (Base / Target reached)
    if (unitDist >= maxRouteIndex) {
      const isJustReached = !unit.lifecycle.hasReachedEnd
      unit.lifecycle.hasReachedEnd = true
      unit.movement.pathIndex = maxRouteIndex
      unit.movement.pathInterpolation = 0
      unit.animation.action = 'Pickup'
      unit.movement.currentCol = route[maxRouteIndex].col
      unit.movement.currentRow = route[maxRouteIndex].row
      return { hasReachedEnd: true, isJustReachedEnd: isJustReached }
    }

    // Moving along the path
    unit.lifecycle.hasReachedEnd = false
    unit.animation.action = 'Run'
    unit.movement.pathIndex = Math.floor(unitDist)
    unit.movement.pathInterpolation = unitDist - unit.movement.pathIndex

    const idxA = unit.movement.pathIndex
    const idxB = Math.min(maxRouteIndex, idxA + 1)
    const ptA = route[idxA]
    const ptB = route[idxB]

    const t = unit.movement.pathInterpolation
    unit.movement.currentCol = ptA.col + (ptB.col - ptA.col) * t
    unit.movement.currentRow = ptA.row + (ptB.row - ptA.row) * t

    if (idxA !== idxB) {
      unit.movement.direction = this.calculateDirection(
        ptA.col,
        ptA.row,
        ptB.col,
        ptB.row,
        tileWidth,
        tileHeight
      )
    }

    return { hasReachedEnd: false, isJustReachedEnd: false }
  }

  /**
   * Updates unit animation frame progression over time.
   */
  public static updateUnitAnimation(
    unit: CharacterUnit,
    deltaSec: number,
    maxFrames: number,
    baseSpeed: number = 2.5
  ): void {
    unit.animation.animTimer += deltaSec
    const animMultiplier = unit.animation.animSpeed || 1.0
    const frameDuration = ((maxFrames > 15 ? 0.04 : 0.07) / Math.min(5, baseSpeed / 2.5)) / Math.max(0.1, animMultiplier)
    if (unit.animation.animTimer >= frameDuration) {
      unit.animation.animTimer = 0
      unit.animation.frameIndex = (unit.animation.frameIndex + 1) % maxFrames
    }
  }
}
