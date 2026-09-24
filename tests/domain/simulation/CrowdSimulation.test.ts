import { describe, it, expect } from 'vitest'
import { CrowdSimulation } from '@/domain/simulation/CrowdSimulation'
import { CharacterUnit } from '@/types/unit'

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
      identity: {
        routeId: 'route-1',
        routeIndex: 0,
        unitIndex: 0,
        pairIndex: 0,
        sideOffset: 0,
        model: 'male',
        variant: 'normal',
      },
      movement: {
        currentCol: 5,
        currentRow: 5,
        direction: 2,
        pathIndex: 0,
        pathInterpolation: 0,
        distanceTraveled: 0,
      },
      combat: {
        currentHp: 10,
        maxHp: 100,
        immunities: [],
        consecutiveHits: {},
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
      },
      animation: {
        action: 'Run',
        frameIndex: 0,
        animTimer: 0,
        animSpeed: 1.0,
      },
      lifecycle: {
        isSpawned: true,
        isDead: false,
        hasReachedEnd: false,
        deathFade: 1.0,
        celebrationTimer: 0,
      },
    }

    // Process 0.5s of game time
    const result = CrowdSimulation.processStatusEffects(unit, 0.5)

    expect(result.maxSlowPercent).toBe(50)
    expect(result.dotDamage).toBe(10)
    expect(result.unitDied).toBe(true)
    expect(unit.lifecycle.isDead).toBe(true)
    expect(unit.combat.currentHp).toBe(0)
    expect(unit.animation.action).toBe('Pickup') // death animation action
  })
})
