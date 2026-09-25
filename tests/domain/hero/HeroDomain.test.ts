import { describe, it, expect } from 'vitest'
import { AStarPathfinder } from '../../../src/domain/pathfinding/AStarPathfinder'
import { HeroDomain, HeroState } from '../../../src/domain/hero/HeroDomain'

describe('AStarPathfinder & HeroDomain', () => {
  it('finds valid direct path from start to target on isometric grid', () => {
    const path = AStarPathfinder.findPath(
      { col: 0, row: 0 },
      { col: 3, row: 3 },
      10,
      10
    )

    expect(path.length).toBeGreaterThan(1)
    expect(path[0]).toEqual({ col: 0, row: 0 })
    expect(path[path.length - 1]).toEqual({ col: 3, row: 3 })
  })

  it('calculates 8-directional facing correctly', () => {
    // Going straight down in screen space (increasing col & row) is dir 3
    const dirSouth = HeroDomain.calculateDirection(0, 0, 2, 2)
    expect(dirSouth).toBe(3)

    // Going to higher col (down-right in screen space) is dir 2
    const dirSE = HeroDomain.calculateDirection(0, 0, 2, 0)
    expect(dirSE).toBe(2)
  })

  it('advances hero position along waypoints and switches to Run/Idle', () => {
    const hero: HeroState = {
      id: 'test-hero',
      name: 'Hero',
      model: 'warrior',
      currentCol: 0,
      currentRow: 0,
      direction: 2,
      action: 'Idle',
      frameIndex: 0,
      animTimer: 0,
      speed: 4.0,
      path: [
        { col: 0, row: 0 },
        { col: 2, row: 0 },
      ],
      isSelected: true,
      isEnabled: true,
      scale: 1.0,
    }

    const isMoving = HeroDomain.advanceHero(hero, 0.25)
    expect(isMoving).toBe(true)
    expect(hero.action).toBe('Run')
    expect(hero.currentCol).toBeGreaterThan(0)

    // Move past the end of path
    HeroDomain.advanceHero(hero, 1.0)
    expect(hero.action).toBe('Idle')
    expect(hero.currentCol).toBe(2)
    // Preserves movement direction (dir 2 for col + 2)
    expect(hero.direction).toBe(2)
  })
})
