import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useCharacterStore } from './characterStore'
import { useMultiplayerStore } from './multiplayerStore'
import { gridToScreen } from '../utils/isometric'
import { combatEvents } from '../services/combatEvents'
import { TowerTraitType, TowerTraitsConfig, TowerClan, TowerLevelConfig, ProjectileType, GridCoord } from '../types/map'
import { createDefaultClan, DEFAULT_CLANS_PRESET } from '../utils/towerClans'
import { TargetingSystem, DamageCalculator, CombatSimulation } from '../domain/combat'
import { getProjectileTheme } from '../utils/projectileEffectRenderer'
import { getProjectileDef } from '../utils/projectileCatalog'

export type { ProjectileType }
export type SplashType = 'constant' | 'falloff'
export type TargetStrategy = 'first' | 'last' | 'strongest' | 'weakest' | 'closest'

export interface TowerBlueprint extends TowerTraitsConfig {
  id: string
  name: string
  clanId?: string
  assetId?: string
  assetName: string
  assetPath: string
  description: string
  damage: number
  attackSpeed: number // seconds per shot (e.g. 0.5s = 2 shots/sec)
  range: number // in grid tiles (e.g. 3.5 tiles)
  projectileType: ProjectileType
  projectileSpeed: number // tiles per second
  projectileColor: number // hex
  isSplash: boolean
  splashRadius: number // in grid tiles (e.g. 1.5 tiles)
  splashType: SplashType
  cost: number
  scale?: number
  muzzleOffsetX?: number // px offset from tower center for projectile origin (default: 0)
  muzzleOffsetY?: number // px offset from default muzzle Y for projectile origin (default: 0)
  spanX?: number
  spanY?: number
  anchorX?: number
  anchorY?: number
  targetStrategy?: TargetStrategy
  levels?: TowerLevelConfig[]
}

export interface PlacedTower extends TowerTraitsConfig {
  id: string
  blueprintId: string
  name: string
  col: number
  row: number
  screenX: number
  screenY: number
  level: number
  damage: number
  attackSpeed: number
  range: number
  projectileType: ProjectileType
  projectileSpeed: number
  projectileColor: number
  isSplash: boolean
  splashRadius: number
  splashType: SplashType
  cooldownTimer: number
  totalDamageDealt: number
  killsCount: number
  builderId?: string
  builderName?: string
  builderColor?: string
  targetUnitId?: string | null // Current focused locked target
  targetStrategy?: TargetStrategy
}

export interface Projectile {
  id: string
  towerId: string
  startX: number
  startY: number
  currentX: number
  currentY: number
  targetUnitId: string
  targetX: number
  targetY: number
  damage: number
  isSplash: boolean
  splashRadius: number
  splashType: SplashType
  projectileType: ProjectileType
  color: number
  speed: number // pixels per second
  totalDistance: number
  traveledDistance: number
  offsetPerp?: number
  phaseOffset?: number
}

export interface DamageFloater {
  id: string
  text: string
  x: number
  y: number
  color: number
  alpha: number
  lifeTimer: number
}

export interface ExplosionRing {
  id: string
  x: number
  y: number
  radius: number
  maxRadius: number
  color: number
  alpha: number
  lifeTimer: number
}

export const useTowerStore = defineStore('towerStore', () => {
  // User-created Tower Blueprints (Starts empty so user defines all towers)
  const blueprints = ref<TowerBlueprint[]>([])

  // Clans / Factions
  const clans = ref<TowerClan[]>([])
  const selectedClanId = ref<string>('') // Player's faction in game
  const selectedEditorClanId = ref<string>('') // Editor's selected clan in GameConfigModal
  const isClanSelectModalOpen = ref<boolean>(false)

  // Placed towers on map
  const placedTowers = ref<PlacedTower[]>([])
  const activeBuildTowerId = ref<string | null>(null) // When placing a new tower
  const pendingBuildCell = ref<GridCoord | null>(null) // Target cell selected on map for placement
  const selectedPlacedTowerId = ref<string | null>(null) // When inspecting/editing placed tower
  const selectedBlueprintId = ref<string>('') // For Blueprint Editor

  // Active Projectiles & Visual Combat Effects
  const projectiles = ref<Projectile[]>([])
  const damageFloaters = ref<DamageFloater[]>([])
  const explosionRings = ref<ExplosionRing[]>([])

  const mapStore = useMapStore()
  const toolStore = useToolStore()
  const characterStore = useCharacterStore()
  const multiplayerStore = useMultiplayerStore()

  const blueprintMap = computed<Map<string, TowerBlueprint>>(() => {
    const map = new Map<string, TowerBlueprint>()
    for (let i = 0; i < blueprints.value.length; i++) {
      const bp = blueprints.value[i]
      map.set(bp.id, bp)
    }
    return map
  })

  const selectedPlacedTower = computed<PlacedTower | null>(() => {
    if (!selectedPlacedTowerId.value) return null
    return placedTowers.value.find(t => t.id === selectedPlacedTowerId.value) || null
  })

  const selectedClan = computed<TowerClan | null>(() => {
    if (clans.value.length === 0) return null
    return clans.value.find(c => c.id === selectedClanId.value) || clans.value[0] || null
  })

  const selectedEditorClan = computed<TowerClan | null>(() => {
    if (clans.value.length === 0) return null
    return clans.value.find(c => c.id === selectedEditorClanId.value) || clans.value[0] || null
  })

  // Towers belonging to the player's active clan in game
  const playerClanBlueprints = computed<TowerBlueprint[]>(() => {
    if (clans.value.length <= 1) {
      return blueprints.value
    }
    const targetClanId = selectedClanId.value || clans.value[0]?.id
    if (!targetClanId) return blueprints.value
    return blueprints.value.filter(bp => bp.clanId === targetClanId || (!bp.clanId && targetClanId === clans.value[0]?.id))
  })

  // Towers belonging to the selected clan in Editor
  const editorClanBlueprints = computed<TowerBlueprint[]>(() => {
    if (!selectedEditorClanId.value) return blueprints.value
    return blueprints.value.filter(bp => bp.clanId === selectedEditorClanId.value || (!bp.clanId && selectedEditorClanId.value === clans.value[0]?.id))
  })

  const selectedBlueprint = computed<TowerBlueprint | null>(() => {
    if (blueprints.value.length === 0) return null
    const currentClanTowers = editorClanBlueprints.value
    if (currentClanTowers.length > 0) {
      return currentClanTowers.find(bp => bp.id === selectedBlueprintId.value) || currentClanTowers[0]
    }
    return null
  })

  const activeBlueprint = computed<TowerBlueprint | null>(() => {
    if (!activeBuildTowerId.value) return null
    return blueprintMap.value.get(activeBuildTowerId.value) || null
  })

  function extractLevelConfigFromBp(bp: TowerBlueprint, level: number = 1): TowerLevelConfig {
    return {
      level,
      name: level === 1 ? bp.name : `${bp.name} ${level}`,
      cost: level === 1 ? (bp.cost || 100) : Math.round((bp.cost || 100) * (0.8 + (level - 1) * 0.5)),
      damage: bp.damage || 20,
      attackSpeed: bp.attackSpeed || 1.0,
      range: bp.range || 3,
      projectileType: bp.projectileType || 'arrow',
      projectileSpeed: bp.projectileSpeed || 15.0,
      projectileColor: bp.projectileColor !== undefined ? bp.projectileColor : 0xd97706,
      isSplash: !!bp.isSplash,
      splashRadius: bp.splashRadius || 1.5,
      splashType: bp.splashType || 'falloff',
      traits: bp.traits ? [...bp.traits] : [],
      fireBonusDamage: bp.fireBonusDamage,
      burnDps: bp.burnDps,
      burnDuration: bp.burnDuration,
      slowPercent: bp.slowPercent,
      slowDuration: bp.slowDuration,
      frostBonusDamage: bp.frostBonusDamage,
      poisonDps: bp.poisonDps,
      poisonDuration: bp.poisonDuration,
      poisonSlowPercent: bp.poisonSlowPercent,
      stackBonusDamage: bp.stackBonusDamage,
      maxStacks: bp.maxStacks,
      bleedDps: bp.bleedDps,
      bleedDuration: bp.bleedDuration,
      electricBonusDamage: bp.electricBonusDamage,
      chainTargets: bp.chainTargets,
      stunDuration: bp.stunDuration,
      voidVulnPercent: bp.voidVulnPercent,
      voidDuration: bp.voidDuration,
    }
  }

  function ensureBlueprintLevels(bp: TowerBlueprint): TowerLevelConfig[] {
    if (!bp.levels || !Array.isArray(bp.levels) || bp.levels.length === 0) {
      bp.levels = [extractLevelConfigFromBp(bp, 1)]
    } else {
      bp.levels.forEach((lvl, idx) => {
        lvl.level = idx + 1
      })
    }
    return bp.levels
  }

  function syncBlueprintChanges(bpId: string) {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return

    ensureBlueprintLevels(bp)

    // Ensure default projectileColor and speed if not defined
    if (bp.projectileColor === undefined) {
      const theme = getProjectileTheme(bp.projectileType)
      bp.projectileColor = theme.trailColorHex
    }
    if (!bp.projectileSpeed) {
      bp.projectileSpeed = 14.0
    }

    // Instantly update all placed towers on the map of this blueprint type in real-time!
    for (const t of placedTowers.value) {
      if (t.blueprintId === bpId) {
        const lvlIdx = Math.max(0, (t.level || 1) - 1)
        const lvlCfg = bp.levels?.[lvlIdx] || extractLevelConfigFromBp(bp, t.level || 1)

        t.damage = lvlCfg.damage
        t.attackSpeed = lvlCfg.attackSpeed
        t.range = lvlCfg.range
        t.isSplash = lvlCfg.isSplash !== undefined ? lvlCfg.isSplash : bp.isSplash
        t.splashRadius = lvlCfg.splashRadius ?? bp.splashRadius
        t.splashType = lvlCfg.splashType ?? bp.splashType
        t.projectileType = (lvlCfg.projectileType as ProjectileType) ?? bp.projectileType
        t.projectileSpeed = lvlCfg.projectileSpeed ?? bp.projectileSpeed
        t.projectileColor = lvlCfg.projectileColor ?? bp.projectileColor
        t.traits = lvlCfg.traits ? [...lvlCfg.traits] : (bp.traits ? [...bp.traits] : [])
        t.fireBonusDamage = lvlCfg.fireBonusDamage
        t.burnDps = lvlCfg.burnDps
        t.burnDuration = lvlCfg.burnDuration
        t.slowPercent = lvlCfg.slowPercent
        t.slowDuration = lvlCfg.slowDuration
        t.frostBonusDamage = lvlCfg.frostBonusDamage
        t.poisonDps = lvlCfg.poisonDps
        t.poisonDuration = lvlCfg.poisonDuration
        t.poisonSlowPercent = lvlCfg.poisonSlowPercent
        t.stackBonusDamage = lvlCfg.stackBonusDamage
        t.maxStacks = lvlCfg.maxStacks
        t.bleedDps = lvlCfg.bleedDps
        t.bleedDuration = lvlCfg.bleedDuration
        t.electricBonusDamage = lvlCfg.electricBonusDamage
        t.chainTargets = lvlCfg.chainTargets
        t.stunDuration = lvlCfg.stunDuration
        t.voidVulnPercent = lvlCfg.voidVulnPercent
        t.voidDuration = lvlCfg.voidDuration
      }
    }

    syncToProject()
  }

  function addBlueprintLevel(bpId: string): TowerLevelConfig | null {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return null
    ensureBlueprintLevels(bp)
    const currentLevels = bp.levels!
    const prevLvl = currentLevels[currentLevels.length - 1]
    const nextLvlNum = currentLevels.length + 1
    const newLvl: TowerLevelConfig = {
      ...JSON.parse(JSON.stringify(prevLvl)),
      level: nextLvlNum,
      name: `${bp.name} ${nextLvlNum}`,
      cost: Math.round((prevLvl.cost || bp.cost || 100) * 1.5),
      damage: Math.round((prevLvl.damage || bp.damage || 20) * 1.3),
      attackSpeed: Math.max(0.1, Number(((prevLvl.attackSpeed || bp.attackSpeed || 1.0) * 0.9).toFixed(2))),
      range: Number(((prevLvl.range || bp.range || 3) + 0.5).toFixed(1)),
    }
    currentLevels.push(newLvl)
    syncBlueprintChanges(bpId)
    mapStore.pushHistory(`Added Level ${nextLvlNum} to ${bp.name}`)
    return newLvl
  }

  function updateBlueprintLevel(bpId: string, levelIndex: number, partial: Partial<TowerLevelConfig>) {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    ensureBlueprintLevels(bp)
    if (levelIndex < 0 || levelIndex >= bp.levels!.length) return
    Object.assign(bp.levels![levelIndex], partial)
    // If updating level 1, sync to root blueprint fields
    if (levelIndex === 0) {
      if (partial.cost !== undefined) bp.cost = partial.cost
      if (partial.damage !== undefined) bp.damage = partial.damage
      if (partial.attackSpeed !== undefined) bp.attackSpeed = partial.attackSpeed
      if (partial.range !== undefined) bp.range = partial.range
      if (partial.projectileType !== undefined) bp.projectileType = partial.projectileType as ProjectileType
      if (partial.projectileSpeed !== undefined) bp.projectileSpeed = partial.projectileSpeed
      if (partial.projectileColor !== undefined) bp.projectileColor = partial.projectileColor
      if (partial.isSplash !== undefined) bp.isSplash = partial.isSplash
      if (partial.splashRadius !== undefined) bp.splashRadius = partial.splashRadius
      if (partial.splashType !== undefined) bp.splashType = partial.splashType as SplashType
      if (partial.traits !== undefined) bp.traits = partial.traits
      if (partial.fireBonusDamage !== undefined) bp.fireBonusDamage = partial.fireBonusDamage
      if (partial.burnDps !== undefined) bp.burnDps = partial.burnDps
      if (partial.burnDuration !== undefined) bp.burnDuration = partial.burnDuration
      if (partial.slowPercent !== undefined) bp.slowPercent = partial.slowPercent
      if (partial.slowDuration !== undefined) bp.slowDuration = partial.slowDuration
      if (partial.frostBonusDamage !== undefined) bp.frostBonusDamage = partial.frostBonusDamage
      if (partial.poisonDps !== undefined) bp.poisonDps = partial.poisonDps
      if (partial.poisonDuration !== undefined) bp.poisonDuration = partial.poisonDuration
      if (partial.poisonSlowPercent !== undefined) bp.poisonSlowPercent = partial.poisonSlowPercent
      if (partial.stackBonusDamage !== undefined) bp.stackBonusDamage = partial.stackBonusDamage
      if (partial.maxStacks !== undefined) bp.maxStacks = partial.maxStacks
      if (partial.bleedDps !== undefined) bp.bleedDps = partial.bleedDps
      if (partial.bleedDuration !== undefined) bp.bleedDuration = partial.bleedDuration
      if (partial.electricBonusDamage !== undefined) bp.electricBonusDamage = partial.electricBonusDamage
      if (partial.chainTargets !== undefined) bp.chainTargets = partial.chainTargets
      if (partial.stunDuration !== undefined) bp.stunDuration = partial.stunDuration
      if (partial.voidVulnPercent !== undefined) bp.voidVulnPercent = partial.voidVulnPercent
      if (partial.voidDuration !== undefined) bp.voidDuration = partial.voidDuration
    }
    syncBlueprintChanges(bpId)
  }

  function removeBlueprintLevel(bpId: string, levelIndex: number) {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    ensureBlueprintLevels(bp)
    if (levelIndex <= 0 || levelIndex >= bp.levels!.length) return // Cannot delete Level 1 (base)
    bp.levels!.splice(levelIndex, 1)
    bp.levels!.forEach((lvl, idx) => {
      lvl.level = idx + 1
    })
    syncBlueprintChanges(bpId)
    mapStore.pushHistory(`Removed upgrade level from ${bp.name}`)
  }

  function updateBlueprint(bpId: string, updates: Partial<TowerBlueprint>) {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    Object.assign(bp, updates)
    syncBlueprintChanges(bpId)
  }

  function applyBlueprintToAllPlacedTowers(bpId: string) {
    syncBlueprintChanges(bpId)
    const bp = blueprints.value.find(b => b.id === bpId)
    mapStore.pushHistory(`Applied ${bp?.name || 'Tower'} properties to all placed towers`)
  }

  /**
   * Select a blueprint to place on the map
   */
  function selectBuildTower(blueprintId: string | null) {
    activeBuildTowerId.value = blueprintId
    pendingBuildCell.value = null
    if (blueprintId) {
      selectedPlacedTowerId.value = null
      toolStore.setTool('select')
    }
  }

  function setPendingBuildCell(cell: GridCoord | null) {
    pendingBuildCell.value = cell
  }

  function cancelBuild() {
    activeBuildTowerId.value = null
    pendingBuildCell.value = null
    toolStore.setHoveredCell(null)
  }

  function confirmBuild(): PlacedTower | null {
    if (!activeBuildTowerId.value || !pendingBuildCell.value) return null
    const { col, row } = pendingBuildCell.value
    const placed = placeTowerAt(col, row)
    if (placed) {
      pendingBuildCell.value = null
      activeBuildTowerId.value = null
      toolStore.setHoveredCell(null)
      selectedPlacedTowerId.value = null
      return placed
    }
    return null
  }

  function selectPlacedTower(id: string | null) {
    selectedPlacedTowerId.value = id
  }

  const isCreateTowerModalOpen = ref(false)

  function ensureDefaultClan(): TowerClan {
    if (clans.value.length === 0) {
      const defaultClan = createDefaultClan('clan-iron', 'Iron Citadel')
      clans.value = [defaultClan]
    }
    if (!selectedEditorClanId.value && clans.value.length > 0) {
      selectedEditorClanId.value = clans.value[0].id
    }
    const fallbackClanId = clans.value[0].id
    for (const bp of blueprints.value) {
      if (!bp.clanId) {
        bp.clanId = fallbackClanId
      }
    }
    return clans.value[0]
  }

  function createClan(data: Partial<TowerClan>): TowerClan {
    const newClan: TowerClan = {
      id: data.id || `clan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: data.name || 'New Clan',
      description: data.description || '',
      iconName: data.iconName || 'Castle',
      color: data.color || '#38bdf8',
      bannerColor: data.bannerColor || '',
      isDefault: clans.value.length === 0,
    }
    clans.value.push(newClan)
    selectedEditorClanId.value = newClan.id
    syncToProject()
    mapStore.pushHistory(`Created clan: ${newClan.name}`)
    return newClan
  }

  function updateClan(clanId: string, updates: Partial<TowerClan>) {
    const clan = clans.value.find(c => c.id === clanId)
    if (!clan) return
    Object.assign(clan, updates)
    syncToProject()
  }

  function deleteClan(clanId: string) {
    if (clans.value.length <= 1) {
      return
    }
    const idx = clans.value.findIndex(c => c.id === clanId)
    if (idx === -1) return
    const deletedName = clans.value[idx].name
    clans.value.splice(idx, 1)

    const fallbackClanId = clans.value[0].id
    for (const bp of blueprints.value) {
      if (bp.clanId === clanId) {
        bp.clanId = fallbackClanId
      }
    }

    if (selectedEditorClanId.value === clanId) {
      selectedEditorClanId.value = fallbackClanId
    }
    if (selectedClanId.value === clanId) {
      selectedClanId.value = fallbackClanId
    }
    syncToProject()
    mapStore.pushHistory(`Deleted clan: ${deletedName}`)
  }

  function selectEditorClan(clanId: string) {
    selectedEditorClanId.value = clanId
    const clanTowers = blueprints.value.filter(bp => bp.clanId === clanId || (!bp.clanId && clanId === clans.value[0]?.id))
    if (clanTowers.length > 0) {
      if (!clanTowers.some(bp => bp.id === selectedBlueprintId.value)) {
        selectedBlueprintId.value = clanTowers[0].id
      }
    } else {
      selectedBlueprintId.value = ''
    }
  }

  function setPlayerClan(clanId: string) {
    selectedClanId.value = clanId
    isClanSelectModalOpen.value = false
    if (activeBuildTowerId.value) {
      const activeBp = blueprintMap.value.get(activeBuildTowerId.value)
      if (activeBp && activeBp.clanId !== clanId && (activeBp.clanId || clanId !== clans.value[0]?.id)) {
        activeBuildTowerId.value = null
      }
    }
  }

  function openClanSelectModal() {
    isClanSelectModalOpen.value = true
  }

  function closeClanSelectModal() {
    isClanSelectModalOpen.value = false
  }

  function initGameClanSelection() {
    ensureDefaultClan()
    if (clans.value.length <= 1) {
      selectedClanId.value = clans.value[0]?.id || 'clan-default'
      isClanSelectModalOpen.value = false
    } else {
      if (!selectedClanId.value) {
        isClanSelectModalOpen.value = true
      }
    }
  }

  function addNewBlueprint(customBp: TowerBlueprint) {
    ensureDefaultClan()
    if (!customBp.clanId) {
      customBp.clanId = selectedEditorClanId.value || clans.value[0]?.id || 'clan-default'
    }
    blueprints.value.push(customBp)
    selectedBlueprintId.value = customBp.id
    syncBlueprintChanges(customBp.id)
    mapStore.pushHistory(`Created new tower blueprint: ${customBp.name}`)
  }

  function removeBlueprint(bpId: string) {
    if (blueprints.value.length <= 1) return
    const idx = blueprints.value.findIndex(b => b.id === bpId)
    if (idx !== -1) {
      blueprints.value.splice(idx, 1)
      selectedBlueprintId.value = blueprints.value[0].id
      syncToProject()
    }
  }

  /**
   * Places a tower at grid coordinate (col, row)
   */
  function placeTowerAt(col: number, row: number, blueprintId?: string): PlacedTower | null {
    const bpId = blueprintId || activeBuildTowerId.value
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return null

    // 1. Check if a tower already exists on this cell - MUST check before deducting any gold!
    const existing = placedTowers.value.find(t => t.col === col && t.row === row)
    if (existing) {
      console.warn(`[Tower Placement Blocked]: Cell (${col}, ${row}) already has a tower: ${existing.name}`)
      return null
    }

    // 2. Prevent building on non-buildable zones, spawn points, or walking path lines
    if (!mapStore.isCellBuildable(col, row)) {
      console.warn(`[Tower Placement Blocked]: Cell (${col}, ${row}) is not in a designated buildable zone.`)
      return null
    }

    if (characterStore.isCellBlockedForBuilding(col, row)) {
      console.warn(`[Tower Placement Blocked]: Cell (${col}, ${row}) is a spawn point or path route.`)
      return null
    }

    // 3. In Game Mode: check gold balance and deduct only upon valid placement
    if (characterStore.isGameMode) {
      let currentGold = characterStore.gold
      if (multiplayerStore.roomId) {
        const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        if (myPl) currentGold = myPl.gold ?? 0
      }
      if (currentGold < bp.cost) {
        return null
      }
      if (multiplayerStore.roomId) {
        const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        if (myPl) {
          myPl.gold -= bp.cost
          myPl.towersBuilt = (myPl.towersBuilt || 0) + 1
          characterStore.gold = myPl.gold
        } else {
          characterStore.gold -= bp.cost
        }
      } else {
        characterStore.gold -= bp.cost
      }
    }

    const { tileWidth, tileHeight } = mapStore.project
    const ptScreen = gridToScreen(col, row, tileWidth, tileHeight)

    const lvl1 = bp.levels?.[0] || extractLevelConfigFromBp(bp, 1)

    const newTower: PlacedTower = {
      id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      blueprintId: bp.id,
      name: lvl1.name || bp.name,
      col,
      row,
      screenX: ptScreen.x,
      screenY: ptScreen.y,
      level: 1,
      damage: lvl1.damage,
      attackSpeed: lvl1.attackSpeed,
      range: lvl1.range,
      projectileType: (lvl1.projectileType as ProjectileType) || bp.projectileType,
      projectileSpeed: lvl1.projectileSpeed || bp.projectileSpeed,
      projectileColor: lvl1.projectileColor !== undefined ? lvl1.projectileColor : bp.projectileColor,
      isSplash: lvl1.isSplash !== undefined ? lvl1.isSplash : !!bp.isSplash,
      splashRadius: lvl1.splashRadius ?? bp.splashRadius,
      splashType: lvl1.splashType ?? bp.splashType,
      traits: lvl1.traits ? [...lvl1.traits] : (bp.traits ? [...bp.traits] : []),
      fireBonusDamage: lvl1.fireBonusDamage,
      burnDps: lvl1.burnDps,
      burnDuration: lvl1.burnDuration,
      slowPercent: lvl1.slowPercent,
      slowDuration: lvl1.slowDuration,
      frostBonusDamage: lvl1.frostBonusDamage,
      poisonDps: lvl1.poisonDps,
      poisonDuration: lvl1.poisonDuration,
      poisonSlowPercent: lvl1.poisonSlowPercent,
      stackBonusDamage: lvl1.stackBonusDamage,
      maxStacks: lvl1.maxStacks,
      bleedDps: lvl1.bleedDps,
      bleedDuration: lvl1.bleedDuration,
      electricBonusDamage: lvl1.electricBonusDamage,
      chainTargets: lvl1.chainTargets,
      stunDuration: lvl1.stunDuration,
      voidVulnPercent: lvl1.voidVulnPercent,
      voidDuration: lvl1.voidDuration,
      cooldownTimer: Math.random() * 0.3, // slight initial offset
      totalDamageDealt: 0,
      killsCount: 0,
      builderId: multiplayerStore.myPlayerId,
      builderName: multiplayerStore.myPlayerName,
      builderColor: multiplayerStore.myPlayerColor,
      targetUnitId: null,
      targetStrategy: bp.targetStrategy || 'first',
    }

    placedTowers.value.push(newTower)
    selectedPlacedTowerId.value = null
    syncToProject()
    if (!characterStore.isGameMode) {
      mapStore.pushHistory(`Built ${bp.name} at (${col}, ${row})`)
    }

    // Broadcast to multiplayer peers
    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerBuild(newTower)
    }

    return newTower
  }

  /**
   * Sells a placed tower with gold refund (70%)
   * In multiplayer: only the owner/builder can sell their tower!
   */
  function getNextLevelConfig(tower: PlacedTower): TowerLevelConfig | null {
    const bp = blueprints.value.find(b => b.id === tower.blueprintId)
    if (!bp) return null
    ensureBlueprintLevels(bp)
    if (!bp.levels || bp.levels.length <= tower.level) {
      return null
    }
    return bp.levels[tower.level] || null
  }

  function getTowerUpgradeCost(tower: PlacedTower): number {
    const next = getNextLevelConfig(tower)
    return next ? next.cost : 0
  }

  /**
   * Sells a placed tower with gold refund (70% of base + invested upgrade costs)
   * In multiplayer: only the owner/builder can sell their tower!
   */
  function sellPlacedTower(towerId: string) {
    const t = placedTowers.value.find(x => x.id === towerId)
    if (!t) return

    // Ownership check: only builder can sell
    if (multiplayerStore.roomId && t.builderId && t.builderId !== multiplayerStore.myPlayerId) {
      console.warn('[Sell Tower]: Only the tower owner can sell this tower.')
      return
    }

    const bp = blueprints.value.find(b => b.id === t.blueprintId)
    const baseCost = bp ? bp.cost : 100
    let investedUpgrades = 0
    if (bp && bp.levels && t.level > 1) {
      for (let i = 1; i < Math.min(t.level, bp.levels.length); i++) {
        investedUpgrades += bp.levels[i].cost || 0
      }
    }
    const refund = Math.round((baseCost + investedUpgrades) * 0.7)

    if (multiplayerStore.roomId) {
      const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
      if (myPl) {
        myPl.gold += refund
        characterStore.gold = myPl.gold
      } else {
        characterStore.gold += refund
      }
    } else {
      characterStore.gold += refund
    }

    removePlacedTower(towerId)
    mapStore.pushHistory(`Sold ${t.name} (+${refund} Gold)`)

    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerSell(towerId)
    }
  }

  /**
   * Removes a placed tower
   */
  function removePlacedTower(towerId: string) {
    const idx = placedTowers.value.findIndex(t => t.id === towerId)
    if (idx !== -1) {
      const removed = placedTowers.value[idx]
      placedTowers.value.splice(idx, 1)
      if (selectedPlacedTowerId.value === towerId) {
        selectedPlacedTowerId.value = null
      }
      syncToProject()
      mapStore.pushHistory(`Removed ${removed.name}`)
    }
  }

  let lastUpgradeTimestamp = 0

  /**
   * Upgrades a tower to its explicitly configured next level
   * In multiplayer: only the owner/builder can upgrade their tower!
   */
  function upgradePlacedTower(towerId: string): boolean {
    const now = Date.now()
    if (now - lastUpgradeTimestamp < 300) {
      return false
    }

    const tower = placedTowers.value.find(t => t.id === towerId)
    if (!tower) return false

    // Ownership check: only builder can upgrade
    if (multiplayerStore.roomId && tower.builderId && tower.builderId !== multiplayerStore.myPlayerId) {
      console.warn('[Upgrade Tower]: Only the tower owner can upgrade this tower.')
      return false
    }

    const nextLvl = getNextLevelConfig(tower)
    if (!nextLvl) {
      console.warn('[Upgrade Tower]: Tower is already at maximum level.')
      return false
    }

    const cost = nextLvl.cost || 0
    if (characterStore.isGameMode) {
      let currentGold = characterStore.gold
      if (multiplayerStore.roomId) {
        const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        if (myPl) currentGold = myPl.gold ?? 0
      }
      if (currentGold < cost) return false

      if (multiplayerStore.roomId) {
        const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        if (myPl) {
          myPl.gold = Math.max(0, (myPl.gold ?? 0) - cost)
          characterStore.gold = myPl.gold
        } else {
          characterStore.gold = Math.max(0, characterStore.gold - cost)
        }
      } else {
        characterStore.gold = Math.max(0, characterStore.gold - cost)
      }
    }

    lastUpgradeTimestamp = now
    tower.level = nextLvl.level
    tower.damage = nextLvl.damage
    tower.attackSpeed = nextLvl.attackSpeed
    tower.range = nextLvl.range
    if (nextLvl.projectileType) tower.projectileType = nextLvl.projectileType as ProjectileType
    if (nextLvl.projectileSpeed) tower.projectileSpeed = nextLvl.projectileSpeed
    if (nextLvl.projectileColor !== undefined) tower.projectileColor = nextLvl.projectileColor
    tower.isSplash = nextLvl.isSplash !== undefined ? !!nextLvl.isSplash : false
    tower.splashRadius = nextLvl.splashRadius ?? 1.5
    tower.splashType = (nextLvl.splashType as SplashType) ?? 'falloff'
    tower.traits = nextLvl.traits ? [...nextLvl.traits] : []
    tower.fireBonusDamage = nextLvl.fireBonusDamage
    tower.burnDps = nextLvl.burnDps
    tower.burnDuration = nextLvl.burnDuration
    tower.slowPercent = nextLvl.slowPercent
    tower.slowDuration = nextLvl.slowDuration
    tower.frostBonusDamage = nextLvl.frostBonusDamage
    tower.poisonDps = nextLvl.poisonDps
    tower.poisonDuration = nextLvl.poisonDuration
    tower.poisonSlowPercent = nextLvl.poisonSlowPercent
    tower.stackBonusDamage = nextLvl.stackBonusDamage
    tower.maxStacks = nextLvl.maxStacks
    tower.bleedDps = nextLvl.bleedDps
    tower.bleedDuration = nextLvl.bleedDuration
    tower.electricBonusDamage = nextLvl.electricBonusDamage
    tower.chainTargets = nextLvl.chainTargets
    tower.stunDuration = nextLvl.stunDuration
    tower.voidVulnPercent = nextLvl.voidVulnPercent
    tower.voidDuration = nextLvl.voidDuration

    syncToProject()
    if (!characterStore.isGameMode) {
      mapStore.pushHistory(`Upgraded ${tower.name} to Level ${tower.level}`)
    }

    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerUpgrade(tower, cost)
    }

    return true
  }

  const editorTowersSnapshot = ref<PlacedTower[] | null>(null)

  function saveEditorTowersSnapshot() {
    editorTowersSnapshot.value = placedTowers.value.map(t => ({ ...t }))
  }

  function restoreEditorTowersSnapshot() {
    if (editorTowersSnapshot.value !== null) {
      placedTowers.value = editorTowersSnapshot.value.map(t => ({
        ...t,
        totalDamageDealt: 0,
        killsCount: 0,
      }))
      editorTowersSnapshot.value = null
    } else {
      for (const t of placedTowers.value) {
        t.totalDamageDealt = 0
        t.killsCount = 0
      }
    }
    selectedPlacedTowerId.value = null
    activeBuildTowerId.value = null
    clearCombatEffects()
    syncToProject()
  }

  function clearCombatEffects() {
    projectiles.value = []
    damageFloaters.value = []
    explosionRings.value = []
    for (let i = 0; i < placedTowers.value.length; i++) {
      placedTowers.value[i].targetUnitId = null
    }
  }

  /**
   * Sets target strategy on a placed tower
   */
  function setTowerTargetStrategy(towerId: string, strategy: TargetStrategy) {
    const t = placedTowers.value.find(tw => tw.id === towerId)
    if (t) {
      t.targetStrategy = strategy
      t.targetUnitId = null
      syncToProject()
    }
  }

  /**
   * Clears all placed towers
   */
  function clearAllTowers() {
    placedTowers.value = []
    selectedPlacedTowerId.value = null
    clearCombatEffects()
    syncToProject()
  }

  /**
   * Syncs placed towers and custom blueprints into project state
   */
  function syncToProject() {
    if (!mapStore.project) return
      ; (mapStore.project as any).clans = clans.value.map(c => ({ ...c }))
      ; (mapStore.project as any).placedTowers = placedTowers.value.map(t => ({ ...t }))
      ; (mapStore.project as any).towerBlueprints = blueprints.value.map(b => ({ ...b }))
  }

  function resetForNewProject() {
    blueprints.value = []
    placedTowers.value = []
    clans.value = [createDefaultClan('clan-iron', 'Iron Citadel')]
    selectedClanId.value = ''
    selectedEditorClanId.value = clans.value[0]?.id || ''
    activeBuildTowerId.value = null
    selectedPlacedTowerId.value = null
    selectedBlueprintId.value = ''
    clearCombatEffects()
  }

  /**
   * Restores placed towers from project state
   */
  function restoreFromProject() {
    const p = mapStore.project as any

    const rawClans = p.clans || p.towerData?.clans || []
    if (rawClans && Array.isArray(rawClans) && rawClans.length > 0) {
      clans.value = rawClans.map((c: any) => ({ ...c }))
    } else {
      clans.value = [createDefaultClan('clan-iron', 'Iron Citadel')]
    }
    selectedEditorClanId.value = clans.value[0]?.id || ''

    const rawTowers = p.placedTowers || p.towerData?.placedTowers || []
    if (rawTowers && Array.isArray(rawTowers) && rawTowers.length > 0) {
      const { tileWidth, tileHeight } = mapStore.project
      placedTowers.value = rawTowers.map((t: any) => {
        const pt = gridToScreen(t.col, t.row, tileWidth, tileHeight)
        return {
          ...t,
          screenX: pt.x,
          screenY: pt.y,
          cooldownTimer: 0,
        }
      })
    } else {
      placedTowers.value = []
    }

    const rawBlueprints = p.towerBlueprints || p.towerData?.towerBlueprints || []
    if (rawBlueprints && Array.isArray(rawBlueprints) && rawBlueprints.length > 0) {
      const defaultClanId = clans.value[0]?.id || 'clan-default'
      blueprints.value = rawBlueprints.map((bp: any) => {
        const res = {
          ...bp,
          clanId: bp.clanId || defaultClanId,
          assetId: bp.assetId || (bp.assetName ? `sprite-${bp.assetName.replace(/\.[^/.]+$/, '')}` : ''),
        }
        if (res.levels && Array.isArray(res.levels) && res.levels.length > 0) {
          const l1 = res.levels[0]
          if (l1.damage !== undefined) res.damage = l1.damage
          if (l1.cost !== undefined) res.cost = l1.cost
          if (l1.attackSpeed !== undefined) res.attackSpeed = l1.attackSpeed
          if (l1.range !== undefined) res.range = l1.range
          if (l1.projectileType !== undefined) res.projectileType = l1.projectileType
          if (l1.projectileSpeed !== undefined) res.projectileSpeed = l1.projectileSpeed
          if (l1.projectileColor !== undefined) res.projectileColor = l1.projectileColor
          if (l1.isSplash !== undefined) res.isSplash = l1.isSplash
          if (l1.splashRadius !== undefined) res.splashRadius = l1.splashRadius
          if (l1.splashType !== undefined) res.splashType = l1.splashType
          if (l1.traits !== undefined) res.traits = [...l1.traits]
          if (l1.fireBonusDamage !== undefined) res.fireBonusDamage = l1.fireBonusDamage
          if (l1.burnDps !== undefined) res.burnDps = l1.burnDps
          if (l1.burnDuration !== undefined) res.burnDuration = l1.burnDuration
          if (l1.slowPercent !== undefined) res.slowPercent = l1.slowPercent
          if (l1.slowDuration !== undefined) res.slowDuration = l1.slowDuration
          if (l1.frostBonusDamage !== undefined) res.frostBonusDamage = l1.frostBonusDamage
          if (l1.poisonDps !== undefined) res.poisonDps = l1.poisonDps
          if (l1.poisonDuration !== undefined) res.poisonDuration = l1.poisonDuration
          if (l1.poisonSlowPercent !== undefined) res.poisonSlowPercent = l1.poisonSlowPercent
          if (l1.stackBonusDamage !== undefined) res.stackBonusDamage = l1.stackBonusDamage
          if (l1.maxStacks !== undefined) res.maxStacks = l1.maxStacks
          if (l1.bleedDps !== undefined) res.bleedDps = l1.bleedDps
          if (l1.bleedDuration !== undefined) res.bleedDuration = l1.bleedDuration
          if (l1.electricBonusDamage !== undefined) res.electricBonusDamage = l1.electricBonusDamage
          if (l1.chainTargets !== undefined) res.chainTargets = l1.chainTargets
          if (l1.stunDuration !== undefined) res.stunDuration = l1.stunDuration
          if (l1.voidVulnPercent !== undefined) res.voidVulnPercent = l1.voidVulnPercent
          if (l1.voidDuration !== undefined) res.voidDuration = l1.voidDuration
        }
        return res
      })
    } else {
      blueprints.value = []
    }
    ensureDefaultClan()
  }

  /**
   * Main combat simulation tick:
   * 1. Updates damage floaters and explosion rings even when paused.
   * 2. When playing: updates cooldowns, acquires targets, moves projectiles.
   */
  function updateCombatTick(deltaSec: number) {
    // 1. Advance damage floaters and explosion rings via CombatSimulation
    damageFloaters.value.length = CombatSimulation.updateDamageFloaters(damageFloaters.value, deltaSec)
    explosionRings.value.length = CombatSimulation.updateExplosionRings(explosionRings.value, deltaSec)

    if (!characterStore.isEnabled || !characterStore.isPlaying) {
      // Clear visual flying projectiles on pause/reset
      if (projectiles.value.length > 0) {
        projectiles.value.length = 0
      }
      return
    }

    const { tileWidth, tileHeight } = mapStore.project
    const activeUnits = characterStore.units.filter((u: any) => u.isSpawned && !u.hasReachedEnd && !u.isDead)

    // 2. Towers Target Acquisition & Shooting via TargetingSystem
    for (let tIdx = 0; tIdx < placedTowers.value.length; tIdx++) {
      const tower = placedTowers.value[tIdx]
      tower.cooldownTimer -= deltaSec

      if (tower.cooldownTimer <= 0) {
        const bestTarget = TargetingSystem.selectTarget(
          tower.col,
          tower.row,
          tower.range,
          tower.targetStrategy || 'first',
          activeUnits,
          tower.targetUnitId
        )

        tower.targetUnitId = bestTarget ? bestTarget.id : null

        if (bestTarget) {
          tower.cooldownTimer = tower.attackSpeed

          // Calculate tower muzzle spawn position (from blueprint config or default top of column)
          const bp = blueprintMap.value.get(tower.blueprintId)
          const muzzleX = tower.screenX + (bp?.muzzleOffsetX ?? 0)
          const muzzleY = tower.screenY - tileHeight * 1.35 + (bp?.muzzleOffsetY ?? 0)

          const targetX = bestTarget.screenX
          const targetY = bestTarget.screenY - tileHeight * 0.5 // Target center of body

          const projDef = getProjectileDef(tower.projectileType)
          const isInstant = Boolean(projDef.isInstant || projDef.shape === 'instant_strike')
          const effStartX = isInstant ? targetX : muzzleX
          const effStartY = isInstant ? targetY - (projDef.instantType === 'sky_strike' ? 120 : 0) : muzzleY
          const totalDist = isInstant ? 120 : (Math.hypot(targetX - muzzleX, targetY - muzzleY) || 1)
          // Smooth cinematic projectile flight speed matching editor preview
          const projSpeedPx = isInstant ? (tileWidth * 2.8) : ((tower.projectileSpeed || 8.0) * (tileWidth * 0.45))
          const formation = projDef.formation || 'single'

          if (formation === 'volley_3') {
            const offsets = [-14, 0, 14]
            offsets.forEach((off, idx) => {
              const pId = `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
              projectiles.value.push({
                id: pId,
                towerId: tower.id,
                startX: effStartX,
                startY: effStartY,
                currentX: effStartX,
                currentY: effStartY,
                targetUnitId: bestTarget.id,
                targetX,
                targetY,
                damage: tower.damage / 3,
                isSplash: tower.isSplash,
                splashRadius: tower.splashRadius,
                splashType: tower.splashType,
                projectileType: tower.projectileType,
                color: tower.projectileColor,
                speed: projSpeedPx,
                totalDistance: totalDist,
                traveledDistance: 0,
                offsetPerp: off,
                phaseOffset: 0,
              })
            })
          } else if (formation === 'volley_5') {
            const offsets = [-20, -10, 0, 10, 20]
            offsets.forEach((off, idx) => {
              const pId = `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
              projectiles.value.push({
                id: pId,
                towerId: tower.id,
                startX: effStartX,
                startY: effStartY,
                currentX: effStartX,
                currentY: effStartY,
                targetUnitId: bestTarget.id,
                targetX,
                targetY,
                damage: tower.damage / 5,
                isSplash: tower.isSplash,
                splashRadius: tower.splashRadius,
                splashType: tower.splashType,
                projectileType: tower.projectileType,
                color: tower.projectileColor,
                speed: projSpeedPx,
                totalDistance: totalDist,
                traveledDistance: 0,
                offsetPerp: off,
                phaseOffset: 0,
              })
            })
          } else if (formation === 'twin_helix') {
            const helixOffsets = [10, -10]
            const helixPhases = [0, Math.PI]
            helixOffsets.forEach((off, idx) => {
              const pId = `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
              projectiles.value.push({
                id: pId,
                towerId: tower.id,
                startX: effStartX,
                startY: effStartY,
                currentX: effStartX,
                currentY: effStartY,
                targetUnitId: bestTarget.id,
                targetX,
                targetY,
                damage: tower.damage / 2,
                isSplash: tower.isSplash,
                splashRadius: tower.splashRadius,
                splashType: tower.splashType,
                projectileType: tower.projectileType,
                color: tower.projectileColor,
                speed: projSpeedPx,
                totalDistance: totalDist,
                traveledDistance: 0,
                offsetPerp: off,
                phaseOffset: helixPhases[idx],
              })
            })
          } else {
            const projId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            projectiles.value.push({
              id: projId,
              towerId: tower.id,
              startX: effStartX,
              startY: effStartY,
              currentX: effStartX,
              currentY: effStartY,
              targetUnitId: bestTarget.id,
              targetX,
              targetY,
              damage: tower.damage,
              isSplash: tower.isSplash,
              splashRadius: tower.splashRadius,
              splashType: tower.splashType,
              projectileType: tower.projectileType,
              color: tower.projectileColor,
              speed: projSpeedPx,
              totalDistance: totalDist,
              traveledDistance: 0,
              offsetPerp: 0,
              phaseOffset: 0,
            })
          }

          if (multiplayerStore.roomId && multiplayerStore.isHost) {
            const projId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            multiplayerStore.queueCombatEvent({
              id: projId,
              type: 'TOWER_FIRE',
              towerId: tower.id,
              unitId: bestTarget.id,
              projType: tower.projectileType,
              startX: muzzleX,
              startY: muzzleY,
              targetX,
              targetY,
              color: tower.projectileColor,
              speed: projSpeedPx,
              isSplash: tower.isSplash,
              splashRadius: tower.splashRadius,
            })
          }
        }
      }
    }

    // 3. Advance Flying Projectiles & Handle Impacts via CombatSimulation
    projectiles.value.length = CombatSimulation.updateProjectiles(
      projectiles.value,
      activeUnits,
      tileHeight,
      deltaSec,
      (proj) => handleProjectileImpact(proj, activeUnits)
    )
  }

  /**
   * Applies damage to target or splash radius area
   */
  function handleProjectileImpact(proj: Projectile, unitsPool: any[]) {
    const { tileWidth, tileHeight } = mapStore.project
    const tower = placedTowers.value.find(t => t.id === proj.towerId)
    const projDef = getProjectileDef(proj.projectileType)
    const theme = getProjectileTheme(proj.projectileType, proj.color)
    const isArrow = proj.projectileType === 'arrow'
    const isFireSplash = proj.projectileType === 'fire_splash'
    const isSplashHit = Boolean(proj.isSplash && (proj.splashRadius || 0) > 0)
    const effectiveSplashRadius = proj.splashRadius || 1.5
    const splashRadiusPx = effectiveSplashRadius * tileWidth * 0.65
    const hitRingRadius = isSplashHit 
      ? splashRadiusPx 
      : (projDef.shockwaveRadius || (isArrow ? 14 : 22))

    // 1. Spawn Impact Shockwave Ring VFX for ALL hits (matching Projectile Studio!)
    explosionRings.value.push({
      id: `ring-${Date.now()}-${Math.random()}`,
      x: proj.targetX,
      y: proj.targetY,
      radius: 3,
      maxRadius: hitRingRadius,
      color: projDef.shockwaveColorHex ?? theme.shockwaveColorHex,
      alpha: isFireSplash ? 0.96 : 0.92,
      lifeTimer: 0,
    })

    if (isFireSplash || projDef.hasDoubleRing) {
      // Extra inner plasma flame ring for double shockwave ring
      explosionRings.value.push({
        id: `ring-inner-${Date.now()}-${Math.random()}`,
        x: proj.targetX,
        y: proj.targetY,
        radius: 2,
        maxRadius: hitRingRadius * 0.6,
        color: 0xfef08a,
        alpha: 0.98,
        lifeTimer: 0,
      })
    }

    if (multiplayerStore.roomId && multiplayerStore.isHost) {
      multiplayerStore.queueCombatEvent({
        id: `hit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'COMBAT_HIT',
        targetX: proj.targetX,
        targetY: proj.targetY,
        isSplash: isSplashHit,
        splashRadius: effectiveSplashRadius,
        projType: proj.projectileType,
      })
    }

    // 2. Apply Damage (Splash AoE or Direct Single-Target)
    if (isSplashHit) {
      for (const u of unitsPool) {
        if (u.isDead) continue
        const distPx = Math.hypot(u.screenX - proj.targetX, (u.screenY - tileHeight * 0.5) - proj.targetY)
        const distInTiles = distPx / (tileWidth * 0.65)

        if (distInTiles <= effectiveSplashRadius) {
          const dmg = DamageCalculator.calculateSplashDamage(
            proj.damage,
            distInTiles,
            effectiveSplashRadius,
            proj.splashType || 'falloff'
          )
          applyDamageToUnit(u, dmg, tower)
        }
      }
    } else {
      const targetUnit = unitsPool.find(u => u.id === proj.targetUnitId)
      if (targetUnit && !targetUnit.isDead) {
        applyDamageToUnit(targetUnit, proj.damage, tower)
      }
    }

    // 3. Spawn Impact Spark Particles via combatEvents (matching exact spark count and type)
    const sparkCount = projDef.sparkCount || (isFireSplash ? 24 : (isArrow ? 8 : (isSplashHit ? 16 : 10)))

    combatEvents.emitImpact({
      x: proj.targetX,
      y: proj.targetY,
      color: projDef.sparkColorHex ?? (isFireSplash ? 0xf97316 : theme.sparkColorHex),
      count: sparkCount,
      projectileType: proj.projectileType,
    })
  }

  /**
   * Deals damage to a unit, triggers floaters, and handles unit death
   */
  function applyDamageToUnit(unit: any, damage: number, sourceTower?: PlacedTower) {
    if (unit.isDead) return

    // Ensure unit has HP properties initialized
    if (unit.maxHp === undefined) {
      unit.maxHp = (characterStore as any).currentWaveHp || 100
      unit.currentHp = unit.maxHp
    }

    // 1. Calculate hit damage, elemental traits, immunities, and status effects via DamageCalculator
    const result = DamageCalculator.calculateDamage(damage, sourceTower, unit)
    const finalDamage = result.finalDamage

    if (result.isResisted && result.resistedTrait) {
      damageFloaters.value.push({
        id: `resist-${Date.now()}-${Math.random()}`,
        text: `RESIST (${result.resistedTrait.toUpperCase()})`,
        x: unit.screenX + (Math.random() * 20 - 10),
        y: unit.screenY - mapStore.project.tileHeight * 1.3,
        color: 0x94a3b8,
        alpha: 1.0,
        lifeTimer: 0,
      })
    }

    if (result.stackCount && result.stackCount > 1) {
      damageFloaters.value.push({
        id: `stack-${Date.now()}-${Math.random()}`,
        text: `x${result.stackCount} RAMP!`,
        x: unit.screenX,
        y: unit.screenY - mapStore.project.tileHeight * 1.35,
        color: 0xfbbf24,
        alpha: 0.9,
        lifeTimer: 0.3,
      })
    }

    // Apply or refresh status effects
    if (result.appliedStatusEffects.length > 0) {
      if (!unit.statusEffects) unit.statusEffects = []
      for (const eff of result.appliedStatusEffects) {
        const existing = unit.statusEffects.find((e: any) => e.type === eff.type)
        if (existing) {
          existing.duration = Math.max(existing.duration, eff.duration)
          if (eff.dps !== undefined) existing.dps = Math.max(existing.dps || 0, eff.dps)
          if (eff.slowPercent !== undefined) existing.slowPercent = Math.max(existing.slowPercent || 0, eff.slowPercent)
          if (eff.amplification !== undefined) existing.amplification = Math.max(existing.amplification || 0, eff.amplification)
        } else {
          unit.statusEffects.push({ ...eff, tickTimer: 0 })
        }
      }
    }

    unit.currentHp = Math.max(0, unit.currentHp - finalDamage)

    // Damage text floater
    damageFloaters.value.push({
      id: `df-${Date.now()}-${Math.random()}`,
      text: `-${finalDamage}`,
      x: unit.screenX + (Math.random() * 20 - 10),
      y: unit.screenY - mapStore.project.tileHeight * 1.1,
      color: finalDamage >= 70 ? 0xef4444 : 0xfbbf24,
      alpha: 1.0,
      lifeTimer: 0,
    })

    if (multiplayerStore.roomId && multiplayerStore.isHost) {
      multiplayerStore.queueCombatEvent({
        id: `hit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'COMBAT_HIT',
        unitId: unit.id,
        targetX: unit.screenX,
        targetY: unit.screenY,
        damage: finalDamage,
        currentHp: unit.currentHp,
        isCrit: finalDamage >= 70,
      })
    }

    if (sourceTower) {
      sourceTower.totalDamageDealt += finalDamage
    }

    // Unit died!
    if (unit.currentHp <= 0) {
      unit.isDead = true
      // Clear target locks for all towers aiming at this deceased unit
      for (let i = 0; i < placedTowers.value.length; i++) {
        if (placedTowers.value[i].targetUnitId === unit.id) {
          placedTowers.value[i].targetUnitId = null
        }
      }
      unit.action = 'Pickup'
      unit.frameIndex = 0
      unit.animTimer = 0
      unit.deathFade = 1.0
      characterStore.totalKills++

      const waveCfg = characterStore.currentWaveConfig
      const killGold = Math.max(0, Number(waveCfg?.unitBonus ?? waveCfg?.goldReward) ?? 1)

      if (sourceTower) {
        sourceTower.killsCount++
      }

      // In Multiplayer Mode: Reward ONLY the specific player who built this attacking tower!
      if (multiplayerStore.roomId) {
        const killerPlayerId = sourceTower?.builderId || multiplayerStore.myPlayerId
        multiplayerStore.recordPlayerKill(killerPlayerId, killGold)
      } else {
        // Single Player Game Mode:
        if (characterStore.isGameMode) {
          characterStore.gold += killGold
          characterStore.totalGoldEarned += killGold
        }
      }

      // Floating Gold VFX Floater (+15 G)
      damageFloaters.value.push({
        id: `gold-drop-${Date.now()}-${Math.random()}`,
        text: `+${killGold} G`,
        x: unit.screenX,
        y: unit.screenY - 24,
        color: 0xfbbf24, // Amber gold color
        alpha: 1.0,
        lifeTimer: 0.9,
      })

      if (multiplayerStore.roomId && multiplayerStore.isHost) {
        multiplayerStore.queueCombatEvent({
          id: `die-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'UNIT_DIED',
          unitId: unit.id,
          targetX: unit.screenX,
          targetY: unit.screenY,
          killerId: sourceTower?.builderId,
          goldReward: killGold,
        })
      }
    }
  }

  /**
   * Client-side visual combat effects & floaters animation between network ticks
   */
  function updateClientCombatInterpolation(deltaSec: number) {
    // 1. Advance projectiles smoothly towards target
    for (let i = projectiles.value.length - 1; i >= 0; i--) {
      const p = projectiles.value[i]
      p.traveledDistance += p.speed * deltaSec
      const t = Math.min(1.0, p.traveledDistance / p.totalDistance)
      p.currentX = p.startX + (p.targetX - p.startX) * t
      p.currentY = p.startY + (p.targetY - p.startY) * t
      if (t >= 1.0) {
        projectiles.value.splice(i, 1)
      }
    }

    // 2. Animate explosion shockwaves
    for (let i = explosionRings.value.length - 1; i >= 0; i--) {
      const ring = explosionRings.value[i]
      ring.radius += ring.maxRadius * (deltaSec / 0.35)
      ring.alpha = Math.max(0, 1.0 - ring.radius / ring.maxRadius)
      if (ring.radius >= ring.maxRadius || ring.alpha <= 0) {
        explosionRings.value.splice(i, 1)
      }
    }

    // 3. Animate damage floaters
    for (let i = damageFloaters.value.length - 1; i >= 0; i--) {
      const df = damageFloaters.value[i]
      df.lifeTimer += deltaSec
      df.y -= 28 * deltaSec
      df.alpha = Math.max(0, 1.0 - df.lifeTimer / 0.9)
      if (df.lifeTimer >= 0.9) {
        damageFloaters.value.splice(i, 1)
      }
    }
  }

  return {
    blueprints,
    clans,
    selectedClanId,
    selectedEditorClanId,
    selectedClan,
    selectedEditorClan,
    playerClanBlueprints,
    editorClanBlueprints,
    isClanSelectModalOpen,
    ensureDefaultClan,
    createClan,
    updateClan,
    deleteClan,
    selectEditorClan,
    setPlayerClan,
    openClanSelectModal,
    closeClanSelectModal,
    initGameClanSelection,
    selectedBlueprintId,
    selectedBlueprint,
    updateBlueprint,
    syncBlueprintChanges,
    applyBlueprintToAllPlacedTowers,
    addBlueprintLevel,
    updateBlueprintLevel,
    removeBlueprintLevel,
    ensureBlueprintLevels,
    getNextLevelConfig,
    getTowerUpgradeCost,
    placedTowers,
    activeBuildTowerId,
    pendingBuildCell,
    selectedPlacedTowerId,
    selectedPlacedTower,
    activeBlueprint,
    projectiles,
    damageFloaters,
    explosionRings,
    isCreateTowerModalOpen,
    addNewBlueprint,
    removeBlueprint,
    selectBuildTower,
    setPendingBuildCell,
    cancelBuild,
    confirmBuild,
    selectPlacedTower,
    sellPlacedTower,
    placeTowerAt,
    removePlacedTower,
    upgradePlacedTower,
    setTowerTargetStrategy,
    clearAllTowers,
    saveEditorTowersSnapshot,
    restoreEditorTowersSnapshot,
    clearCombatEffects,
    resetForNewProject,
    syncToProject,
    restoreFromProject,
    updateCombatTick,
    updateClientCombatInterpolation,
  }
})
