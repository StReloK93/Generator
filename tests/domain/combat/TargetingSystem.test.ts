import { describe, it, expect } from 'vitest'
import { TargetingSystem } from '@/domain/combat/TargetingSystem'
import { CharacterUnit } from '@/types/unit'

describe('TargetingSystem Domain Logic', () => {
  const towerCol = 5
  const towerRow = 5
  const range = 4.0

  const createUnit = (
    id: string,
    col: number,
    row: number,
    opts: {
      currentHp?: number
      maxHp?: number
      isSpawned?: boolean
      isDead?: boolean
      hasReachedEnd?: boolean
      distanceTraveled?: number
    } = {}
  ): CharacterUnit => ({
    id,
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
      currentCol: col,
      currentRow: row,
      direction: 2,
      pathIndex: 0,
      pathInterpolation: 0,
      distanceTraveled: opts.distanceTraveled ?? 0,
    },
    combat: {
      currentHp: opts.currentHp ?? 100,
      maxHp: opts.maxHp ?? 100,
      immunities: [],
      consecutiveHits: {},
      statusEffects: [],
    },
    animation: {
      action: 'Run',
      frameIndex: 0,
      animTimer: 0,
      animSpeed: 1.0,
    },
    lifecycle: {
      isSpawned: opts.isSpawned ?? true,
      isDead: opts.isDead ?? false,
      hasReachedEnd: opts.hasReachedEnd ?? false,
      deathFade: 1.0,
      celebrationTimer: 0,
    },
  })

  it('should ignore units that are dead, unspawned, or have reached end', () => {
    const units = [
      createUnit('u-dead', 5, 6, { isDead: true }),
      createUnit('u-unspawned', 5, 6, { isSpawned: false }),
      createUnit('u-escaped', 5, 6, { hasReachedEnd: true }),
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'first', units)
    expect(target).toBeNull()
  })

  it('should ignore units that are out of tower attack range', () => {
    const units = [
      createUnit('u-far', 15, 15), // distance > 4.0
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'first', units)
    expect(target).toBeNull()
  })

  it('should target the "first" unit with the highest distance traveled', () => {
    const units = [
      createUnit('u-mid', 5, 6, { distanceTraveled: 10 }),
      createUnit('u-leader', 5, 7, { distanceTraveled: 25 }),
      createUnit('u-spawn', 5, 5, { distanceTraveled: 2 }),
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'first', units)
    expect(target?.id).toBe('u-leader')
  })

  it('should target the "last" unit with the lowest distance traveled', () => {
    const units = [
      createUnit('u-mid', 5, 6, { distanceTraveled: 10 }),
      createUnit('u-leader', 5, 7, { distanceTraveled: 25 }),
      createUnit('u-spawn', 5, 5, { distanceTraveled: 2 }),
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'last', units)
    expect(target?.id).toBe('u-spawn')
  })

  it('should target the "strongest" unit with highest current HP', () => {
    const units = [
      createUnit('u-normal', 5, 6, { currentHp: 100 }),
      createUnit('u-boss', 5, 7, { currentHp: 500 }),
      createUnit('u-damaged', 5, 5, { currentHp: 30 }),
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'strongest', units)
    expect(target?.id).toBe('u-boss')
  })

  it('should target the "weakest" unit with lowest current HP', () => {
    const units = [
      createUnit('u-normal', 5, 6, { currentHp: 100 }),
      createUnit('u-boss', 5, 7, { currentHp: 500 }),
      createUnit('u-damaged', 5, 5, { currentHp: 30 }),
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'weakest', units)
    expect(target?.id).toBe('u-damaged')
  })

  it('should target the "closest" unit to the tower position', () => {
    const units = [
      createUnit('u-close', 5, 6), // dist = 1.0
      createUnit('u-medium', 7, 7), // dist = 2.82
      createUnit('u-edge', 8, 5), // dist = 3.0
    ]

    const target = TargetingSystem.selectTarget(towerCol, towerRow, range, 'closest', units)
    expect(target?.id).toBe('u-close')
  })

  it('should maintain sticky target lock if locked unit is still valid and in range', () => {
    const units = [
      createUnit('u-leader', 5, 8, { distanceTraveled: 30 }), // would be chosen by 'first'
      createUnit('u-locked', 5, 6, { distanceTraveled: 10 }), // locked target
    ]

    const target = TargetingSystem.selectTarget(
      towerCol,
      towerRow,
      range,
      'first',
      units,
      'u-locked'
    )
    expect(target?.id).toBe('u-locked')
  })
})
