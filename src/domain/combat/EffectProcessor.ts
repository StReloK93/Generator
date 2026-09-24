import { CombatEffect, DamageElement, TowerTraitType } from '../../types/combat'
import { CombatUnitTarget, DamageCalculationResult } from './types'

export interface EffectProcessingContext {
  baseDamage: number
  sourceTowerId?: string
  targetUnit?: CombatUnitTarget
  vulnerabilityMultiplier?: number
  consecutiveHitsCount?: number
}

export class EffectProcessor {
  /**
   * Processes a list of composable CombatEffects against a target unit.
   */
  public static processEffects(
    effects: CombatEffect[],
    context: EffectProcessingContext
  ): DamageCalculationResult {
    let finalDamage = context.baseDamage
    let vulnMultiplier = context.vulnerabilityMultiplier ?? 1.0

    // Check existing vulnerability (e.g. from previous Void debuffs)
    if (context.targetUnit?.statusEffects) {
      const voidEffect = context.targetUnit.statusEffects.find(e => e.type === 'void')
      if (voidEffect && voidEffect.amplification) {
        vulnMultiplier += voidEffect.amplification / 100
      }
    }

    finalDamage = Math.round(finalDamage * vulnMultiplier)

    const unitImmunities = context.targetUnit?.immunities || []
    const appliedStatusEffects: DamageCalculationResult['appliedStatusEffects'] = []
    let isResisted = false
    let resistedTrait: TowerTraitType | undefined
    let stackCount: number | undefined

    for (const effect of effects) {
      switch (effect.type) {
        case 'damage': {
          if (effect.element && unitImmunities.includes(effect.element as TowerTraitType)) {
            isResisted = true
            resistedTrait = effect.element as TowerTraitType
            continue
          }
          const bonus = (effect.amount || 0) * vulnMultiplier
          finalDamage += Math.round(bonus)
          break
        }
        case 'burn': {
          if (unitImmunities.includes('fire')) {
            isResisted = true
            resistedTrait = 'fire'
            continue
          }
          appliedStatusEffects.push({
            type: 'fire',
            duration: effect.duration,
            dps: effect.dps,
            sourceTowerId: context.sourceTowerId,
          })
          break
        }
        case 'slow': {
          if (unitImmunities.includes('frost')) {
            isResisted = true
            resistedTrait = 'frost'
            continue
          }
          appliedStatusEffects.push({
            type: 'frost',
            duration: effect.duration,
            slowPercent: effect.percent,
            sourceTowerId: context.sourceTowerId,
          })
          break
        }
        case 'poison': {
          if (unitImmunities.includes('poison')) {
            isResisted = true
            resistedTrait = 'poison'
            continue
          }
          appliedStatusEffects.push({
            type: 'poison',
            duration: effect.duration,
            dps: effect.dps,
            slowPercent: effect.slowPercent || 10,
            sourceTowerId: context.sourceTowerId,
          })
          break
        }
        case 'bleed': {
          if (unitImmunities.includes('blood')) {
            isResisted = true
            resistedTrait = 'blood'
            continue
          }
          appliedStatusEffects.push({
            type: 'blood',
            duration: effect.duration,
            dps: effect.dps,
            sourceTowerId: context.sourceTowerId,
          })
          break
        }
        case 'stun': {
          if (unitImmunities.includes('electric')) {
            isResisted = true
            resistedTrait = 'electric'
            continue
          }
          appliedStatusEffects.push({
            type: 'electric',
            duration: effect.duration,
            slowPercent: 90,
            sourceTowerId: context.sourceTowerId,
          })
          break
        }
        case 'vulnerability': {
          if (unitImmunities.includes('void')) {
            isResisted = true
            resistedTrait = 'void'
            continue
          }
          appliedStatusEffects.push({
            type: 'void',
            duration: effect.duration,
            amplification: effect.percent,
            sourceTowerId: context.sourceTowerId,
          })
          break
        }
        case 'stacking_damage': {
          const currentHits = (context.consecutiveHitsCount ?? 0) + 1
          const activeStacks = Math.min(effect.maxStacks, currentHits)
          stackCount = activeStacks
          const bonus = Math.round(activeStacks * effect.bonusPerHit * vulnMultiplier)
          finalDamage += bonus
          break
        }
        case 'chain': {
          // Chain effects handled by projectile/combat engine bounce logic
          break
        }
      }
    }

    return {
      finalDamage: Math.max(0, finalDamage),
      isResisted,
      resistedTrait,
      appliedStatusEffects,
      stackCount,
    }
  }

  /**
   * Converts flat trait configurations into a clean, typed CombatEffect array.
   */
  public static traitsToEffects(traitsConfig?: Record<string, any>): CombatEffect[] {
    if (!traitsConfig) return []
    const effects: CombatEffect[] = []

    if (traitsConfig.effects && Array.isArray(traitsConfig.effects) && traitsConfig.effects.length > 0) {
      return [...traitsConfig.effects]
    }

    const traits: TowerTraitType[] = traitsConfig.traits || []

    for (const trait of traits) {
      if (trait === 'fire') {
        if (traitsConfig.fireBonusDamage) {
          effects.push({ type: 'damage', amount: traitsConfig.fireBonusDamage, element: 'fire' })
        }
        effects.push({
          type: 'burn',
          dps: traitsConfig.burnDps || 4,
          duration: traitsConfig.burnDuration || 3.0,
        })
      } else if (trait === 'frost') {
        if (traitsConfig.frostBonusDamage) {
          effects.push({ type: 'damage', amount: traitsConfig.frostBonusDamage, element: 'frost' })
        }
        effects.push({
          type: 'slow',
          percent: traitsConfig.slowPercent || 30,
          duration: traitsConfig.slowDuration || 2.5,
        })
      } else if (trait === 'poison') {
        effects.push({
          type: 'poison',
          dps: traitsConfig.poisonDps || 6,
          duration: traitsConfig.poisonDuration || 4.0,
          slowPercent: traitsConfig.poisonSlowPercent || 10,
        })
      } else if (trait === 'stacking') {
        effects.push({
          type: 'stacking_damage',
          bonusPerHit: traitsConfig.stackBonusDamage || 4,
          maxStacks: traitsConfig.maxStacks || 10,
        })
      } else if (trait === 'blood') {
        effects.push({
          type: 'bleed',
          dps: traitsConfig.bleedDps || 7,
          duration: traitsConfig.bleedDuration || 3.5,
        })
      } else if (trait === 'electric') {
        if (traitsConfig.electricBonusDamage) {
          effects.push({ type: 'damage', amount: traitsConfig.electricBonusDamage, element: 'electric' })
        }
        effects.push({
          type: 'stun',
          duration: traitsConfig.stunDuration || 0.3,
        })
        if (traitsConfig.chainTargets && traitsConfig.chainTargets > 1) {
          effects.push({
            type: 'chain',
            targets: traitsConfig.chainTargets,
          })
        }
      } else if (trait === 'void') {
        effects.push({
          type: 'vulnerability',
          percent: traitsConfig.voidVulnPercent || 25,
          duration: traitsConfig.voidDuration || 4.0,
        })
      }
    }

    return effects
  }
}
