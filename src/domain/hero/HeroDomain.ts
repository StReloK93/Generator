import { GridCoord } from '../../types/map'
import { CrowdSimulation } from '../simulation/CrowdSimulation'

export interface HeroState {
  id: string
  name: string
  model: string
  currentCol: number
  currentRow: number
  direction: number
  action: 'Idle' | 'Run' | 'Pickup'
  frameIndex: number
  animTimer: number
  speed: number // tiles per second
  path: GridCoord[]
  targetCol?: number
  targetRow?: number
  isSelected: boolean
  isEnabled: boolean
  scale: number
}

export class HeroDomain {
  /**
   * Calculates 8-direction isometric facing angle.
   */
  public static calculateDirection(
    c1: number,
    r1: number,
    c2: number,
    r2: number,
    tileWidth: number = 128,
    tileHeight: number = 64
  ): number {
    return CrowdSimulation.calculateDirection(c1, r1, c2, r2, tileWidth, tileHeight)
  }

  /**
   * Advances hero along their active path waypoints.
   */
  public static advanceHero(
    hero: HeroState,
    deltaSec: number,
    tileWidth: number = 128,
    tileHeight: number = 64
  ): boolean {
    if (!hero.path || hero.path.length <= 1) {
      hero.action = 'Idle'
      return false
    }

    const moveDist = hero.speed * deltaSec
    let remainingMove = moveDist

    while (remainingMove > 0 && hero.path.length > 1) {
      const currentTarget = hero.path[1]
      const dx = currentTarget.col - hero.currentCol
      const dy = currentTarget.row - hero.currentRow
      const dist = Math.hypot(dx, dy)

      // Update facing direction along the active movement segment before reaching waypoint
      if (dist >= 0.001) {
        hero.direction = this.calculateDirection(
          hero.currentCol,
          hero.currentRow,
          currentTarget.col,
          currentTarget.row,
          tileWidth,
          tileHeight
        )
      }

      if (dist <= remainingMove || dist < 0.001) {
        hero.currentCol = currentTarget.col
        hero.currentRow = currentTarget.row
        hero.path.shift() // Reached waypoint
        remainingMove -= dist
      } else {
        const factor = remainingMove / dist
        hero.currentCol += dx * factor
        hero.currentRow += dy * factor
        remainingMove = 0
      }
    }

    if (hero.path.length <= 1) {
      hero.action = 'Idle'
      hero.path = []
      return false
    }

    hero.action = 'Run'
    return true
  }

  /**
   * Advances animation frames for the hero.
   */
  public static updateAnimation(
    hero: HeroState,
    deltaSec: number,
    maxFrames: number = 16
  ): void {
    hero.animTimer += deltaSec

    if (hero.action === 'Idle') {
      if (hero.animTimer >= 0.16) {
        hero.animTimer = 0
        hero.frameIndex = (hero.frameIndex + 1) % maxFrames
      }
      return
    }

    // Run animation frequency based on hero speed
    const frameDuration = Math.max(0.04, 0.28 / Math.max(1, hero.speed))
    if (hero.animTimer >= frameDuration) {
      hero.animTimer = 0
      hero.frameIndex = (hero.frameIndex + 1) % maxFrames
    }
  }
}
