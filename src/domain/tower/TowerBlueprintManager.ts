import { TowerBlueprint, PlacedTower, TowerLevelConfig } from '../../types/tower'
import { ProjectileType, SplashType } from '../../types/map'
import { getProjectileTheme } from '../../utils/projectileEffectRenderer'
import { EffectProcessor } from '../combat/EffectProcessor'

/**
 * TowerBlueprintManager — Domain logic for Tower Blueprints, Upgrades, Normalization, and Synchronization.
 * 
 * SOLID: Single Responsibility Principle (SRP) and Composition over Property Accumulation.
 */
export class TowerBlueprintManager {
  /**
   * Normalizes an incoming raw/legacy blueprint object into the standardized composable TowerBlueprint structure.
   */
  public static normalizeBlueprint(raw: any): TowerBlueprint {
    const name = raw.name || 'Tower'
    const cost = raw.cost ?? raw.stats?.cost ?? 100
    const damage = raw.damage ?? raw.stats?.damage ?? 20
    const attackSpeed = raw.attackSpeed ?? raw.stats?.attackSpeed ?? 1.0
    const range = raw.range ?? raw.stats?.range ?? 3.0
    const projId = raw.projectileId || raw.projectileType || raw.projectile?.type || 'arrow'
    const projType: ProjectileType = projId as ProjectileType
    const theme = getProjectileTheme(projType, raw.projectileColor ?? raw.projectile?.color)
    const effects = raw.effects?.length ? [...raw.effects] : EffectProcessor.traitsToEffects(raw)

    const bp: TowerBlueprint = {
      id: raw.id || `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: raw.description || '',
      clanId: raw.clanId,
      targetStrategy: raw.targetStrategy || 'first',
      projectileId: projId,
      asset: {
        assetId: raw.assetId ?? raw.asset?.assetId,
        assetName: raw.assetName ?? raw.asset?.assetName ?? name,
        assetPath: raw.assetPath ?? raw.asset?.assetPath ?? '',
        scale: raw.scale ?? raw.asset?.scale ?? 1.0,
        spanX: raw.spanX ?? raw.asset?.spanX ?? 1,
        spanY: raw.spanY ?? raw.asset?.spanY ?? 1,
        anchorX: raw.anchorX ?? raw.asset?.anchorX ?? 0.5,
        anchorY: raw.anchorY ?? raw.asset?.anchorY ?? 0.88,
        muzzleOffsetX: raw.muzzleOffsetX ?? raw.asset?.muzzleOffsetX ?? 0,
        muzzleOffsetY: raw.muzzleOffsetY ?? raw.asset?.muzzleOffsetY ?? 0,
      },
      stats: {
        cost,
        damage,
        attackSpeed,
        range,
      },
      projectile: {
        type: projType,
        speed: raw.projectileSpeed ?? raw.projectile?.speed ?? 14.0,
        color: raw.projectileColor ?? raw.projectile?.color ?? theme.trailColorHex,
        splash: Boolean(raw.isSplash) ? {
          radius: raw.splashRadius ?? raw.projectile?.splash?.radius ?? 1.5,
          type: raw.splashType ?? raw.projectile?.splash?.type ?? 'falloff',
        } : undefined,
        effects,
      },
      levels: Array.isArray(raw.levels) && raw.levels.length > 0 
        ? raw.levels.map((lvl: any, idx: number) => {
            const isLvl1 = (lvl.level || (idx + 1)) === 1
            const lvlSplash = isLvl1 
              ? Boolean(raw.isSplash) 
              : (lvl.isSplash !== undefined ? Boolean(lvl.isSplash) : Boolean(raw.isSplash))
            return {
              ...lvl,
              level: lvl.level || (idx + 1),
              isSplash: lvlSplash,
              splashRadius: lvl.splashRadius !== undefined ? Number(lvl.splashRadius) : (raw.splashRadius ?? 1.5),
              splashType: lvl.splashType || raw.splashType || 'falloff',
            }
          })
        : [],
      // Direct root accessors for UI binding
      assetId: raw.assetId ?? raw.asset?.assetId,
      assetName: raw.assetName ?? raw.asset?.assetName ?? name,
      assetPath: raw.assetPath ?? raw.asset?.assetPath ?? '',
      damage,
      attackSpeed,
      range,
      cost,
      scale: raw.scale ?? raw.asset?.scale ?? 1.0,
      muzzleOffsetX: raw.muzzleOffsetX ?? raw.asset?.muzzleOffsetX ?? 0,
      muzzleOffsetY: raw.muzzleOffsetY ?? raw.asset?.muzzleOffsetY ?? 0,
      spanX: raw.spanX ?? raw.asset?.spanX ?? 1,
      spanY: raw.spanY ?? raw.asset?.spanY ?? 1,
      anchorX: raw.anchorX ?? raw.asset?.anchorX ?? 0.5,
      anchorY: raw.anchorY ?? raw.asset?.anchorY ?? 0.88,
      projectileType: projType,
      projectileSpeed: raw.projectileSpeed ?? raw.projectile?.speed ?? 14.0,
      projectileColor: raw.projectileColor ?? raw.projectile?.color ?? theme.trailColorHex,
      isSplash: Boolean(raw.isSplash),
      splashRadius: raw.splashRadius ?? raw.projectile?.splash?.radius ?? 1.5,
      splashType: raw.splashType ?? raw.projectile?.splash?.type ?? 'falloff',
      traits: raw.traits ? [...raw.traits] : [],
      effects,
    }

    this.ensureBlueprintLevels(bp)
    return bp
  }

  /**
   * Extracts Level 1 configuration from a TowerBlueprint.
   */
  public static extractLevelConfigFromBp(bp: TowerBlueprint, level: number = 1): TowerLevelConfig {
    const effects = bp.projectile?.effects?.length ? [...bp.projectile.effects] : EffectProcessor.traitsToEffects(bp)

    return {
      level,
      name: level === 1 ? bp.name : `${bp.name} ${level}`,
      cost: level === 1 ? (bp.stats?.cost || bp.cost || 100) : Math.round((bp.stats?.cost || bp.cost || 100) * (0.8 + (level - 1) * 0.5)),
      damage: bp.stats?.damage || bp.damage || 20,
      attackSpeed: bp.stats?.attackSpeed || bp.attackSpeed || 1.0,
      range: bp.stats?.range || bp.range || 3,
      projectileType: bp.projectile?.type || bp.projectileType || 'arrow',
      projectileId: bp.projectileId || bp.projectile?.type || bp.projectileType || 'arrow',
      projectileSpeed: bp.projectile?.speed || bp.projectileSpeed || 15.0,
      projectileColor: bp.projectile?.color !== undefined ? bp.projectile.color : (bp.projectileColor !== undefined ? bp.projectileColor : 0xd97706),
      isSplash: Boolean(bp.isSplash),
      splashRadius: bp.projectile?.splash?.radius ?? bp.splashRadius ?? 1.5,
      splashType: bp.projectile?.splash?.type ?? bp.splashType ?? 'falloff',
      traits: bp.traits ? [...bp.traits] : [],
      effects,
    }
  }

  /**
   * Ensures the levels array is populated and correctly indexed.
   */
  public static ensureBlueprintLevels(bp: TowerBlueprint): TowerLevelConfig[] {
    if (!bp.levels || !Array.isArray(bp.levels) || bp.levels.length === 0) {
      bp.levels = [this.extractLevelConfigFromBp(bp, 1)]
    } else {
      bp.levels.forEach((lvl, idx) => {
        lvl.level = idx + 1
        if (idx === 0) {
          lvl.isSplash = Boolean(bp.isSplash)
        } else if (lvl.isSplash === undefined) {
          lvl.isSplash = Boolean(bp.isSplash)
        } else {
          lvl.isSplash = Boolean(lvl.isSplash)
        }
      })
    }
    return bp.levels
  }

  /**
   * Retrieves the next level upgrade config for a placed tower.
   */
  public static getNextLevelConfig(tower: PlacedTower, bp?: TowerBlueprint): TowerLevelConfig | null {
    if (!bp || !bp.levels) return null
    const nextLvlIdx = tower.level || 1
    if (nextLvlIdx >= bp.levels.length) return null
    return bp.levels[nextLvlIdx] || null
  }

  /**
   * Adds a new upgrade level to a blueprint.
   */
  public static addBlueprintLevel(bp: TowerBlueprint): TowerLevelConfig {
    this.ensureBlueprintLevels(bp)
    const currentLevels = bp.levels
    const prevLvl = currentLevels[currentLevels.length - 1]
    const nextLvlNum = currentLevels.length + 1

    const newLvl: TowerLevelConfig = {
      ...JSON.parse(JSON.stringify(prevLvl)),
      level: nextLvlNum,
      name: `${bp.name} ${nextLvlNum}`,
      cost: Math.round((prevLvl.cost || bp.stats?.cost || bp.cost || 100) * 1.5),
      damage: Math.round((prevLvl.damage || bp.stats?.damage || bp.damage || 20) * 1.3),
      attackSpeed: Math.max(0.1, Number(((prevLvl.attackSpeed || bp.stats?.attackSpeed || bp.attackSpeed || 1.0) * 0.9).toFixed(2))),
      range: Number(((prevLvl.range || bp.stats?.range || bp.range || 3) + 0.5).toFixed(1)),
    }

    currentLevels.push(newLvl)
    return newLvl
  }

  /**
   * Updates partial parameters on a specific level and syncs Level 1 to root stats.
   */
  public static updateBlueprintLevel(
    bp: TowerBlueprint,
    levelIndex: number,
    partial: Partial<TowerLevelConfig>
  ): void {
    this.ensureBlueprintLevels(bp)
    if (levelIndex < 0 || levelIndex >= bp.levels.length) return
    Object.assign(bp.levels[levelIndex], partial)

    if (levelIndex === 0) {
      if (partial.cost !== undefined) {
        bp.cost = partial.cost
        if (bp.stats) bp.stats.cost = partial.cost
      }
      if (partial.damage !== undefined) {
        bp.damage = partial.damage
        if (bp.stats) bp.stats.damage = partial.damage
      }
      if (partial.attackSpeed !== undefined) {
        bp.attackSpeed = partial.attackSpeed
        if (bp.stats) bp.stats.attackSpeed = partial.attackSpeed
      }
      if (partial.range !== undefined) {
        bp.range = partial.range
        if (bp.stats) bp.stats.range = partial.range
      }
      if (partial.projectileId !== undefined) {
        bp.projectileId = partial.projectileId
      }
      if (partial.projectileType !== undefined) {
        bp.projectileType = partial.projectileType as ProjectileType
        if (!bp.projectileId) bp.projectileId = partial.projectileType
        if (bp.projectile) bp.projectile.type = partial.projectileType as ProjectileType
      }
      if (partial.projectileSpeed !== undefined) {
        bp.projectileSpeed = partial.projectileSpeed
        if (bp.projectile) bp.projectile.speed = partial.projectileSpeed
      }
      if (partial.projectileColor !== undefined) {
        bp.projectileColor = partial.projectileColor
        if (bp.projectile) bp.projectile.color = partial.projectileColor
      }
      if (partial.isSplash !== undefined) {
        bp.isSplash = partial.isSplash
        if (bp.projectile) {
          if (partial.isSplash) {
            bp.projectile.splash = {
              radius: bp.splashRadius || 1.5,
              type: (bp.splashType as SplashType) || 'falloff',
            }
          } else {
            bp.projectile.splash = undefined
          }
        }
      }
      if (partial.splashRadius !== undefined) {
        bp.splashRadius = partial.splashRadius
        if (bp.projectile?.splash) bp.projectile.splash.radius = partial.splashRadius
      }
      if (partial.splashType !== undefined) {
        bp.splashType = partial.splashType as SplashType
        if (bp.projectile?.splash) bp.projectile.splash.type = partial.splashType as SplashType
      }
      if (partial.traits !== undefined) {
        bp.traits = partial.traits
        bp.effects = EffectProcessor.traitsToEffects(bp)
        if (bp.projectile) bp.projectile.effects = [...bp.effects]
      }
      if (partial.effects !== undefined) {
        bp.effects = partial.effects
        if (bp.projectile) bp.projectile.effects = [...partial.effects]
      }
    }
  }

  /**
   * Synchronizes placed towers on the map when their blueprint changes.
   */
  public static syncBlueprintToPlacedTowers(bp: TowerBlueprint, placedTowers: PlacedTower[]): void {
    this.ensureBlueprintLevels(bp)

    for (const t of placedTowers) {
      if (t.blueprintId === bp.id) {
        const lvlIdx = Math.max(0, (t.level || 1) - 1)
        const lvlCfg = bp.levels[lvlIdx] || this.extractLevelConfigFromBp(bp, t.level || 1)

        t.damage = lvlCfg.damage
        t.attackSpeed = lvlCfg.attackSpeed
        t.range = lvlCfg.range
        t.isSplash = lvlCfg.isSplash !== undefined ? lvlCfg.isSplash : !!bp.isSplash
        t.splashRadius = lvlCfg.splashRadius ?? bp.splashRadius ?? 1.5
        t.splashType = (lvlCfg.splashType as SplashType) ?? (bp.splashType as SplashType) ?? 'falloff'
        t.projectileId = bp.projectileId || bp.projectileType || 'arrow'
        t.projectileType = (lvlCfg.projectileType as ProjectileType) ?? bp.projectileType ?? 'arrow'
        t.projectileSpeed = lvlCfg.projectileSpeed ?? bp.projectileSpeed ?? 14.0
        t.projectileColor = lvlCfg.projectileColor ?? bp.projectileColor ?? 0xd97706
        t.traits = lvlCfg.traits ? [...lvlCfg.traits] : (bp.traits ? [...bp.traits] : [])
        t.effects = lvlCfg.effects ? [...lvlCfg.effects] : (bp.effects ? [...bp.effects] : EffectProcessor.traitsToEffects(lvlCfg))
      }
    }
  }
}
