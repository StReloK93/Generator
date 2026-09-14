import { Projectile, DamageFloater, ExplosionRing } from '../../stores/towerStore'
import { CombatUnitTarget } from './types'

export class CombatSimulation {
  /**
   * Advances damage floater particles in-place, returning active count.
   */
  public static updateDamageFloaters(floaters: DamageFloater[], deltaSec: number): number {
    let activeCount = 0
    for (let i = 0; i < floaters.length; i++) {
      const df = floaters[i]
      df.lifeTimer += deltaSec
      df.y -= deltaSec * 35 // Float upwards
      df.alpha = Math.max(0, 1.0 - df.lifeTimer / 0.85)
      if (df.lifeTimer < 0.85) {
        floaters[activeCount++] = df
      }
    }
    return activeCount
  }

  /**
   * Advances explosion rings in-place, returning active count.
   */
  public static updateExplosionRings(rings: ExplosionRing[], deltaSec: number): number {
    let activeCount = 0
    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i]
      ring.lifeTimer += deltaSec
      const prog = ring.lifeTimer / 0.45
      ring.radius = ring.maxRadius * prog
      ring.alpha = Math.max(0, 1.0 - prog)
      if (ring.lifeTimer < 0.45) {
        rings[activeCount++] = ring
      }
    }
    return activeCount
  }

  /**
   * Advances projectile flight, detecting impacts with targets.
   */
  public static updateProjectiles(
    projectiles: Projectile[],
    activeUnits: CombatUnitTarget[],
    tileHeight: number,
    deltaSec: number,
    onImpact: (proj: Projectile) => void
  ): number {
    let remainingCount = 0

    for (let i = 0; i < projectiles.length; i++) {
      const proj = projectiles[i]
      const targetUnit = activeUnits.find(u => u.id === proj.targetUnitId)
      if (targetUnit) {
        proj.targetX = targetUnit.screenX
        proj.targetY = targetUnit.screenY - tileHeight * 0.5
      }

      const dx = proj.targetX - proj.currentX
      const dy = proj.targetY - proj.currentY
      const distToTarget = Math.hypot(dx, dy)
      const moveStep = proj.speed * deltaSec

      if (distToTarget <= moveStep || distToTarget < 12) {
        onImpact(proj)
      } else {
        const dirX = dx / distToTarget
        const dirY = dy / distToTarget
        proj.currentX += dirX * moveStep
        proj.currentY += dirY * moveStep
        proj.traveledDistance += moveStep
        projectiles[remainingCount++] = proj
      }
    }

    return remainingCount
  }
}
