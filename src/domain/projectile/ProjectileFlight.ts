import type { LaunchConfig, ProjectileDefinition } from '../../types/projectile'

/** Beams and strikes hit at once; only flying projectiles travel. */
export function isInstantProjectile(def: ProjectileDefinition): boolean {
  return def.behavior !== 'flying'
}

/** One projectile of a shot: side offset (px), phase (rad) and how far behind the muzzle it starts (share of the flight) */
export interface LaunchSlot {
  offsetPerp: number
  phaseOffset: number
  delay: number
}

/**
 * The projectiles one shot fires. The host simulation, multiplayer clients and every preview spawn from this,
 * so a volley looks the same everywhere (offsetPerp / phaseOffset travel with the projectile).
 */
export function launchSlots(launch: LaunchConfig, random: () => number = Math.random): LaunchSlot[] {
  const count = Math.max(1, Math.round(launch.count))
  const slots: LaunchSlot[] = []
  for (let i = 0; i < count; i++) {
    const centered = i - (count - 1) / 2
    switch (launch.pattern) {
      case 'helix':
      case 'orbit':
        slots.push({ offsetPerp: launch.spread, phaseOffset: (Math.PI * 2 * i) / count, delay: 0 })
        break
      case 'stagger':
        slots.push({ offsetPerp: centered * launch.spread * 0.4, phaseOffset: 0, delay: i * 0.12 })
        break
      case 'scatter':
        slots.push({ offsetPerp: (random() - 0.5) * 2 * launch.spread, phaseOffset: random() * Math.PI * 2, delay: random() * 0.15 })
        break
      default:
        slots.push({ offsetPerp: count === 1 ? 0 : centered * launch.spread, phaseOffset: 0, delay: 0 })
    }
  }
  return slots
}

/** Where the body is drawn relative to its straight ground path: side shift and height above the ground (px). */
export interface FlightOffset {
  side: number
  lift: number
}

/**
 * Visual flight shape at `progress` (0..1). The simulation moves every projectile straight (homing) to its target;
 * arcs, helixes, fans and wobble are drawn on top of that path from this deterministic function.
 */
export function flightOffset(
  def: ProjectileDefinition,
  progress: number,
  totalDistance: number,
  offsetPerp = 0,
  phaseOffset = 0,
): FlightOffset {
  const p = Math.min(1, Math.max(0, progress))
  const envelope = Math.sin(p * Math.PI)
  const { launch, motion } = def
  let side = 0
  let lift = envelope * Math.min(140, totalDistance * 0.38) * motion.arc

  switch (launch.pattern) {
    case 'fan':
    case 'scatter':
      side = offsetPerp * envelope
      break
    case 'helix':
      side = offsetPerp * Math.sin(p * Math.PI * 2 * launch.turns + phaseOffset) * Math.min(1, envelope * 3)
      break
    case 'orbit': {
      const angle = phaseOffset + p * Math.PI * 2 * launch.turns
      const reach = Math.min(1, envelope * 3)
      side = Math.cos(angle) * offsetPerp * reach
      lift += Math.sin(angle) * offsetPerp * 0.7 * reach
      break
    }
    default:
      side = offsetPerp
  }

  if (motion.wobble > 0) side += Math.sin(p * Math.PI * 2 * motion.wobbleFreq + phaseOffset) * motion.wobble * envelope
  return { side, lift }
}
