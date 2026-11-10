import { combatEvents } from './combatEvents'
import { getProjectile, projectileColor } from '../domain/projectile'

/** Screen pixels per tile of splash radius — the same scale the splash damage check uses. */
export const SPLASH_PX_PER_TILE = 64

/**
 * Single source for projectile hit visuals. The host simulation and multiplayer clients both call
 * these, and every color/count comes from the projectile definition, so a hit looks identical everywhere.
 */
export function emitProjectileImpact(x: number, y: number, projectileType: string, splashRadiusTiles = 0): void {
  combatEvents.emitImpact({ x, y, projectileType })
  if (splashRadiusTiles > 0) {
    combatEvents.emitShockwave({
      x,
      y,
      maxRadius: splashRadiusTiles * SPLASH_PX_PER_TILE,
      color: projectileColor(getProjectile(projectileType)),
    })
  }
}

/** Instant attack (sky strike, beam) drawn from the tower muzzle to the target; it follows `targetUnitId` while it lasts. */
export function emitProjectileStrike(startX: number, startY: number, x: number, y: number, projectileType: string, targetUnitId?: string): void {
  combatEvents.emitStrike({ x, y, startX, startY, projectileType, targetUnitId: targetUnitId || undefined })
}
