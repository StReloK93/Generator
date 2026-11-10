import { Graphics } from 'pixi.js'
import type { ProjectileDefinition } from '../../../types/projectile'
import { isInstantProjectile, launchSlots } from '../../../domain/projectile'
import { ProjectileFx } from './ProjectileFx'

export interface StagePoint {
  x: number
  y: number
}

interface PreviewShot {
  id: string
  def: ProjectileDefinition
  startX: number
  startY: number
  x: number
  y: number
  traveled: number
  total: number
  offsetPerp: number
  phaseOffset: number
}

let shotCounter = 0
/** The preview's one target dummy, so strikes follow it like they follow a unit in the game */
const PREVIEW_TARGET_ID = 'preview-target'
/** How far below the target point the preview dummy stands (ProjectilePreview draws its ground ring there) */
const DUMMY_FEET = 16

/**
 * A small firing range for previews (studio, projectile picker, tower preview): fires a projectile from a muzzle
 * to a target that may move, flying it the same way the game does (straight homing path + the same visuals).
 */
export class ProjectilePreviewStage {
  public readonly fx: ProjectileFx
  /** Screen pixels per tile of projectile speed (previews are smaller than the map) */
  public pxPerTile = 26
  /** Time scale (slow motion below 1) */
  public timeScale = 1
  private shots: PreviewShot[] = []

  constructor(private readonly g: Graphics) {
    this.fx = new ProjectileFx(g)
  }

  /** Fires one shot of `def` (all of its volley) from `from` at `to` */
  public fire(def: ProjectileDefinition, from: StagePoint, to: StagePoint): void {
    if (isInstantProjectile(def)) {
      this.fx.strike(def, from.x, from.y, to.x, to.y, PREVIEW_TARGET_ID)
      this.fx.impact(def, to.x, to.y)
      return
    }
    const total = Math.hypot(to.x - from.x, to.y - from.y) || 1
    for (const slot of launchSlots(def.launch)) {
      this.shots.push({
        id: `preview-${++shotCounter}`,
        def,
        startX: from.x,
        startY: from.y,
        x: from.x,
        y: from.y,
        traveled: -slot.delay * total,
        total,
        offsetPerp: slot.offsetPerp,
        phaseOffset: slot.phaseOffset,
      })
    }
  }

  /** Moves the shots toward `target` (homing like the game), draws everything and fires impacts on arrival */
  public update(rawDt: number, target: StagePoint): void {
    const dt = rawDt * this.timeScale
    this.g.clear()
    this.fx.beginFrame(dt)

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]
      const step = s.def.motion.speed * this.pxPerTile * dt
      if (s.traveled < 0) {
        s.traveled += step
        continue
      }
      const dx = target.x - s.x
      const dy = target.y - s.y
      const dist = Math.hypot(dx, dy)
      if (dist <= step || dist < 4) {
        this.fx.impact(s.def, target.x, target.y)
        this.shots.splice(i, 1)
        continue
      }
      s.x += (dx / dist) * step
      s.y += (dy / dist) * step
      s.traveled += step
      s.total = s.traveled + dist
      this.fx.drawFlying({ ...s, targetX: target.x, targetY: target.y })
    }

    // The dummy's feet (its ground ring) are 16px below its centre, the point shots fly at
    this.fx.endFrame(id => (id === PREVIEW_TARGET_ID ? { x: target.x, y: target.y + DUMMY_FEET, height: DUMMY_FEET } : null))
  }

  public clear(): void {
    this.shots.length = 0
    this.fx.clear()
    this.g.clear()
  }
}
