import { describe, it, expect } from 'vitest'
import { EffectProcessor } from '../../../src/domain/combat/EffectProcessor'
import { CombatEffect } from '../../../src/types/combat'
import { CombatUnitTarget } from '../../../src/domain/combat/types'

describe('EffectProcessor Composable Architecture', () => {
  const mockTarget: CombatUnitTarget = {
    id: 'unit-1',
    currentCol: 2,
    currentRow: 2,
    screenX: 100,
    screenY: 100,
    currentHp: 200,
    maxHp: 200,
    isDead: false,
    hasReachedEnd: false,
    isSpawned: true,
    pathIndex: 0,
    immunities: [],
  }

  it('should process multi-effect composition seamlessly', () => {
    const effects: CombatEffect[] = [
      { type: 'damage', amount: 50, element: 'fire' },
      { type: 'burn', dps: 10, duration: 4.0 },
      { type: 'slow', percent: 40, duration: 3.0 },
    ]

    const result = EffectProcessor.processEffects(effects, {
      baseDamage: 100,
      targetUnit: mockTarget,
    })

    expect(result.finalDamage).toBe(150)
    expect(result.appliedStatusEffects).toHaveLength(2)
    expect(result.appliedStatusEffects.some(e => e.type === 'fire' && e.dps === 10)).toBe(true)
    expect(result.appliedStatusEffects.some(e => e.type === 'frost' && e.slowPercent === 40)).toBe(true)
  })

  it('should support stacking damage progression', () => {
    const effects: CombatEffect[] = [
      { type: 'stacking_damage', bonusPerHit: 15, maxStacks: 5 },
    ]

    const resultHit3 = EffectProcessor.processEffects(effects, {
      baseDamage: 50,
      targetUnit: mockTarget,
      consecutiveHitsCount: 2, // 3rd hit
    })

    expect(resultHit3.stackCount).toBe(3)
    expect(resultHit3.finalDamage).toBe(50 + 3 * 15) // 95
  })

  it('should respect elemental immunities and mark resistance', () => {
    const immuneTarget: CombatUnitTarget = {
      ...mockTarget,
      immunities: ['frost'],
    }

    const effects: CombatEffect[] = [
      { type: 'slow', percent: 50, duration: 3.0 },
    ]

    const result = EffectProcessor.processEffects(effects, {
      baseDamage: 100,
      targetUnit: immuneTarget,
    })

    expect(result.isResisted).toBe(true)
    expect(result.resistedTrait).toBe('frost')
    expect(result.appliedStatusEffects).toHaveLength(0)
  })
})
