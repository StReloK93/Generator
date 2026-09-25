import { TowerBlueprint, PlacedTower, TowerLevel, TowerAsset } from '../../types/tower'
import { SplashType, TargetStrategy } from '../../types/combat'
import { EffectProcessor } from '../combat/EffectProcessor'

/**
 * TowerBlueprintManager — Domain logic for Tower Blueprints, Upgrades, Normalization, and Synchronization.
 * 
 * SOLID: Single Responsibility Principle (SRP) and Composition over Property Accumulation.
 * Single Source of Truth: All level-specific stats reside inside `bp.levels[]`, and visual asset data in `bp.asset`.
 */
export class TowerBlueprintManager {
  /**
   * Normalizes an incoming raw/legacy blueprint object into the standardized composable TowerBlueprint structure.
   */
  public static normalizeBlueprint(raw: any): TowerBlueprint {
    const name = raw.name || 'Tower'
    const id = raw.id || `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const description = raw.description || ''
    const clanId = raw.clanId
    const targetStrategy: TargetStrategy = raw.targetStrategy || 'first'
    const projectileId = raw.projectileId || raw.projectileType || raw.projectile?.type || 'fireball'

    const rawName = (raw.asset?.assetName || raw.assetName || name).trim()
    const assetId = raw.asset?.assetId || raw.assetId || (rawName ? (rawName.startsWith('sprite-') ? rawName : `sprite-${rawName.replace(/\.[^/.]+$/, '')}`) : 'sprite-stoneColumn_W')
    const assetName = raw.asset?.assetName || raw.assetName || (rawName ? (rawName.endsWith('.webp') || rawName.endsWith('.png') ? rawName : `${rawName}.webp`) : 'stoneColumn_W.webp')
    const assetPath = raw.asset?.assetPath || (raw.assetPath && (raw.assetPath.startsWith('http://') || raw.assetPath.startsWith('https://')) ? raw.assetPath : '')

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

    // Default tower is NEVER splash unless explicitly specified as true
    const rawIsSplash = Boolean(raw.isSplash)

    let levels: TowerLevel[] = []
    if (Array.isArray(raw.levels) && raw.levels.length > 0) {
      levels = raw.levels.map((lvl: any, idx: number) => {
        const lvlNum = lvl.level || (idx + 1)
        const isLvl1 = lvlNum === 1
        const lvlIsSplash = lvl.isSplash !== undefined ? Boolean(lvl.isSplash) : (isLvl1 ? rawIsSplash : false)

        return {
          ...lvl,
          level: lvlNum,
          name: lvl.name || (isLvl1 ? name : `${name} ${lvlNum}`),
          cost: Number(lvl.cost ?? raw.cost ?? raw.stats?.cost ?? 100),
          damage: Number(lvl.damage ?? raw.damage ?? raw.stats?.damage ?? 20),
          attackSpeed: Number(lvl.attackSpeed ?? raw.attackSpeed ?? raw.stats?.attackSpeed ?? 1.0),
          range: Number(lvl.range ?? raw.range ?? raw.stats?.range ?? 3.0),
          isSplash: lvlIsSplash,
          splashRadius: lvlIsSplash ? Number(lvl.splashRadius ?? raw.splashRadius ?? 1.5) : undefined,
          splashType: lvlIsSplash ? (lvl.splashType || raw.splashType || 'falloff') : undefined,
          traits: Array.isArray(lvl.traits) ? [...lvl.traits] : (Array.isArray(raw.traits) ? [...raw.traits] : []),
          effects: Array.isArray(lvl.effects) && lvl.effects.length > 0
            ? [...lvl.effects]
            : (Array.isArray(raw.effects) && raw.effects.length > 0 ? [...raw.effects] : EffectProcessor.traitsToEffects({ ...lvl, isSplash: lvlIsSplash })),
        }
      })
    } else {
      levels = [
        {
          ...raw,
          level: 1,
          name: name,
          cost: Number(raw.cost ?? raw.stats?.cost ?? 100),
          damage: Number(raw.damage ?? raw.stats?.damage ?? 20),
          attackSpeed: Number(raw.attackSpeed ?? raw.stats?.attackSpeed ?? 1.0),
          range: Number(raw.range ?? raw.stats?.range ?? 3.0),
          isSplash: rawIsSplash,
          splashRadius: rawIsSplash ? Number(raw.splashRadius ?? 1.5) : undefined,
          splashType: rawIsSplash ? (raw.splashType || 'falloff') : undefined,
          traits: Array.isArray(raw.traits) ? [...raw.traits] : [],
          effects: Array.isArray(raw.effects) && raw.effects.length > 0 ? [...raw.effects] : EffectProcessor.traitsToEffects({ ...raw, isSplash: rawIsSplash }),
        }
      ]
    }

    const bp: TowerBlueprint = {
      id,
      name,
      description,
      clanId,
      asset,
      projectileId,
      targetStrategy,
      levels,
    }

    // Attach reactive property proxies for backward-compatible convenience without duplicating state
    this.attachPropertyProxies(bp)

    return bp
  }

  /**
   * Attaches backward-compatible property accessors mapping directly to `bp.levels[0]` and `bp.asset`.
   */
  public static attachPropertyProxies(bp: TowerBlueprint): void {
    if (!bp.levels || bp.levels.length === 0) {
      this.ensureBlueprintLevels(bp)
    }

    const defineProp = (prop: string, getter: () => any, setter?: (val: any) => void) => {
      try {
        Object.defineProperty(bp, prop, {
          get: getter,
          set: setter || (() => {}),
          enumerable: true,
          configurable: true,
        })
      } catch {
        // Ignored if already configured
      }
    }

    defineProp('cost', () => bp.levels[0]?.cost ?? 100, (v) => { if (bp.levels[0]) bp.levels[0].cost = Number(v) })
    defineProp('damage', () => bp.levels[0]?.damage ?? 20, (v) => { if (bp.levels[0]) bp.levels[0].damage = Number(v) })
    defineProp('attackSpeed', () => bp.levels[0]?.attackSpeed ?? 1.0, (v) => { if (bp.levels[0]) bp.levels[0].attackSpeed = Number(v) })
    defineProp('range', () => bp.levels[0]?.range ?? 3.0, (v) => { if (bp.levels[0]) bp.levels[0].range = Number(v) })
    defineProp('isSplash', () => Boolean(bp.levels[0]?.isSplash), (v) => { if (bp.levels[0]) bp.levels[0].isSplash = Boolean(v) })
    defineProp('splashRadius', () => bp.levels[0]?.splashRadius ?? 1.5, (v) => { if (bp.levels[0]) bp.levels[0].splashRadius = Number(v) })
    defineProp('splashType', () => bp.levels[0]?.splashType || 'falloff', (v) => { if (bp.levels[0]) bp.levels[0].splashType = v })
    defineProp('traits', () => bp.levels[0]?.traits || [], (v) => { if (bp.levels[0]) bp.levels[0].traits = v })
    defineProp('effects', () => bp.levels[0]?.effects || [], (v) => { if (bp.levels[0]) bp.levels[0].effects = v })

    defineProp('assetId', () => bp.asset?.assetId || '', (v) => { if (bp.asset) bp.asset.assetId = v })
    defineProp('assetName', () => bp.asset?.assetName || '', (v) => { if (bp.asset) bp.asset.assetName = v })
    defineProp('assetPath', () => bp.asset?.assetPath || '', (v) => { if (bp.asset) bp.asset.assetPath = v })
    defineProp('scale', () => bp.asset?.scale ?? 1.0, (v) => { if (bp.asset) bp.asset.scale = Number(v) })
    defineProp('spanX', () => bp.asset?.spanX ?? 1, (v) => { if (bp.asset) bp.asset.spanX = Number(v) })
    defineProp('spanY', () => bp.asset?.spanY ?? 1, (v) => { if (bp.asset) bp.asset.spanY = Number(v) })
    defineProp('anchorX', () => bp.asset?.anchorX ?? 0.5, (v) => { if (bp.asset) bp.asset.anchorX = Number(v) })
    defineProp('anchorY', () => bp.asset?.anchorY ?? 0.88, (v) => { if (bp.asset) bp.asset.anchorY = Number(v) })
    defineProp('muzzleOffsetX', () => bp.asset?.muzzleOffsetX ?? 0, (v) => { if (bp.asset) bp.asset.muzzleOffsetX = Number(v) })
    defineProp('muzzleOffsetY', () => bp.asset?.muzzleOffsetY ?? 0, (v) => { if (bp.asset) bp.asset.muzzleOffsetY = Number(v) })

    defineProp('projectileType', () => bp.projectileId || 'fireball', (v) => { bp.projectileId = v })
    defineProp('projectileSpeed', () => 14.0)
    defineProp('projectileColor', () => 0xd97706)
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
      level,
      name: `${bp.name} ${level}`,
      cost: Math.round(lvl1.cost * (0.8 + (level - 1) * 0.5)),
      damage: Math.round(lvl1.damage * (1 + (level - 1) * 0.3)),
      attackSpeed: lvl1.attackSpeed,
      range: lvl1.range,
      isSplash: Boolean(lvl1.isSplash),
      splashRadius: lvl1.splashRadius,
      splashType: lvl1.splashType,
      traits: lvl1.traits ? [...lvl1.traits] : [],
      effects: lvl1.effects ? [...lvl1.effects] : [],
    }
  }

  /**
   * Ensures the levels array is populated and correctly indexed.
   */
  public static ensureBlueprintLevels(bp: TowerBlueprint): TowerLevel[] {
    if (!bp.levels || !Array.isArray(bp.levels) || bp.levels.length === 0) {
      const isSplash = Boolean((bp as any).isSplash)
      bp.levels = [
        {
          level: 1,
          name: bp.name,
          cost: Number(bp.cost || (bp as any).stats?.cost || 100),
          damage: Number(bp.damage || (bp as any).stats?.damage || 20),
          attackSpeed: Number(bp.attackSpeed || (bp as any).stats?.attackSpeed || 1.0),
          range: Number(bp.range || (bp as any).stats?.range || 3.0),
          isSplash,
          splashRadius: isSplash ? Number(bp.splashRadius ?? 1.5) : undefined,
          splashType: isSplash ? (bp.splashType || 'falloff') : undefined,
          traits: (bp as any).traits ? [...(bp as any).traits] : [],
          effects: (bp as any).effects ? [...(bp as any).effects] : [],
        }
      ]
    } else {
      bp.levels.forEach((lvl, idx) => {
        lvl.level = idx + 1
        lvl.isSplash = Boolean(lvl.isSplash)
      })
    }

    this.attachPropertyProxies(bp)
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
   */
  public static syncBlueprintToPlacedTowers(bp: TowerBlueprint, placedTowers: PlacedTower[]): void {
    this.ensureBlueprintLevels(bp)

    for (const t of placedTowers) {
      if (t.blueprintId === bp.id) {
        const lvlIdx = Math.max(0, (t.level || 1) - 1)
        const lvlCfg = bp.levels[lvlIdx] || bp.levels[0]

        Object.assign(t, lvlCfg)
        t.damage = lvlCfg.damage
        t.attackSpeed = lvlCfg.attackSpeed
        t.range = lvlCfg.range
        t.isSplash = Boolean(lvlCfg.isSplash)
        t.splashRadius = lvlCfg.splashRadius ?? 1.5
        t.splashType = (lvlCfg.splashType as SplashType) ?? 'falloff'
        t.projectileId = bp.projectileId || 'fireball'
        t.targetStrategy = bp.targetStrategy || t.targetStrategy || 'first'
        t.traits = (lvlCfg.traits ? [...lvlCfg.traits] : []) as any
        t.effects = EffectProcessor.traitsToEffects(lvlCfg)
      }
    }
  }
}
