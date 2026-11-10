import { TowerBlueprint, PlacedTower, TowerLevel, TowerAsset, TowerTraitParams } from '../../types/tower'
import { SplashType, TargetStrategy, TowerTraitType, CombatEffect } from '../../types/combat'
import { EffectProcessor } from '../combat/EffectProcessor'
import { DEFAULT_PROJECTILE_ID } from '../projectile'

/**
 * Raw blueprint shape as found in saved/legacy map files and editor forms:
 * the canonical nested structure, or the older flat one (level-1 stats, asset fields and
 * `projectileType` on the root, or `stats: {...}`).
 */
export type RawTowerBlueprint = Partial<Omit<TowerBlueprint, 'asset' | 'levels'>> &
  Partial<TowerAsset> &
  Partial<Omit<TowerLevel, 'level'>> & {
    asset?: Partial<TowerAsset>
    levels?: Array<Partial<TowerLevel>>
    projectileType?: string
    projectile?: { type?: string }
    stats?: Partial<Pick<TowerLevel, 'cost' | 'damage' | 'attackSpeed' | 'range'>>
  }

const TRAIT_PARAM_KEYS: Array<keyof TowerTraitParams> = [
  'fireBonusDamage', 'burnDps', 'burnDuration', 'fireSplash', 'fireIsSplash',
  'slowPercent', 'slowDuration', 'frostBonusDamage', 'frostSplash', 'frostIsSplash',
  'poisonDps', 'poisonDuration', 'poisonSlowPercent', 'poisonSplash', 'poisonIsSplash',
  'stackBonusDamage', 'maxStacks', 'stackingSplash', 'stackingIsSplash',
  'bleedDps', 'bleedDuration', 'bloodSplash', 'bloodIsSplash',
  'electricBonusDamage', 'chainTargets', 'stunDuration', 'electricSplash', 'electricIsSplash',
  'voidVulnPercent', 'voidDuration', 'voidSplash', 'voidIsSplash',
]

function pickTraitParams(src: TowerTraitParams): TowerTraitParams {
  const out: Record<string, unknown> = {}
  for (const key of TRAIT_PARAM_KEYS) {
    if (src[key] !== undefined) out[key] = src[key]
  }
  return out as TowerTraitParams
}

/**
 * TowerBlueprintManager — Domain logic for Tower Blueprints, Upgrades, Normalization, and Synchronization.
 *
 * Single Source of Truth: All level-specific stats reside inside `bp.levels[]`, and visual asset data in `bp.asset`.
 */
export class TowerBlueprintManager {
  /**
   * Normalizes an incoming raw/legacy blueprint object into the standardized composable TowerBlueprint structure.
   */
  public static normalizeBlueprint(raw: RawTowerBlueprint): TowerBlueprint {
    const name = raw.name || 'Tower'
    const id = raw.id || `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const projectileId = raw.projectileId || raw.projectileType || raw.projectile?.type || DEFAULT_PROJECTILE_ID
    const targetStrategy: TargetStrategy = raw.targetStrategy || 'first'

    const rawName = (raw.asset?.assetName || raw.assetName || name).trim()
    const assetId = raw.asset?.assetId || raw.assetId || (rawName ? (rawName.startsWith('sprite-') ? rawName : `sprite-${rawName.replace(/\.[^/.]+$/, '')}`) : 'sprite-stoneColumn_W')
    const assetName = raw.asset?.assetName || raw.assetName || (rawName ? (rawName.endsWith('.webp') || rawName.endsWith('.png') ? rawName : `${rawName}.webp`) : 'stoneColumn_W.webp')
    const rawPath = raw.asset?.assetPath || raw.assetPath || ''
    const assetPath = raw.asset?.assetPath || (rawPath.startsWith('http://') || rawPath.startsWith('https://') ? rawPath : '')

    const asset: TowerAsset = {
      assetId,
      assetName,
      assetPath,
      scale: Number(raw.asset?.scale ?? raw.scale ?? 1.0),
      spanX: Number(raw.asset?.spanX ?? raw.spanX ?? 1),
      spanY: Number(raw.asset?.spanY ?? raw.spanY ?? 1),
      anchorX: Number(raw.asset?.anchorX ?? raw.anchorX ?? 0.5),
      anchorY: Number(raw.asset?.anchorY ?? raw.anchorY ?? 0.88),
      muzzleOffsetX: Number(raw.asset?.muzzleOffsetX ?? raw.muzzleOffsetX ?? 0),
      muzzleOffsetY: Number(raw.asset?.muzzleOffsetY ?? raw.muzzleOffsetY ?? 0),
    }

    const rawLevels: Array<Partial<TowerLevel>> = Array.isArray(raw.levels) && raw.levels.length > 0 ? raw.levels : [{}]
    const levels = rawLevels.map((lvl, idx) => {
      const lvlNum = lvl.level || (idx + 1)
      const isLvl1 = lvlNum === 1
      // Root-level (flat legacy) values only describe level 1. Default tower is NEVER splash unless explicit.
      const root: RawTowerBlueprint = isLvl1 ? raw : {}
      const isSplash = lvl.isSplash !== undefined ? Boolean(lvl.isSplash) : Boolean(root.isSplash)
      const traits = (Array.isArray(lvl.traits) ? lvl.traits : (Array.isArray(raw.traits) ? raw.traits : [])) as TowerTraitType[]
      const level: TowerLevel = {
        ...pickTraitParams(root),
        ...pickTraitParams(lvl),
        level: lvlNum,
        name: lvl.name || (isLvl1 ? name : `${name} ${lvlNum}`),
        cost: Number(lvl.cost ?? raw.cost ?? raw.stats?.cost ?? 100),
        damage: Number(lvl.damage ?? raw.damage ?? raw.stats?.damage ?? 20),
        attackSpeed: Number(lvl.attackSpeed ?? raw.attackSpeed ?? raw.stats?.attackSpeed ?? 1.0),
        range: Number(lvl.range ?? raw.range ?? raw.stats?.range ?? 3.0),
        isSplash,
        splashRadius: isSplash ? Number(lvl.splashRadius ?? raw.splashRadius ?? 1.5) : undefined,
        splashType: isSplash ? ((lvl.splashType || raw.splashType || 'falloff') as SplashType) : undefined,
        traits: [...traits],
      }
      const explicitEffects: CombatEffect[] | undefined =
        (Array.isArray(lvl.effects) && lvl.effects.length > 0 && lvl.effects) ||
        (Array.isArray(raw.effects) && raw.effects.length > 0 && raw.effects) ||
        undefined
      level.effects = explicitEffects ? [...explicitEffects] : EffectProcessor.traitsToEffects(level)
      return level
    })

    return {
      id,
      name,
      description: raw.description || '',
      clanId: raw.clanId,
      asset,
      projectileId,
      targetStrategy,
      levels,
    }
  }

  /**
   * Extracts Level configuration from a TowerBlueprint.
   */
  public static extractLevelConfigFromBp(bp: TowerBlueprint, level: number = 1): TowerLevel {
    this.ensureBlueprintLevels(bp)
    const idx = Math.max(0, level - 1)
    if (idx < bp.levels.length) {
      return bp.levels[idx]
    }
    const lvl1 = bp.levels[0]
    return {
      ...lvl1,
      level,
      name: `${bp.name} ${level}`,
      cost: Math.round(lvl1.cost * (0.8 + (level - 1) * 0.5)),
      damage: Math.round(lvl1.damage * (1 + (level - 1) * 0.3)),
      traits: lvl1.traits ? [...lvl1.traits] : [],
      effects: lvl1.effects ? [...lvl1.effects] : [],
    }
  }

  /**
   * Ensures the levels array is populated and correctly indexed.
   */
  public static ensureBlueprintLevels(bp: TowerBlueprint): TowerLevel[] {
    if (!Array.isArray(bp.levels) || bp.levels.length === 0) {
      bp.levels = this.normalizeBlueprint({ ...bp, levels: undefined }).levels
    } else {
      bp.levels.forEach((lvl, idx) => {
        lvl.level = idx + 1
        lvl.isSplash = Boolean(lvl.isSplash)
      })
    }
    return bp.levels
  }

  /**
   * Retrieves the next level upgrade config for a placed tower.
   */
  public static getNextLevelConfig(tower: PlacedTower, bp?: TowerBlueprint): TowerLevel | null {
    if (!bp || !bp.levels) return null
    const nextLvlIdx = tower.level || 1
    if (nextLvlIdx >= bp.levels.length) return null
    return bp.levels[nextLvlIdx] || null
  }

  /**
   * Adds a new upgrade level to a blueprint.
   */
  public static addBlueprintLevel(bp: TowerBlueprint): TowerLevel {
    this.ensureBlueprintLevels(bp)
    const currentLevels = bp.levels
    const prevLvl = currentLevels[currentLevels.length - 1]
    const nextLvlNum = currentLevels.length + 1

    const newLvl: TowerLevel = {
      ...pickTraitParams(prevLvl),
      level: nextLvlNum,
      name: `${bp.name} ${nextLvlNum}`,
      cost: Math.round((prevLvl.cost || 100) * 1.5),
      damage: Math.round((prevLvl.damage || 20) * 1.3),
      attackSpeed: Math.max(0.1, Number(((prevLvl.attackSpeed || 1.0) * 0.9).toFixed(2))),
      range: Number(((prevLvl.range || 3.0) + 0.5).toFixed(1)),
      isSplash: Boolean(prevLvl.isSplash),
      splashRadius: prevLvl.isSplash ? (prevLvl.splashRadius ?? 1.5) : undefined,
      splashType: prevLvl.isSplash ? (prevLvl.splashType || 'falloff') : undefined,
      traits: prevLvl.traits ? [...prevLvl.traits] : [],
      effects: prevLvl.effects ? [...prevLvl.effects] : [],
    }

    currentLevels.push(newLvl)
    return newLvl
  }

  /**
   * Updates partial parameters on a specific level.
   */
  public static updateBlueprintLevel(
    bp: TowerBlueprint,
    levelIndex: number,
    partial: Partial<TowerLevel>
  ): void {
    this.ensureBlueprintLevels(bp)
    if (levelIndex < 0 || levelIndex >= bp.levels.length) return
    Object.assign(bp.levels[levelIndex], partial)
    bp.levels[levelIndex].effects = EffectProcessor.traitsToEffects(bp.levels[levelIndex])
  }

  /**
   * Synchronizes placed towers on the map when their blueprint changes.
   * A tower whose level no longer exists keeps its level number and uses the highest remaining level's stats.
   */
  public static syncBlueprintToPlacedTowers(bp: TowerBlueprint, placedTowers: PlacedTower[]): void {
    this.ensureBlueprintLevels(bp)

    for (const t of placedTowers) {
      if (t.blueprintId !== bp.id) continue
      const lvlIdx = Math.min(bp.levels.length - 1, Math.max(0, (t.level || 1) - 1))
      const lvlCfg = bp.levels[lvlIdx]

      t.level = lvlIdx + 1
      t.damage = lvlCfg.damage
      t.attackSpeed = lvlCfg.attackSpeed
      t.range = lvlCfg.range
      t.isSplash = Boolean(lvlCfg.isSplash)
      t.splashRadius = lvlCfg.splashRadius ?? 1.5
      t.splashType = lvlCfg.splashType ?? 'falloff'
      t.projectileId = bp.projectileId || DEFAULT_PROJECTILE_ID
      t.targetStrategy = bp.targetStrategy || t.targetStrategy || 'first'
      t.traits = lvlCfg.traits ? [...lvlCfg.traits] : []
      t.effects = EffectProcessor.traitsToEffects(lvlCfg)
    }
  }
}
