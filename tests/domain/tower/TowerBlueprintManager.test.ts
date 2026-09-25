import { describe, it, expect } from 'vitest'
import { TowerBlueprintManager } from '../../../src/domain/tower/TowerBlueprintManager'
import { TowerBlueprint, PlacedTower } from '../../../src/types/tower'

describe('TowerBlueprintManager & Tower Interfaces', () => {
  it('normalizes blueprint with clean TowerAsset and TowerLevel structure', () => {
    const raw = {
      id: 'tower-test-1',
      name: 'Fire Tower',
      description: 'A blazing tower',
      clanId: 'clan-iron',
      assetId: 'sprite-tower_fire_one',
      assetName: 'Tower_fire_one.webp',
      cost: 50,
      damage: 25,
      attackSpeed: 0.8,
      range: 5,
      projectileId: 'fireball',
      targetStrategy: 'first',
    }

    const bp = TowerBlueprintManager.normalizeBlueprint(raw)

    expect(bp.id).toBe('tower-test-1')
    expect(bp.name).toBe('Fire Tower')
    expect(bp.projectileId).toBe('fireball')
    expect(bp.targetStrategy).toBe('first')

    // TowerAsset checks
    expect(bp.asset).toBeDefined()
    expect(bp.asset.assetId).toBe('sprite-tower_fire_one')
    expect(bp.asset.assetName).toBe('Tower_fire_one.webp')
    expect(bp.asset.scale).toBe(1.0)
    expect(bp.asset.anchorX).toBe(0.5)
    expect(bp.asset.anchorY).toBe(0.88)

    // TowerLevel checks
    expect(bp.levels).toHaveLength(1)
    expect(bp.levels[0].level).toBe(1)
    expect(bp.levels[0].cost).toBe(50)
    expect(bp.levels[0].damage).toBe(25)
    expect(bp.levels[0].attackSpeed).toBe(0.8)
    expect(bp.levels[0].range).toBe(5)

    // By default, tower MUST NOT be splash
    expect(bp.levels[0].isSplash).toBe(false)
    expect(bp.isSplash).toBe(false)
  })

  it('preserves isSplash = true when explicitly configured', () => {
    const raw = {
      id: 'tower-splash-1',
      name: 'Splash Mortar',
      isSplash: true,
      splashRadius: 2.0,
      splashType: 'constant',
      cost: 120,
      damage: 80,
      levels: [
        {
          level: 1,
          cost: 120,
          damage: 80,
          attackSpeed: 1.5,
          range: 6,
          isSplash: true,
          splashRadius: 2.0,
          splashType: 'constant',
        }
      ]
    }

    const bp = TowerBlueprintManager.normalizeBlueprint(raw)
    expect(bp.levels[0].isSplash).toBe(true)
    expect(bp.levels[0].splashRadius).toBe(2.0)
    expect(bp.levels[0].splashType).toBe('constant')
    expect(bp.isSplash).toBe(true)
  })

  it('correctly updates level properties and syncs to placed towers', () => {
    const bp = TowerBlueprintManager.normalizeBlueprint({
      id: 'tower-sync-1',
      name: 'Rapid Tower',
      cost: 100,
      damage: 30,
      attackSpeed: 0.5,
      range: 4,
      isSplash: false,
    })

    const placedTower: PlacedTower = {
      id: 'placed-1',
      blueprintId: bp.id,
      name: bp.name,
      col: 10,
      row: 10,
      level: 1,
      damage: 30,
      attackSpeed: 0.5,
      range: 4,
      projectileId: 'fireball',
      isSplash: false,
      cooldownTimer: 0,
      totalDamageDealt: 0,
      killsCount: 0,
    }

    // Add level 2
    const lvl2 = TowerBlueprintManager.addBlueprintLevel(bp)
    expect(bp.levels).toHaveLength(2)
    expect(lvl2.level).toBe(2)

    // Upgrade placed tower to level 2
    placedTower.level = 2
    TowerBlueprintManager.syncBlueprintToPlacedTowers(bp, [placedTower])

    expect(placedTower.damage).toBe(lvl2.damage)
    expect(placedTower.isSplash).toBe(false)
  })
})
