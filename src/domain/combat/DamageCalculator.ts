import { TowerTraitType, TowerTraitsConfig } from '../../types/map'
import { CombatUnitTarget, DamageCalculationResult } from './types'

export class DamageCalculator {
  /**
   * Calculates hit damage and status effects from an attacking tower onto a target unit.
   */
  public static calculateDamage(
    baseDamage: number,
    towerTraitsConfig?: TowerTraitsConfig & { id?: string },
    target?: CombatUnitTarget
  ): DamageCalculationResult {
    let vulnMultiplier = 1.0

    // 1. Check unit vulnerability amplifier (e.g. from previous Void curse)
    if (target?.statusEffects) {
      const voidEffect = target.statusEffects.find(e => e.type === 'void')
      if (voidEffect && voidEffect.amplification) {
        vulnMultiplier += voidEffect.amplification / 100
      }
    }

    let finalDamage = Math.round(baseDamage * vulnMultiplier)
    const unitImmunities = target?.immunities || []
    const appliedEffects: DamageCalculationResult['appliedStatusEffects'] = []
    let isResisted = false
    let resistedTrait: TowerTraitType | undefined
    let stackCount: number | undefined

    if (towerTraitsConfig?.traits && towerTraitsConfig.traits.length > 0) {
      for (const trait of towerTraitsConfig.traits) {
        // Immunity check
        if (unitImmunities.includes(trait)) {
          isResisted = true
          resistedTrait = trait
          continue
        }

        if (trait === 'fire') {
          const fireBonus = Math.round((towerTraitsConfig.fireBonusDamage ?? 5) * vulnMultiplier)
          finalDamage += fireBonus
          appliedEffects.push({
            type: 'fire',
            duration: towerTraitsConfig.burnDuration ?? 3.0,
            dps: towerTraitsConfig.burnDps ?? 4,
          })
        } else if (trait === 'frost') {
          const frostBonus = Math.round((towerTraitsConfig.frostBonusDamage ?? 2) * vulnMultiplier)
          finalDamage += frostBonus
          appliedEffects.push({
            type: 'frost',
            duration: towerTraitsConfig.slowDuration ?? 2.5,
            slowPercent: towerTraitsConfig.slowPercent ?? 30,
          })
        } else if (trait === 'poison') {
          appliedEffects.push({
            type: 'poison',
            duration: towerTraitsConfig.poisonDuration ?? 4.0,
            dps: towerTraitsConfig.poisonDps ?? 6,
            slowPercent: towerTraitsConfig.poisonSlowPercent ?? 10,
          })
        } else if (trait === 'stacking') {
          const towerId = towerTraitsConfig.id || 'default'
          const currentHits = ((target?.consecutiveHits?.[towerId] || 0) + 1)
          const maxSt = towerTraitsConfig.maxStacks ?? 10
          const activeStacks = Math.min(maxSt, currentHits)
          stackCount = activeStacks
          const stackBonus = towerTraitsConfig.stackBonusDamage ?? 4
          const extraStackDmg = Math.round(activeStacks * stackBonus * vulnMultiplier)
          finalDamage += extraStackDmg
        } else if (trait === 'blood') {
          appliedEffects.push({
            type: 'blood',
            duration: towerTraitsConfig.bleedDuration ?? 3.5,
            dps: towerTraitsConfig.bleedDps ?? 7,
          })
        } else if (trait === 'electric') {
          const electricBonus = Math.round((towerTraitsConfig.electricBonusDamage ?? 6) * vulnMultiplier)
          finalDamage += electricBonus
          appliedEffects.push({
            type: 'electric',
            duration: towerTraitsConfig.stunDuration ?? 0.3,
            slowPercent: 90,
          })
        } else if (trait === 'void') {
          appliedEffects.push({
            type: 'void',
            duration: towerTraitsConfig.voidDuration ?? 4.0,
            amplification: towerTraitsConfig.voidVulnPercent ?? 25,
          })
        }
      }
    }

    return {
      finalDamage: Math.max(0, finalDamage),
      isResisted,
      resistedTrait,
      appliedStatusEffects: appliedEffects,
      stackCount,
    }
  }

  /**
   * Calculates linear splash damage falloff factor.
   */
  public static calculateSplashDamage(
    baseDamage: number,
    distInTiles: number,
    splashRadius: number,
    splashType: 'constant' | 'falloff'
  ): number {
    if (distInTiles > splashRadius) return 0
    if (splashType === 'falloff') {
      const falloffFactor = Math.max(0.35, 1.0 - (distInTiles / splashRadius) * 0.65)
      return Math.round(baseDamage * falloffFactor)
    }
    return baseDamage
  }
}
