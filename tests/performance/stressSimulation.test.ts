import { describe, it, expect } from 'vitest'
import { TargetingSystem } from '@/domain/combat/TargetingSystem'
import { DamageCalculator } from '@/domain/combat/DamageCalculator'
import { CrowdSimulation } from '@/domain/simulation/CrowdSimulation'
import { CharacterUnit } from '@/types/unit'

describe('Stress & Performance Simulation Benchmark', () => {
  it('should simulate 200 units and 30 towers over 200 frames without frame lag or NaN errors', () => {
    // 1. Create 200 active units moving along paths
    const units: CharacterUnit[] = []
    for (let i = 0; i < 200; i++) {
      units.push({
        id: `unit-${i}`,
        identity: {
          routeId: 'route-1',
          routeIndex: 0,
          unitIndex: i,
          pairIndex: Math.floor(i / 2),
          sideOffset: 0,
          model: 'male',
          variant: 'normal',
        },
        movement: {
          currentCol: (i % 25),
          currentRow: Math.floor(i / 25),
          direction: 2,
          pathIndex: 0,
          pathInterpolation: 0,
          distanceTraveled: i * 0.1,
        },
        combat: {
          currentHp: 150,
          maxHp: 150,
          immunities: [],
          consecutiveHits: {},
          statusEffects: [
            { type: 'fire', duration: 3.0, dps: 5 },
            { type: 'frost', duration: 2.0, slowPercent: 20 },
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
      })
    }

    // 2. Create 30 towers
    const towers = []
    for (let t = 0; t < 30; t++) {
      towers.push({
        id: `tower-${t}`,
        col: (t * 2) % 25,
        row: Math.floor((t * 2) / 25) * 3,
        range: 4.5,
        damage: 25,
        attackSpeed: 1.5,
        cooldownTimer: 0,
      })
    }

    const startTime = performance.now()
    const dt = 1 / 60 // 60 FPS tick (16.6ms)
    let totalHits = 0
    let totalDamageDealt = 0

    // 3. Simulate 200 frames
    for (let frame = 0; frame < 200; frame++) {
      // A. Process status effects & movement for all units
      for (let u = 0; u < units.length; u++) {
        const unit = units[u]
        if (unit.lifecycle.isDead) continue

        CrowdSimulation.processStatusEffects(unit, dt)

        // Advance movement
        unit.movement.distanceTraveled += 3.0 * dt
        unit.movement.currentCol += 0.01

        if (Number.isNaN(unit.combat.currentHp) || Number.isNaN(unit.movement.distanceTraveled)) {
          throw new Error(`NaN encountered on unit ${unit.id}`)
        }
      }

      // B. Towers targeting and damage calculation
      for (let t = 0; t < towers.length; t++) {
        const tower = towers[t]
        tower.cooldownTimer -= dt

        if (tower.cooldownTimer <= 0) {
          const target = TargetingSystem.selectTarget(
            tower.col,
            tower.row,
            tower.range,
            'first',
            units
          )

          if (target) {
            const hit = DamageCalculator.calculateDamage(
              tower.damage,
              {
                traits: ['fire', 'frost'],
                fireBonusDamage: 5,
                frostBonusDamage: 3,
              },
              {
                id: target.id,
                currentCol: target.movement.currentCol,
                currentRow: target.movement.currentRow,
                screenX: 100,
                screenY: 100,
                currentHp: target.combat.currentHp,
                maxHp: target.combat.maxHp,
                isDead: target.lifecycle.isDead,
                hasReachedEnd: target.lifecycle.hasReachedEnd,
                isSpawned: target.lifecycle.isSpawned,
                pathIndex: target.movement.pathIndex,
                immunities: target.combat.immunities,
                statusEffects: target.combat.statusEffects,
                consecutiveHits: target.combat.consecutiveHits,
              }
            )

            totalHits++
            totalDamageDealt += hit.finalDamage
            tower.cooldownTimer = 1 / tower.attackSpeed
          }
        }
      }
    }

    const elapsedMs = performance.now() - startTime

    // Validate execution performance and results
    expect(elapsedMs).toBeLessThan(1000)
    expect(totalHits).toBeGreaterThan(0)
    expect(totalDamageDealt).toBeGreaterThan(0)
  })

  it('should clean up expired status effects and prevent memory accumulation', () => {
    const unit: CharacterUnit = {
      id: 'leak-test-unit',
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
        currentHp: 200,
        maxHp: 200,
        immunities: [],
        consecutiveHits: {},
        statusEffects: [
          { type: 'fire', duration: 0.2, dps: 5 },
          { type: 'poison', duration: 0.1, dps: 3 },
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

    // Tick by 0.5s (longer than effect durations)
    CrowdSimulation.processStatusEffects(unit, 0.5)

    // All effects must be expired and pruned from memory
    expect(unit.combat.statusEffects).toHaveLength(0)
  })
})
