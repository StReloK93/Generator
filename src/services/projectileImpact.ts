import { combatEvents } from './combatEvents'
import { getProjectileDefinition } from '../utils/projectileCatalog'

/** Screen pixels per tile of splash radius — the same scale the splash damage check uses. */
export const SPLASH_PX_PER_TILE = 64

/**
 * Single source for projectile hit visuals. The host simulation and multiplayer clients both call
 * these, and every color/count comes from the projectile definition, so a hit looks identical everywhere.
 */
export function emitProjectileImpact(x: number, y: number, projectileType: string, splashRadiusTiles = 0): void {
  combatEvents.emitImpact({ x, y, projectileType, isSplash: splashRadiusTiles > 0 })
  if (splashRadiusTiles > 0) {
    const def = getProjectileDefinition(projectileType)
    combatEvents.emitShockwave({
      x,
      y,
      maxRadius: splashRadiusTiles * SPLASH_PX_PER_TILE,
      color: def.impact.shockwaveColorHex ?? def.visual.colorHex,
    })
  }
}

/** Instant attack (sky strike, beam) drawn from the tower muzzle to the target. */
export function emitProjectileStrike(startX: number, startY: number, x: number, y: number, projectileType: string): void {
  combatEvents.emitStrike({ x, y, startX, startY, projectileType, duration: 0.45 })
}
