import { CombatEffect, TowerTraitType } from '../../types/combat'
import { CombatUnitTarget, DamageCalculationResult } from './types'
import { EffectProcessor } from './EffectProcessor'

export class DamageCalculator {
  /**
   * Calculates hit damage and status effects from an attacking tower onto a target unit using composable effects.
   */
  public static calculateDamage(
    baseDamage: number,
    towerTraitsConfig?: { traits?: TowerTraitType[]; effects?: CombatEffect[]; id?: string; [key: string]: any },
    target?: CombatUnitTarget
  ): DamageCalculationResult {
    const effects = EffectProcessor.traitsToEffects(towerTraitsConfig)

    return EffectProcessor.processEffects(effects, {
      baseDamage,
      sourceTowerId: towerTraitsConfig?.id,
      targetUnit: target,
      consecutiveHitsCount: towerTraitsConfig?.id && target?.consecutiveHits ? target.consecutiveHits[towerTraitsConfig.id] : 0,
    })
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
