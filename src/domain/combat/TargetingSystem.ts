import { CombatUnitTarget, TargetStrategy } from './types'

export class TargetingSystem {
  /**
   * Finds the best target unit for a tower based on range, strategy, and sticky lock.
   */
  public static selectTarget(
    towerCol: number,
    towerRow: number,
    range: number,
    strategy: TargetStrategy = 'first',
    activeUnits: CombatUnitTarget[],
    lockedUnitId?: string | null
  ): CombatUnitTarget | null {
    // 1. Check sticky target lock
    if (lockedUnitId) {
      const locked = activeUnits.find(u => u.id === lockedUnitId)
      if (locked && !locked.isDead && !locked.hasReachedEnd && locked.isSpawned) {
        if (Math.abs(locked.currentCol - towerCol) <= range && Math.abs(locked.currentRow - towerRow) <= range) {
          const distInTiles = Math.hypot(locked.currentCol - towerCol, locked.currentRow - towerRow)
          if (distInTiles <= range) {
            return locked
          }
        }
      }
    }

    // 2. Select new target based on strategy
    let bestTarget: CombatUnitTarget | null = null
    let bestScore = -Infinity

    for (let i = 0; i < activeUnits.length; i++) {
      const unit = activeUnits[i]
      if (!unit.isSpawned || unit.isDead || unit.hasReachedEnd) continue

      if (Math.abs(unit.currentCol - towerCol) > range || Math.abs(unit.currentRow - towerRow) > range) {
        continue
      }

      const distInTiles = Math.hypot(unit.currentCol - towerCol, unit.currentRow - towerRow)
      if (distInTiles <= range) {
        let score = 0
        if (strategy === 'first') {
          score = unit.distanceTraveled ?? (unit.pathIndex + (unit.pathInterpolation || 0))
        } else if (strategy === 'last') {
          score = -(unit.distanceTraveled ?? (unit.pathIndex + (unit.pathInterpolation || 0)))
        } else if (strategy === 'strongest') {
          score = unit.currentHp || 0
        } else if (strategy === 'weakest') {
          score = -(unit.currentHp || 0)
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
}
