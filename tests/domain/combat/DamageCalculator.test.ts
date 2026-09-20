import { describe, it, expect } from 'vitest'
import { DamageCalculator } from '@/domain/combat/DamageCalculator'
import { CombatUnitTarget } from '@/domain/combat/types'

describe('DamageCalculator Domain Logic', () => {
  it('should calculate plain base damage without traits or modifiers', () => {
    const result = DamageCalculator.calculateDamage(50)
    expect(result.finalDamage).toBe(50)
    expect(result.isResisted).toBe(false)
    expect(result.appliedStatusEffects).toHaveLength(0)
  })

  it('should apply Fire trait bonus damage and burn status effect', () => {
    const result = DamageCalculator.calculateDamage(40, {
      traits: ['fire'],
      fireBonusDamage: 15,
      burnDuration: 3.5,
      burnDps: 8,
    })

    expect(result.finalDamage).toBe(55)
    expect(result.appliedStatusEffects).toHaveLength(1)
    expect(result.appliedStatusEffects[0]).toEqual({
      type: 'fire',
      duration: 3.5,
      dps: 8,
    })
  })

  it('should apply Frost trait slow effect and bonus damage', () => {
    const result = DamageCalculator.calculateDamage(30, {
      traits: ['frost'],
      frostBonusDamage: 10,
      slowDuration: 2.0,
      slowPercent: 40,
    })

    expect(result.finalDamage).toBe(40)
    expect(result.appliedStatusEffects[0]).toEqual({
      type: 'frost',
      duration: 2.0,
      slowPercent: 40,
    })
  })

  it('should apply Stacking trait consecutive hit bonuses up to maxStacks', () => {
    const target: CombatUnitTarget = {
      id: 'unit-1',
      col: 5,
      row: 5,
      hp: 100,
      maxHp: 100,
      consecutiveHits: {
        'tower-1': 3, // 3 previous hits
      },
    }

    const result = DamageCalculator.calculateDamage(
      50,
      {
        id: 'tower-1',
        traits: ['stacking'],
        stackBonusDamage: 10,
        maxStacks: 5,
      },
      target
    )

    // Current hit becomes 3 + 1 = 4 hits. Extra damage: 4 * 10 = 40.
    expect(result.finalDamage).toBe(90)
    expect(result.stackCount).toBe(4)
  })

  it('should amplify damage if target is afflicted with Void vulnerability curse', () => {
    const targetWithVoid: CombatUnitTarget = {
      id: 'unit-curse',
      col: 2,
      row: 2,
      hp: 200,
      maxHp: 200,
      statusEffects: [
        {
          type: 'void',
          duration: 3.0,
          amplification: 50, // +50% damage taken
        },
      ],
    }

    const result = DamageCalculator.calculateDamage(100, undefined, targetWithVoid)
    expect(result.finalDamage).toBe(150) // 100 * 1.5 = 150
  })

  it('should respect unit immunities against elemental traits', () => {
    const immuneTarget: CombatUnitTarget = {
      id: 'boss-fire-immune',
      col: 10,
      row: 10,
      hp: 500,
      maxHp: 500,
      immunities: ['fire'],
    }

    const result = DamageCalculator.calculateDamage(
      100,
      {
        traits: ['fire'],
        fireBonusDamage: 50,
        burnDps: 20,
      },
      immuneTarget
    )

    expect(result.finalDamage).toBe(100) // fire bonus ignored
    expect(result.isResisted).toBe(true)
    expect(result.resistedTrait).toBe('fire')
    expect(result.appliedStatusEffects).toHaveLength(0) // no burn applied
  })

  describe('Splash Damage Calculations', () => {
    it('should deal 0 splash damage if target is outside splash radius', () => {
      const damage = DamageCalculator.calculateSplashDamage(100, 4.5, 3.0, 'falloff')
      expect(damage).toBe(0)
    })

    it('should deal constant splash damage regardless of distance within radius', () => {
      const dmgClose = DamageCalculator.calculateSplashDamage(100, 0.5, 3.0, 'constant')
      const dmgFar = DamageCalculator.calculateSplashDamage(100, 2.8, 3.0, 'constant')
      expect(dmgClose).toBe(100)
      expect(dmgFar).toBe(100)
    })

    it('should calculate smooth linear falloff splash damage based on distance', () => {
      const dmgCenter = DamageCalculator.calculateSplashDamage(100, 0, 3.0, 'falloff')
      const dmgMid = DamageCalculator.calculateSplashDamage(100, 1.5, 3.0, 'falloff')
      const dmgEdge = DamageCalculator.calculateSplashDamage(100, 3.0, 3.0, 'falloff')

      expect(dmgCenter).toBe(100)
      expect(dmgMid).toBeLessThan(dmgCenter)
      expect(dmgEdge).toBeLessThan(dmgMid)
      expect(dmgEdge).toBeGreaterThanOrEqual(35) // floor factor is 0.35
    })
  })
})
