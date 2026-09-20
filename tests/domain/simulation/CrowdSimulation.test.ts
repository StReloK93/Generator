import { describe, it, expect } from 'vitest'
import { CrowdSimulation } from '@/domain/simulation/CrowdSimulation'
import { CharacterUnit } from '@/stores/characterStore'

describe('CrowdSimulation Domain Logic', () => {
  const tileWidth = 128
  const tileHeight = 64

  it('calculateDirection should return an isometric direction 0..7', () => {
    // Marching North-East
    const dirNE = CrowdSimulation.calculateDirection(0, 0, 5, 0, tileWidth, tileHeight)
    expect(dirNE).toBeGreaterThanOrEqual(0)
    expect(dirNE).toBeLessThanOrEqual(7)

    // Marching South-East
    const dirSE = CrowdSimulation.calculateDirection(0, 0, 0, 5, tileWidth, tileHeight)
    expect(dirSE).toBeGreaterThanOrEqual(0)
    expect(dirSE).toBeLessThanOrEqual(7)

    // Standing still / zero delta
    const dirStill = CrowdSimulation.calculateDirection(3, 3, 3, 3, tileWidth, tileHeight)
    expect(dirStill).toBe(2)
  })

  it('calculateSideOffset should apply perpendicular shifts for paired marching formation', () => {
    const ptA = { col: 0, row: 0 }
    const ptB = { col: 5, row: 0 }
    const baseScreenX = 100
    const baseScreenY = 100

    const leftUnit = CrowdSimulation.calculateSideOffset(
      baseScreenX,
      baseScreenY,
      ptA,
      ptB,
      -1,
      tileWidth,
      tileHeight
    )

    const rightUnit = CrowdSimulation.calculateSideOffset(
      baseScreenX,
      baseScreenY,
      ptA,
      ptB,
      1,
      tileWidth,
      tileHeight
    )

    // Left and Right units should have mirrored offsets from center
    expect(leftUnit.screenX).not.toBe(baseScreenX)
    expect(rightUnit.screenX).not.toBe(baseScreenX)
    expect(Math.abs(leftUnit.screenX - baseScreenX)).toBeCloseTo(
      Math.abs(rightUnit.screenX - baseScreenX)
    )
  })

  it('processStatusEffects should tick DoT damage, apply slow, and trigger death when HP reaches 0', () => {
    const unit: CharacterUnit = {
      id: 'unit-dot',
      name: 'Mob',
      characterModel: 'male',
      direction: 2,
      action: 'Run',
      frameIndex: 0,
      animTimer: 0,
      pathIndex: 0,
      pathInterpolation: 0,
      currentCol: 5,
      currentRow: 5,
      screenX: 100,
      screenY: 100,
      speed: 3.5,
      isSpawned: true,
      isDead: false,
      hasReachedEnd: false,
      currentHp: 10,
      maxHp: 100,
      spawnDelay: 0,
      totalDistance: 10,
      distanceTraveled: 0,
      routeId: 'route-1',
      statusEffects: [
        {
          type: 'fire',
          duration: 2.0,
          dps: 20, // 20 DPS -> in 0.5s ticks 10 dmg
        },
        {
          type: 'frost',
          duration: 3.0,
          slowPercent: 50,
        },
      ],
    }

    // Process 0.5s of game time
    const result = CrowdSimulation.processStatusEffects(unit, 0.5)

    expect(result.maxSlowPercent).toBe(50)
    expect(result.dotDamage).toBe(10)
    expect(result.unitDied).toBe(true)
    expect(unit.isDead).toBe(true)
    expect(unit.currentHp).toBe(0)
    expect(unit.action).toBe('Pickup') // death animation action
  })
})
