import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useCharacterStore } from './characterStore'
import { useMultiplayerStore } from './multiplayerStore'
import { gridToScreen } from '../utils/isometric'
import { IsoEngine } from '../engine/IsoEngine'
import { TowerTraitType, TowerTraitsConfig, TowerClan } from '../types/map'
import { createDefaultClan, DEFAULT_CLANS_PRESET } from '../utils/towerClans'

export type ProjectileType = 'cannonball' | 'arrow' | 'magic_bolt' | 'fireball' | 'frost_bolt' | 'laser' | 'missile'
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
  targetStrategy?: TargetStrategy
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

  function syncBlueprintChanges(bpId: string) {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return

    // Auto-update color and speed according to projectile type
    if (bp.projectileType === 'cannonball') {
      bp.projectileColor = 0x334155
      if (!bp.projectileSpeed || bp.projectileSpeed > 12) bp.projectileSpeed = 8.5
    } else if (bp.projectileType === 'magic_bolt') {
      bp.projectileColor = 0x38bdf8
      if (!bp.projectileSpeed || bp.projectileSpeed < 14) bp.projectileSpeed = 16.0
    } else if (bp.projectileType === 'fireball') {
      bp.projectileColor = 0xf97316
      if (!bp.projectileSpeed || bp.projectileSpeed > 14) bp.projectileSpeed = 10.5
    } else if (bp.projectileType === 'arrow') {
      bp.projectileColor = 0xd97706
      if (!bp.projectileSpeed || bp.projectileSpeed < 15) bp.projectileSpeed = 18.0
    } else if (bp.projectileType === 'frost_bolt') {
      bp.projectileColor = 0x06b6d4
      if (!bp.projectileSpeed || bp.projectileSpeed < 12) bp.projectileSpeed = 14.0
    } else if (bp.projectileType === 'laser') {
      bp.projectileColor = 0xec4899
      if (!bp.projectileSpeed || bp.projectileSpeed < 20) bp.projectileSpeed = 26.0
    } else if (bp.projectileType === 'missile') {
      bp.projectileColor = 0xe11d48
      if (!bp.projectileSpeed || bp.projectileSpeed > 14) bp.projectileSpeed = 12.0
    }

    // Instantly update all placed towers on the map of this blueprint type in real-time!
    for (const t of placedTowers.value) {
      if (t.blueprintId === bpId) {
        t.damage = bp.damage
        t.attackSpeed = bp.attackSpeed
        t.range = bp.range
        t.isSplash = bp.isSplash
        t.splashRadius = bp.splashRadius
        t.splashType = bp.splashType
        t.projectileType = bp.projectileType
        t.projectileSpeed = bp.projectileSpeed
        t.projectileColor = bp.projectileColor
        t.traits = bp.traits ? [...bp.traits] : []
        t.fireBonusDamage = bp.fireBonusDamage
        t.burnDps = bp.burnDps
        t.burnDuration = bp.burnDuration
        t.slowPercent = bp.slowPercent
        t.slowDuration = bp.slowDuration
        t.frostBonusDamage = bp.frostBonusDamage
        t.poisonDps = bp.poisonDps
        t.poisonDuration = bp.poisonDuration
        t.poisonSlowPercent = bp.poisonSlowPercent
        t.stackBonusDamage = bp.stackBonusDamage
        t.maxStacks = bp.maxStacks
        t.bleedDps = bp.bleedDps
        t.bleedDuration = bp.bleedDuration
        t.electricBonusDamage = bp.electricBonusDamage
        t.chainTargets = bp.chainTargets
        t.stunDuration = bp.stunDuration
        t.voidVulnPercent = bp.voidVulnPercent
        t.voidDuration = bp.voidDuration
      }
    }

    syncToProject()
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
    if (blueprintId) {
      selectedPlacedTowerId.value = null
      toolStore.setTool('select')
    }
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

    // Prevent building on spawn points or walking path lines
    if (characterStore.isCellBlockedForBuilding(col, row)) {
      console.warn(`[Tower Placement Blocked]: Cell (${col}, ${row}) is a spawn point or path route.`)
      return null
    }

    // In Game Mode: check gold balance
    if (characterStore.isGameMode) {
      let currentGold = characterStore.gold
      if (multiplayerStore.roomId) {
        const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        if (myPl) currentGold = myPl.gold
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

    // Check if a tower already exists at this cell
    const existing = placedTowers.value.find(t => t.col === col && t.row === row)
    if (existing) {
      return existing
    }

    const { tileWidth, tileHeight } = mapStore.project
    const ptScreen = gridToScreen(col, row, tileWidth, tileHeight)

    const newTower: PlacedTower = {
      id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      blueprintId: bp.id,
      name: bp.name,
      col,
      row,
      screenX: ptScreen.x,
      screenY: ptScreen.y,
      level: 1,
      damage: bp.damage,
      attackSpeed: bp.attackSpeed,
      range: bp.range,
      projectileType: bp.projectileType,
      projectileSpeed: bp.projectileSpeed,
      projectileColor: bp.projectileColor,
      isSplash: bp.isSplash,
      splashRadius: bp.splashRadius,
      splashType: bp.splashType,
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
    const refund = Math.round(baseCost * 0.7 * (1 + (t.level - 1) * 0.5))

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
   * Upgrades a tower (increases stats by +30%)
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

    let cost = 0
    if (characterStore.isGameMode) {
      const bp = blueprints.value.find(b => b.id === tower.blueprintId)
      const baseCost = bp ? bp.cost : 100
      cost = Math.round(baseCost * 0.6 * tower.level)

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
    tower.level++
    tower.damage = Math.round(tower.damage * 1.35)
    tower.attackSpeed = Math.max(0.15, Number((tower.attackSpeed * 0.9).toFixed(2)))
    tower.range = Number((tower.range + 0.3).toFixed(1))
    if (tower.isSplash) {
      tower.splashRadius = Number((tower.splashRadius + 0.2).toFixed(1))
    }
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
    ;(mapStore.project as any).clans = clans.value.map(c => ({ ...c }))
    ;(mapStore.project as any).placedTowers = placedTowers.value.map(t => ({ ...t }))
    ;(mapStore.project as any).towerBlueprints = blueprints.value.map(b => ({ ...b }))
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
    if (rawTowers && Array.isArray(rawTowers)) {
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
    }
    const rawBlueprints = p.towerBlueprints || p.towerData?.towerBlueprints || []
    if (rawBlueprints && Array.isArray(rawBlueprints) && rawBlueprints.length > 0) {
      const defaultClanId = clans.value[0]?.id || 'clan-default'
      blueprints.value = rawBlueprints.map((bp: any) => ({
        ...bp,
        clanId: bp.clanId || defaultClanId,
        assetId: bp.assetId || (bp.assetName ? `sprite-${bp.assetName.replace(/\.[^/.]+$/, '')}` : ''),
      }))
    }
    ensureDefaultClan()
  }

  /**
   * Main combat simulation tick:
   * 1. Updates damage floaters and explosion rings even when paused.
   * 2. When playing: updates cooldowns, acquires targets, moves projectiles.
   */
  function updateCombatTick(deltaSec: number) {
    // Always update floaters and explosion rings in-place without per-frame array re-allocations
    let activeFloatersCount = 0
    for (let i = 0; i < damageFloaters.value.length; i++) {
      const df = damageFloaters.value[i]
      df.lifeTimer += deltaSec
      df.y -= deltaSec * 35 // Float upwards
      df.alpha = Math.max(0, 1.0 - df.lifeTimer / 0.85)
      if (df.lifeTimer < 0.85) {
        damageFloaters.value[activeFloatersCount++] = df
      }
    }
    damageFloaters.value.length = activeFloatersCount

    let activeRingsCount = 0
    for (let i = 0; i < explosionRings.value.length; i++) {
      const ring = explosionRings.value[i]
      ring.lifeTimer += deltaSec
      const prog = ring.lifeTimer / 0.45
      ring.radius = ring.maxRadius * prog
      ring.alpha = Math.max(0, 1.0 - prog)
      if (ring.lifeTimer < 0.45) {
        explosionRings.value[activeRingsCount++] = ring
      }
    }
    explosionRings.value.length = activeRingsCount

    if (!characterStore.isEnabled || !characterStore.isPlaying) {
      // Clear visual flying projectiles on pause/reset
      if (projectiles.value.length > 0) {
        projectiles.value.length = 0
      }
      return
    }

    const { tileWidth, tileHeight } = mapStore.project
    const activeUnits = characterStore.units.filter((u: any) => u.isSpawned && !u.hasReachedEnd && !u.isDead)

    // 1. Towers Target Acquisition & Shooting
    for (let tIdx = 0; tIdx < placedTowers.value.length; tIdx++) {
      const tower = placedTowers.value[tIdx]
      tower.cooldownTimer -= deltaSec

      if (tower.cooldownTimer <= 0) {
        let bestTarget: any = null

        // 1. Check existing target lock (Sticky Target Focus)
        // Stays focused on the same enemy until it dies or escapes range
        if (tower.targetUnitId) {
          const lockedUnit = activeUnits.find((u: any) => u.id === tower.targetUnitId)
          if (lockedUnit && !lockedUnit.isDead && !lockedUnit.hasReachedEnd) {
            if (Math.abs(lockedUnit.currentCol - tower.col) <= tower.range && Math.abs(lockedUnit.currentRow - tower.row) <= tower.range) {
              const distInTiles = Math.hypot(lockedUnit.currentCol - tower.col, lockedUnit.currentRow - tower.row)
              if (distInTiles <= tower.range) {
                bestTarget = lockedUnit
              }
            }
          }
        }

        // 2. If no valid locked target, acquire new target according to strategy
        if (!bestTarget) {
          tower.targetUnitId = null
          let bestScore = -Infinity
          const strategy = tower.targetStrategy || 'first'

          for (let uIdx = 0; uIdx < activeUnits.length; uIdx++) {
            const unit = activeUnits[uIdx]
            if (Math.abs(unit.currentCol - tower.col) > tower.range || Math.abs(unit.currentRow - tower.row) > tower.range) {
              continue
            }
            const distInTiles = Math.hypot(unit.currentCol - tower.col, unit.currentRow - tower.row)
            if (distInTiles <= tower.range) {
              let score = 0
              if (strategy === 'first') {
                score = unit.pathIndex + (unit.pathInterpolation || 0)
              } else if (strategy === 'last') {
                score = -(unit.pathIndex + (unit.pathInterpolation || 0))
              } else if (strategy === 'strongest') {
                score = unit.currentHp || 0
              } else if (strategy === 'weakest') {
                score = -(unit.currentHp || 0)
              } else if (strategy === 'closest') {
                score = -distInTiles
              }

              if (score > bestScore) {
                bestScore = score
                bestTarget = unit
              }
            }
          }

          if (bestTarget) {
            tower.targetUnitId = bestTarget.id
          }
        }

        if (bestTarget) {
          tower.cooldownTimer = tower.attackSpeed

          // Calculate tower muzzle spawn position (top of stone column)
          const muzzleX = tower.screenX
          const muzzleY = tower.screenY - tileHeight * 1.35 // Muzzle at top of 512px column

          const targetX = bestTarget.screenX
          const targetY = bestTarget.screenY - tileHeight * 0.5 // Target center of body

          const totalDist = Math.hypot(targetX - muzzleX, targetY - muzzleY) || 1
          const projSpeedPx = tower.projectileSpeed * tileWidth // e.g. 10 tiles/sec * 128px
          const projId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

          projectiles.value.push({
            id: projId,
            towerId: tower.id,
            startX: muzzleX,
            startY: muzzleY,
            currentX: muzzleX,
            currentY: muzzleY,
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
          })

          if (multiplayerStore.roomId && multiplayerStore.isHost) {
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
              speed: tower.projectileSpeed,
              isSplash: tower.isSplash,
              splashRadius: tower.splashRadius,
            })
          }
        }
      }
    }

    // 2. Advance Flying Projectiles & Handle Hits (In-place update)
    let remainingProjectilesCount = 0

    for (let pIdx = 0; pIdx < projectiles.value.length; pIdx++) {
      const proj = projectiles.value[pIdx]
      // Find target unit to update its current position in case it moved
      const targetUnit = activeUnits.find((u: any) => u.id === proj.targetUnitId)
      if (targetUnit) {
        proj.targetX = targetUnit.screenX
        proj.targetY = targetUnit.screenY - tileHeight * 0.5
      }

      const dx = proj.targetX - proj.currentX
      const dy = proj.targetY - proj.currentY
      const distToTarget = Math.hypot(dx, dy)

      const moveStep = proj.speed * deltaSec

      if (distToTarget <= moveStep || distToTarget < 12) {
        // --- HIT TARGET / DETONATION ---
        handleProjectileImpact(proj, activeUnits)
      } else {
        // Move towards target
        const dirX = dx / distToTarget
        const dirY = dy / distToTarget
        proj.currentX += dirX * moveStep
        proj.currentY += dirY * moveStep
        proj.traveledDistance += moveStep

        projectiles.value[remainingProjectilesCount++] = proj
      }
    }

    projectiles.value.length = remainingProjectilesCount
  }

  /**
   * Applies damage to target or splash radius area
   */
  function handleProjectileImpact(proj: Projectile, unitsPool: any[]) {
    const { tileWidth, tileHeight } = mapStore.project
    const tower = placedTowers.value.find(t => t.id === proj.towerId)

    if (proj.isSplash && proj.splashRadius > 0) {
      // --- SPLASH DAMAGE ---
      const splashRadiusPx = proj.splashRadius * tileWidth * 0.65

      // Add Explosion Ring VFX (Except for Arrow)
      if (proj.projectileType !== 'arrow') {
        let ringColor = proj.color || 0xf97316
        if (proj.projectileType === 'frost_bolt') ringColor = 0x06b6d4
        else if (proj.projectileType === 'laser') ringColor = 0xf43f5e
        else if (proj.projectileType === 'magic_bolt') ringColor = 0x38bdf8

        explosionRings.value.push({
          id: `ring-${Date.now()}-${Math.random()}`,
          x: proj.targetX,
          y: proj.targetY,
          radius: 4,
          maxRadius: splashRadiusPx,
          color: ringColor,
          alpha: 0.9,
          lifeTimer: 0,
        })
      }

      if (multiplayerStore.roomId && multiplayerStore.isHost) {
        multiplayerStore.queueCombatEvent({
          id: `hit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'COMBAT_HIT',
          targetX: proj.targetX,
          targetY: proj.targetY,
          isSplash: true,
          splashRadius: proj.splashRadius,
          projType: proj.projectileType,
        })
      }

      // Damage all units within splash radius
      for (const u of unitsPool) {
        if (u.isDead) continue
        const distPx = Math.hypot(u.screenX - proj.targetX, (u.screenY - tileHeight * 0.5) - proj.targetY)
        const distInTiles = distPx / (tileWidth * 0.65)

        if (distInTiles <= proj.splashRadius) {
          let dmg = proj.damage

          if (proj.splashType === 'falloff') {
            // Linear falloff: 100% damage at center, 35% damage at perimeter
            const falloffFactor = Math.max(0.35, 1.0 - (distInTiles / proj.splashRadius) * 0.65)
            dmg = Math.round(proj.damage * falloffFactor)
          }

          applyDamageToUnit(u, dmg, tower)
        }
      }
    } else {
      // --- DIRECT SINGLE-TARGET DAMAGE ---
      const targetUnit = unitsPool.find(u => u.id === proj.targetUnitId)
      if (targetUnit && !targetUnit.isDead) {
        applyDamageToUnit(targetUnit, proj.damage, tower)
      }
    }

    // Spawn Impact Spark Particles into IsoEngine (100% matched with TowerLivePreview)
    if (IsoEngine.instance) {
      const isArrow = proj.projectileType === 'arrow'
      const sparkCount = isArrow ? 4 : (proj.isSplash ? 16 : 10)
      let sparkColor = 0xfbbf24
      if (proj.projectileType === 'frost_bolt') sparkColor = 0x67e8f9
      else if (proj.projectileType === 'laser') sparkColor = 0xf43f5e
      else if (proj.projectileType === 'magic_bolt') sparkColor = 0xa855f7
      else if (isArrow) sparkColor = 0xe2e8f0

      for (let s = 0; s < sparkCount; s++) {
        const ang = Math.random() * Math.PI * 2
        const spd = isArrow ? (15 + Math.random() * 40) : (30 + Math.random() * 90)
        IsoEngine.instance.combatSparks.push({
          x: proj.targetX,
          y: proj.targetY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd * 0.7,
          color: sparkColor,
          alpha: 1.0,
          size: isArrow ? (1.5 + Math.random() * 1.5) : (2 + Math.random() * 2.5),
          life: 0.35 + Math.random() * 0.25,
        })
      }
    }
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

    // 1. Check unit vulnerability amplifier (e.g. from Void trait)
    let vulnMultiplier = 1.0
    if (unit.statusEffects && Array.isArray(unit.statusEffects)) {
      const voidEffect = unit.statusEffects.find((e: any) => e.type === 'void')
      if (voidEffect && voidEffect.amplification) {
        vulnMultiplier += voidEffect.amplification / 100
      }
    }

    let finalDamage = Math.round(damage * vulnMultiplier)
    const unitImmunities: TowerTraitType[] = unit.immunities || []

    // 2. Trait-specific calculations if sourceTower is present
    if (sourceTower && sourceTower.traits && sourceTower.traits.length > 0) {
      for (const trait of sourceTower.traits) {
        // --- IMMUNITY CHECK ---
        if (unitImmunities.includes(trait)) {
          // Unit resists this element! Show silver/gold RESIST floater
          damageFloaters.value.push({
            id: `resist-${Date.now()}-${Math.random()}`,
            text: `RESIST (${trait.toUpperCase()})`,
            x: unit.screenX + (Math.random() * 20 - 10),
            y: unit.screenY - mapStore.project.tileHeight * 1.3,
            color: 0x94a3b8,
            alpha: 1.0,
            lifeTimer: 0,
          })
          continue
        }

        // --- TRAIT APPLIED ---
        if (trait === 'fire') {
          const fireBonus = Math.round((sourceTower.fireBonusDamage ?? 5) * vulnMultiplier)
          finalDamage += fireBonus
          
          // Apply / refresh Burn DoT
          const burnDps = sourceTower.burnDps ?? 4
          const burnDur = sourceTower.burnDuration ?? 3.0
          if (!unit.statusEffects) unit.statusEffects = []
          const existing = unit.statusEffects.find((e: any) => e.type === 'fire')
          if (existing) {
            existing.duration = Math.max(existing.duration, burnDur)
            existing.dps = Math.max(existing.dps || 0, burnDps)
          } else {
            unit.statusEffects.push({ type: 'fire', duration: burnDur, dps: burnDps, tickTimer: 0 })
          }
        } else if (trait === 'frost') {
          const frostBonus = Math.round((sourceTower.frostBonusDamage ?? 2) * vulnMultiplier)
          finalDamage += frostBonus

          // Apply / refresh Frost Slow
          const slowPct = sourceTower.slowPercent ?? 30
          const slowDur = sourceTower.slowDuration ?? 2.5
          if (!unit.statusEffects) unit.statusEffects = []
          const existing = unit.statusEffects.find((e: any) => e.type === 'frost')
          if (existing) {
            existing.duration = Math.max(existing.duration, slowDur)
            existing.slowPercent = Math.max(existing.slowPercent || 0, slowPct)
          } else {
            unit.statusEffects.push({ type: 'frost', duration: slowDur, slowPercent: slowPct })
          }
        } else if (trait === 'poison') {
          const poisonDps = sourceTower.poisonDps ?? 6
          const poisonDur = sourceTower.poisonDuration ?? 4.0
          const poisonSlow = sourceTower.poisonSlowPercent ?? 10
          if (!unit.statusEffects) unit.statusEffects = []
          const existing = unit.statusEffects.find((e: any) => e.type === 'poison')
          if (existing) {
            existing.duration = Math.max(existing.duration, poisonDur)
            existing.dps = Math.max(existing.dps || 0, poisonDps)
            existing.slowPercent = Math.max(existing.slowPercent || 0, poisonSlow)
          } else {
            unit.statusEffects.push({ type: 'poison', duration: poisonDur, dps: poisonDps, slowPercent: poisonSlow, tickTimer: 0 })
          }
        } else if (trait === 'stacking') {
          // Consecutive hit stacking ramping damage!
          if (!unit.consecutiveHits) unit.consecutiveHits = {}
          const currentHits = (unit.consecutiveHits[sourceTower.id] || 0) + 1
          unit.consecutiveHits[sourceTower.id] = currentHits
          const stackBonus = sourceTower.stackBonusDamage ?? 4
          const maxSt = sourceTower.maxStacks ?? 10
          const activeStacks = Math.min(maxSt, currentHits)
          const extraStackDmg = Math.round(activeStacks * stackBonus * vulnMultiplier)
          finalDamage += extraStackDmg

          // Show stacking floater badge (e.g. "x3 Hit!")
          if (activeStacks > 1) {
            damageFloaters.value.push({
              id: `stack-${Date.now()}-${Math.random()}`,
              text: `x${activeStacks} RAMP!`,
              x: unit.screenX,
              y: unit.screenY - mapStore.project.tileHeight * 1.35,
              color: 0xfbbf24,
              alpha: 0.9,
              lifeTimer: 0.3,
            })
          }
        } else if (trait === 'blood') {
          const bleedDps = sourceTower.bleedDps ?? 7
          const bleedDur = sourceTower.bleedDuration ?? 3.5
          if (!unit.statusEffects) unit.statusEffects = []
          const existing = unit.statusEffects.find((e: any) => e.type === 'blood')
          if (existing) {
            existing.duration = Math.max(existing.duration, bleedDur)
            existing.dps = Math.max(existing.dps || 0, bleedDps)
          } else {
            unit.statusEffects.push({ type: 'blood', duration: bleedDur, dps: bleedDps, tickTimer: 0 })
          }
        } else if (trait === 'electric') {
          const electricBonus = Math.round((sourceTower.electricBonusDamage ?? 6) * vulnMultiplier)
          finalDamage += electricBonus
          // Micro stun / zap
          const stunDur = sourceTower.stunDuration ?? 0.3
          if (!unit.statusEffects) unit.statusEffects = []
          unit.statusEffects.push({ type: 'electric', duration: stunDur, slowPercent: 90 })
        } else if (trait === 'void') {
          // Void damage amplification curse
          const vuln = sourceTower.voidVulnPercent ?? 25
          const dur = sourceTower.voidDuration ?? 4.0
          if (!unit.statusEffects) unit.statusEffects = []
          const existing = unit.statusEffects.find((e: any) => e.type === 'void')
          if (existing) {
            existing.duration = Math.max(existing.duration, dur)
            existing.amplification = Math.max(existing.amplification || 0, vuln)
          } else {
            unit.statusEffects.push({ type: 'void', duration: dur, amplification: vuln })
          }
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
    placedTowers,
    activeBuildTowerId,
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
    syncToProject,
    restoreFromProject,
    updateCombatTick,
    updateClientCombatInterpolation,
  }
})
