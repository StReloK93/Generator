import { TargetStrategy } from '../../types/combat'
import { CharacterUnit } from '../../types/unit'
import { gridToScreen } from '../../utils/isometric'

export class TargetingSystem {
  /**
   * Finds the best target unit for a tower based on range, strategy, and sticky lock.
   */
  public static selectTarget(
    towerCol: number,
    towerRow: number,
    range: number,
    strategy: TargetStrategy = 'first',
    activeUnits: CharacterUnit[],
    lockedUnitId?: string | null
  ): CharacterUnit | null {
    // 1. Check sticky target lock
    if (lockedUnitId) {
      const locked = activeUnits.find(u => u.id === lockedUnitId)
      if (locked && !locked.lifecycle.isDead && !locked.lifecycle.hasReachedEnd && locked.lifecycle.isSpawned) {
        if (Math.abs(locked.movement.currentCol - towerCol) <= range && Math.abs(locked.movement.currentRow - towerRow) <= range) {
          const distInTiles = Math.hypot(locked.movement.currentCol - towerCol, locked.movement.currentRow - towerRow)
          if (distInTiles <= range) {
            return locked
          }
        }
      }
    }

    // 2. Select new target based on strategy
    let bestTarget: CharacterUnit | null = null
    let bestScore = -Infinity

    for (let i = 0; i < activeUnits.length; i++) {
      const unit = activeUnits[i]
      if (!unit.lifecycle.isSpawned || unit.lifecycle.isDead || unit.lifecycle.hasReachedEnd) continue

      if (Math.abs(unit.movement.currentCol - towerCol) > range || Math.abs(unit.movement.currentRow - towerRow) > range) {
        continue
      }

      const distInTiles = Math.hypot(unit.movement.currentCol - towerCol, unit.movement.currentRow - towerRow)
      if (distInTiles <= range) {
        let score = 0
        if (strategy === 'first') {
          score = unit.movement.distanceTraveled
        } else if (strategy === 'last') {
          score = -unit.movement.distanceTraveled
        } else if (strategy === 'strongest') {
          score = unit.combat.currentHp || 0
        } else if (strategy === 'weakest') {
          score = -(unit.combat.currentHp || 0)
        } else if (strategy === 'closest') {
          score = -distInTiles
        }

        if (score > bestScore) {
          bestScore = score
          bestTarget = unit
        }
      }
    }

    return bestTarget
  }

  /**
   * Finds nearest chain targets for chain effects.
   */
  public static findChainTargets(
    originTargetId: string,
    originScreenX: number,
    originScreenY: number,
    maxChains: number,
    maxRadiusPx: number,
    activeUnits: CharacterUnit[],
    tileWidth: number,
    tileHeight: number
  ): CharacterUnit[] {
    const chained: CharacterUnit[] = []
    const visitedIds = new Set<string>([originTargetId])
    let lastX = originScreenX
    let lastY = originScreenY

    for (let i = 0; i < maxChains; i++) {
      let nearest: CharacterUnit | null = null
      let nearestDist = Infinity

      for (const u of activeUnits) {
        if (visitedIds.has(u.id) || u.lifecycle.isDead || !u.lifecycle.isSpawned || u.lifecycle.hasReachedEnd) continue
        const uScreen = gridToScreen(u.movement.currentCol, u.movement.currentRow, tileWidth, tileHeight)
        const dist = Math.hypot(uScreen.x - lastX, uScreen.y - lastY)
        if (dist <= maxRadiusPx && dist < nearestDist) {
          nearestDist = dist
          nearest = u
        }
      }

      if (nearest) {
        visitedIds.add(nearest.id)
        chained.push(nearest)
        const nScreen = gridToScreen(nearest.movement.currentCol, nearest.movement.currentRow, tileWidth, tileHeight)
        lastX = nScreen.x
        lastY = nScreen.y
      } else {
        break
      }
    }

    return chained
  }
}
