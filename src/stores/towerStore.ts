import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useCharacterStore } from './characterStore'
import { useRouteStore } from './routeStore'
import { useWaveStore } from './waveStore'
import { useGameStore } from './gameStore'
import { useMultiplayerStore } from './multiplayerStore'
import { gridToScreen } from '../utils/isometric'
import { TowerClan, TowerLevelConfig, ProjectileType, GridCoord, SplashType, TargetStrategy } from '../types/map'
import { createDefaultClan } from '../utils/towerClans'
import { TowerBlueprintManager } from '../domain/tower/TowerBlueprintManager'
import { CombatEngine } from '../domain/combat'

export type { 
  TowerBlueprint, 
  PlacedTower, 
  TowerLevelConfig, 
  ProjectileType, 
  SplashType, 
  TargetStrategy, 
  CombatEffect 
} from '../types/map'
import type { TowerBlueprint, PlacedTower } from '../types/map'

/**
 * Uchib borayotgan snaryad (Flying Projectile).
 */
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
  speed: number
  totalDistance: number
  traveledDistance: number
  offsetPerp?: number
  phaseOffset?: number
}

/**
 * Urilgan zarba matni (Floating Damage Text).
 */
export interface DamageFloater {
  id: string
  text: string
  x: number
  y: number
  color: number
  alpha: number
  lifeTimer: number
}

/**
 * Splash va to'qnashuv to'lqin halqasi (Explosion Ring).
 */
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

/**
 * useTowerStore — Minoralar (Towers), shablonlar (Blueprints), klanlar (Clans)
 * va jang effektlarini boshqaruvchi markazlashgan Pinia Store.
 * 
 * SOLID Prinsiplari:
 * 1. Single Responsibility (SRP): Store faqat reaktiv holatni (State) saqlaydi.
 * 2. Domain Separation: Darajalar hisobi `TowerBlueprintManager`ga, jang mexanikasi `CombatEngine`ga ajratilgan.
 */
export const useTowerStore = defineStore('towerStore', () => {
  // ==========================================
  // 1. REAKTIV HOLAT (REACTIVE STATE)
  // ==========================================
  const blueprints = ref<TowerBlueprint[]>([])
  const clans = ref<TowerClan[]>([])
  const selectedClanId = ref<string>('')
  const selectedEditorClanId = ref<string>('')
  const isClanSelectModalOpen = ref<boolean>(false)
  const isCreateTowerModalOpen = ref<boolean>(false)

  // Xaritadagi minoralar
  const placedTowers = ref<PlacedTower[]>([])
  const activeBuildTowerId = ref<string | null>(null)
  const pendingBuildCell = ref<GridCoord | null>(null)
  const selectedPlacedTowerId = ref<string | null>(null)
  const selectedBlueprintId = ref<string>('')

  // Jang vizual effektlari
  const projectiles = ref<Projectile[]>([])
  const damageFloaters = ref<DamageFloater[]>([])
  const explosionRings = ref<ExplosionRing[]>([])

  const mapStore = useMapStore()
  const toolStore = useToolStore()
  const characterStore = useCharacterStore()
  const routeStore = useRouteStore()
  const waveStore = useWaveStore()
  const gameStore = useGameStore()
  const multiplayerStore = useMultiplayerStore()

  // ==========================================
  // 2. HISOBLANUVCHI QIYMATLAR (COMPUTEDS)
  // ==========================================
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

  const playerClanBlueprints = computed<TowerBlueprint[]>(() => {
    if (clans.value.length <= 1) {
      return blueprints.value
    }
    const targetClanId = selectedClanId.value || clans.value[0]?.id
    if (!targetClanId) return blueprints.value
    return blueprints.value.filter(bp => bp.clanId === targetClanId || (!bp.clanId && targetClanId === clans.value[0]?.id))
  })

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

  // ==========================================
  // 3. SHABLON VA DARAJALAR METODLARI
  // ==========================================
  function ensureBlueprintLevels(bp: TowerBlueprint): TowerLevelConfig[] {
    return TowerBlueprintManager.ensureBlueprintLevels(bp)
  }

  function extractLevelConfigFromBp(bp: TowerBlueprint, level: number = 1): TowerLevelConfig {
    return TowerBlueprintManager.extractLevelConfigFromBp(bp, level)
  }

  function getNextLevelConfig(tower: PlacedTower): TowerLevelConfig | null {
    const bp = blueprintMap.value.get(tower.blueprintId)
    return TowerBlueprintManager.getNextLevelConfig(tower, bp)
  }

  function syncBlueprintChanges(bpId: string): void {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    TowerBlueprintManager.syncBlueprintToPlacedTowers(bp, placedTowers.value)
    syncToProject()
  }

  function addBlueprintLevel(bpId: string): TowerLevelConfig | null {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return null
    const newLvl = TowerBlueprintManager.addBlueprintLevel(bp)
    syncBlueprintChanges(bpId)
    mapStore.pushHistory(`Added Level ${newLvl.level} to ${bp.name}`)
    return newLvl
  }

  function updateBlueprintLevel(bpId: string, levelIndex: number, partial: Partial<TowerLevelConfig>): void {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    TowerBlueprintManager.updateBlueprintLevel(bp, levelIndex, partial)
    syncBlueprintChanges(bpId)
  }

  function removeBlueprintLevel(bpId: string, levelIndex: number): void {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    ensureBlueprintLevels(bp)
    if (levelIndex <= 0 || levelIndex >= bp.levels!.length) return
    bp.levels!.splice(levelIndex, 1)
    bp.levels!.forEach((lvl, idx) => {
      lvl.level = idx + 1
    })
    syncBlueprintChanges(bpId)
    mapStore.pushHistory(`Removed upgrade level from ${bp.name}`)
  }

  function updateBlueprint(bpId: string, updates: Partial<TowerBlueprint>): void {
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return
    Object.assign(bp, updates)
    syncBlueprintChanges(bpId)
  }

  function applyBlueprintToAllPlacedTowers(bpId: string): void {
    syncBlueprintChanges(bpId)
    const bp = blueprints.value.find(b => b.id === bpId)
    mapStore.pushHistory(`Applied ${bp?.name || 'Tower'} properties to all placed towers`)
  }

  function addNewBlueprint(customBp: TowerBlueprint): void {
    ensureDefaultClan()
    if (!customBp.clanId) {
      customBp.clanId = selectedEditorClanId.value || clans.value[0]?.id || 'clan-default'
    }
    blueprints.value.push(customBp)
    selectedBlueprintId.value = customBp.id
    syncBlueprintChanges(customBp.id)
    mapStore.pushHistory(`Created new tower blueprint: ${customBp.name}`)
  }

  function removeBlueprint(bpId: string): void {
    if (blueprints.value.length <= 1) return
    const idx = blueprints.value.findIndex(b => b.id === bpId)
    if (idx !== -1) {
      blueprints.value.splice(idx, 1)
      selectedBlueprintId.value = blueprints.value[0].id
      syncToProject()
    }
  }

  // ==========================================
  // 4. KLANLAR BOSHQARUVI (CLANS)
  // ==========================================
  function ensureDefaultClan(): TowerClan {
    if (clans.value.length === 0) {
      const defaultClan = createDefaultClan()
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

  function updateClan(clanId: string, updates: Partial<TowerClan>): void {
    const clan = clans.value.find(c => c.id === clanId)
    if (!clan) return
    Object.assign(clan, updates)
    syncToProject()
  }

  function deleteClan(clanId: string): void {
    if (clans.value.length <= 1) return
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

    if (selectedEditorClanId.value === clanId) selectedEditorClanId.value = fallbackClanId
    if (selectedClanId.value === clanId) selectedClanId.value = fallbackClanId
    syncToProject()
    mapStore.pushHistory(`Deleted clan: ${deletedName}`)
  }

  function selectEditorClan(clanId: string): void {
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

  function setPlayerClan(clanId: string): void {
    selectedClanId.value = clanId
    isClanSelectModalOpen.value = false
    if (activeBuildTowerId.value) {
      const activeBp = blueprintMap.value.get(activeBuildTowerId.value)
      if (activeBp && activeBp.clanId !== clanId && (activeBp.clanId || clanId !== clans.value[0]?.id)) {
        activeBuildTowerId.value = null
      }
    }
  }

  function openClanSelectModal(): void {
    isClanSelectModalOpen.value = true
  }

  function closeClanSelectModal(): void {
    isClanSelectModalOpen.value = false
  }

  function initGameClanSelection(): void {
    ensureDefaultClan()
    if (clans.value.length <= 1) {
      selectedClanId.value = clans.value[0]?.id || 'clan-default'
      isClanSelectModalOpen.value = false
    } else {
      isClanSelectModalOpen.value = true
    }
  }

  // ==========================================
  // 5. QURILISH VA MINORALARNI O'RNATISH (BUILDING)
  // ==========================================
  function selectBuildTower(blueprintId: string | null): void {
    activeBuildTowerId.value = blueprintId
    pendingBuildCell.value = null
    if (blueprintId) {
      selectedPlacedTowerId.value = null
      toolStore.setTool('select')
    }
  }

  function setPendingBuildCell(cell: GridCoord | null): void {
    pendingBuildCell.value = cell
  }

  function cancelBuild(): void {
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

  function selectPlacedTower(id: string | null): void {
    selectedPlacedTowerId.value = id
  }

  function placeTowerAt(col: number, row: number, blueprintId?: string): PlacedTower | null {
    const bpId = blueprintId || activeBuildTowerId.value
    const bp = blueprints.value.find(b => b.id === bpId)
    if (!bp) return null

    // 1. Katakda allaqachon minora borligini tekshirish
    const existing = placedTowers.value.find(t => t.col === col && t.row === row)
    if (existing) return null

    // 2. Qurish ruxsat etilgan zonani tekshirish
    if (!mapStore.isCellBuildable(col, row) || routeStore.isCellBlockedForBuilding(col, row)) {
      return null
    }

    // 3. Oltin yetarliligini tekshirish va yechib olish
    if (gameStore.isGameMode) {
      let currentGold = gameStore.gold
      const myPl = multiplayerStore.roomId
        ? multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        : null
      if (myPl) currentGold = myPl.gold ?? 0

      if (currentGold < bp.cost) return null

      if (myPl) {
        myPl.gold = currentGold - bp.cost
        gameStore.gold = myPl.gold
      } else {
        gameStore.gold -= bp.cost
      }
    }

    ensureBlueprintLevels(bp)
    const lvl1 = bp.levels?.[0] || extractLevelConfigFromBp(bp, 1)
    const screenPos = gridToScreen(col, row, mapStore.project.tileWidth, mapStore.project.tileHeight)

    const myPlayer = multiplayerStore.roomId
      ? multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
      : null

    const newTower: PlacedTower = {
      id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      blueprintId: bp.id,
      name: bp.name,
      col,
      row,
      level: 1,
      damage: lvl1.damage || 20,
      attackSpeed: lvl1.attackSpeed || 1.0,
      range: lvl1.range || 3,
      projectileId: (lvl1 as any).projectileId || bp.projectileId || bp.projectileType || 'arrow',
      projectileType: (lvl1.projectileType as ProjectileType) || bp.projectileType || 'arrow',
      projectileSpeed: lvl1.projectileSpeed || bp.projectileSpeed || 15.0,
      projectileColor: lvl1.projectileColor !== undefined ? lvl1.projectileColor : (bp.projectileColor || 0xd97706),
      isSplash: Boolean(lvl1.isSplash !== undefined ? lvl1.isSplash : bp.isSplash),
      splashRadius: lvl1.splashRadius || 1.5,
      splashType: lvl1.splashType || 'falloff',
      cooldownTimer: 0,
      totalDamageDealt: 0,
      killsCount: 0,
      builderId: myPlayer?.id || 'local',
      builderName: myPlayer?.name || 'Player',
      builderColor: myPlayer?.color || '#38bdf8',
      targetStrategy: bp.targetStrategy || 'first',
      effects: lvl1.effects ? [...lvl1.effects] : (bp.effects ? [...bp.effects] : []),
      traits: lvl1.traits ? [...lvl1.traits] : (bp.traits ? [...bp.traits] : []),
    }

    placedTowers.value.push(newTower)
    selectedPlacedTowerId.value = newTower.id
    syncToProject()
    mapStore.pushHistory(`Placed ${bp.name} at (${col}, ${row})`)

    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerBuild(newTower)
    }

    return newTower
  }

  function removePlacedTower(id: string): void {
    const idx = placedTowers.value.findIndex(t => t.id === id)
    if (idx === -1) return
    const tower = placedTowers.value[idx]
    placedTowers.value.splice(idx, 1)
    if (selectedPlacedTowerId.value === id) {
      selectedPlacedTowerId.value = null
    }
    syncToProject()
    mapStore.pushHistory(`Removed ${tower.name} at (${tower.col}, ${tower.row})`)
    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerSell(id)
    }
  }

  function sellPlacedTower(id: string): void {
    const tower = placedTowers.value.find(t => t.id === id)
    if (!tower) return
    const bp = blueprintMap.value.get(tower.blueprintId)
    const baseCost = bp ? bp.cost : 100
    const refund = Math.round(baseCost * 0.7 * (tower.level || 1))

    if (gameStore.isGameMode) {
      const myPl = multiplayerStore.roomId
        ? multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        : null
      if (myPl) {
        myPl.gold = (myPl.gold ?? 0) + refund
        gameStore.gold = myPl.gold
      } else {
        gameStore.gold += refund
      }
    }

    removePlacedTower(id)
  }

  function upgradePlacedTower(id: string): boolean {
    const tower = placedTowers.value.find(t => t.id === id)
    if (!tower) return false
    const bp = blueprintMap.value.get(tower.blueprintId)
    if (!bp) return false

    ensureBlueprintLevels(bp)
    const currentLvl = tower.level || 1
    const nextLvlIndex = currentLvl
    if (!bp.levels || nextLvlIndex >= bp.levels.length) return false

    const nextLvlCfg = bp.levels[nextLvlIndex]
    const upgradeCost = nextLvlCfg.cost

    if (gameStore.isGameMode) {
      let currentGold = gameStore.gold
      const myPl = multiplayerStore.roomId
        ? multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
        : null
      if (myPl) currentGold = myPl.gold ?? 0

      if (currentGold < upgradeCost) return false

      if (myPl) {
        myPl.gold = currentGold - upgradeCost
        gameStore.gold = myPl.gold
      } else {
        gameStore.gold -= upgradeCost
      }
    }

    tower.level = nextLvlCfg.level
    tower.damage = nextLvlCfg.damage
    tower.attackSpeed = nextLvlCfg.attackSpeed
    tower.range = nextLvlCfg.range
    tower.isSplash = !!nextLvlCfg.isSplash
    tower.splashRadius = nextLvlCfg.splashRadius || 1.5
    tower.splashType = nextLvlCfg.splashType || 'falloff'
    tower.projectileType = (nextLvlCfg.projectileType as ProjectileType) || 'arrow'
    tower.projectileSpeed = nextLvlCfg.projectileSpeed || 15.0
    tower.projectileColor = nextLvlCfg.projectileColor !== undefined ? nextLvlCfg.projectileColor : 0xd97706
    tower.traits = nextLvlCfg.traits ? [...nextLvlCfg.traits] : (bp.traits ? [...bp.traits] : [])
    tower.effects = nextLvlCfg.effects ? [...nextLvlCfg.effects] : (bp.effects ? [...bp.effects] : [])

    syncToProject()
    mapStore.pushHistory(`Upgraded ${tower.name} to Level ${tower.level}`)

    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerUpgrade(tower.id, tower.level)
    }

    return true
  }

  function setTowerTargetStrategy(id: string, strategy: TargetStrategy): void {
    const tower = placedTowers.value.find(t => t.id === id)
    if (!tower) return
    tower.targetStrategy = strategy
    syncToProject()
  }

  function clearAllTowers(): void {
    placedTowers.value = []
    selectedPlacedTowerId.value = null
    activeBuildTowerId.value = null
    pendingBuildCell.value = null
    clearCombatEffects()
    syncToProject()
  }

  function clearCombatEffects(): void {
    projectiles.value = []
    damageFloaters.value = []
    explosionRings.value = []
  }

  // ==========================================
  // 6. XARITA LOYIHASI BILAN SINXRONLASH
  // ==========================================
  const editorTowersSnapshot = ref<PlacedTower[]>([])

  function saveEditorTowersSnapshot(): void {
    editorTowersSnapshot.value = JSON.parse(JSON.stringify(placedTowers.value))
  }

  function restoreEditorTowersSnapshot(): void {
    placedTowers.value = JSON.parse(JSON.stringify(editorTowersSnapshot.value))
    selectedPlacedTowerId.value = null
    activeBuildTowerId.value = null
    pendingBuildCell.value = null
    clearCombatEffects()
  }

  function resetForNewProject(): void {
    blueprints.value = []
    clans.value = []
    selectedClanId.value = ''
    selectedEditorClanId.value = ''
    placedTowers.value = []
    activeBuildTowerId.value = null
    pendingBuildCell.value = null
    selectedPlacedTowerId.value = null
    selectedBlueprintId.value = ''
    editorTowersSnapshot.value = []
    clearCombatEffects()
  }

  function syncToProject(): void {
    if (!mapStore.project) return
    mapStore.project.towerBlueprints = JSON.parse(JSON.stringify(blueprints.value))
    mapStore.project.clans = JSON.parse(JSON.stringify(clans.value))
    mapStore.project.placedTowers = JSON.parse(JSON.stringify(placedTowers.value))
  }

  function restoreFromProject(): void {
    if (!mapStore.project) return
    const projClans = mapStore.project.clans || (mapStore.project as any).towerClans
    if (projClans && Array.isArray(projClans) && projClans.length > 0) {
      clans.value = JSON.parse(JSON.stringify(projClans))
      selectedEditorClanId.value = clans.value[0]?.id || ''
      selectedClanId.value = clans.value[0]?.id || ''
    } else {
      ensureDefaultClan()
    }

    if (mapStore.project.towerBlueprints && Array.isArray(mapStore.project.towerBlueprints)) {
      blueprints.value = mapStore.project.towerBlueprints.map(bp => TowerBlueprintManager.normalizeBlueprint(bp))
    } else {
      blueprints.value = []
    }
    ensureDefaultClan()

    // Sync all placed towers on the map with their up-to-date normalized blueprint levels
    for (const bp of blueprints.value) {
      TowerBlueprintManager.syncBlueprintToPlacedTowers(bp, placedTowers.value)
    }
  }

  // ==========================================
  // 7. JANG SIMULYATSIYASI SIKLI (COMBAT TICK)
  // ==========================================
  /**
   * Jang siklini CombatEngine orqali ishga tushirish.
   */
  function updateCombatTick(deltaSec: number): void {
    const isPaused = !characterStore.isEnabled || !characterStore.isPlaying
    const activeUnits = characterStore.units.filter(
      u => u.lifecycle.isSpawned && !u.lifecycle.hasReachedEnd && !u.lifecycle.isDead
    )

    CombatEngine.updateCombatTick({
      placedTowers: placedTowers.value,
      blueprintsMap: blueprintMap.value,
      activeUnits,
      projectiles: projectiles.value,
      damageFloaters: damageFloaters.value,
      explosionRings: explosionRings.value,
      tileWidth: mapStore.project.tileWidth,
      tileHeight: mapStore.project.tileHeight,
      deltaSec,
      isPaused,
      onKill: (tower, unit) => {
        gameStore.totalKills++

        // To'lqin sozlamasidan personaj o'limi uchun mukofot oltinini (unitBonus / goldReward) berish
        const waveCfg = waveStore.currentWaveConfig
        const unitBounty = waveCfg ? (waveCfg.unitBonus ?? waveCfg.goldReward ?? 1) : 1

        if (unitBounty > 0) {
          if (multiplayerStore.roomId) {
            const builderId = tower.builderId || multiplayerStore.myPlayerId
            const builderPlayer = multiplayerStore.players.find(p => p.id === builderId)
            if (builderPlayer) {
              builderPlayer.gold = (builderPlayer.gold || 0) + unitBounty
              builderPlayer.totalGoldEarned = (builderPlayer.totalGoldEarned || 0) + unitBounty
              builderPlayer.killsCount = (builderPlayer.killsCount || 0) + 1
              if (builderId === multiplayerStore.myPlayerId) {
                gameStore.gold = builderPlayer.gold || 0
                gameStore.totalGoldEarned = builderPlayer.totalGoldEarned || 0
              }
            } else {
              gameStore.gold += unitBounty
              gameStore.totalGoldEarned += unitBounty
            }
          } else {
            gameStore.gold += unitBounty
            gameStore.totalGoldEarned += unitBounty
          }

          // O'lgan personaj tepasida oltin matnini chiqarish (+1g, +2g)
          const screenPos = gridToScreen(
            unit.movement.currentCol,
            unit.movement.currentRow,
            mapStore.project.tileWidth || 128,
            mapStore.project.tileHeight || 64
          )
          damageFloaters.value.push({
            id: `gold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: `+${unitBounty}g`,
            x: screenPos.x + unit.identity.sideOffset + (Math.random() * 12 - 6),
            y: screenPos.y - mapStore.project.tileHeight * 1.2,
            color: 0xfacc15,
            alpha: 1.0,
            lifeTimer: 0,
          })
        }
      },
    })
  }

  /**
   * Ko'p o'yinchili mijoz uchun jang vizual effektlari interpolyatsiyasi.
   */
  function updateClientCombatInterpolation(deltaSec: number): void {
    CombatEngine.updateClientCombatInterpolation(
      damageFloaters.value,
      explosionRings.value,
      deltaSec
    )
  }

  return {
    blueprints,
    clans,
    selectedClanId,
    selectedEditorClanId,
    isClanSelectModalOpen,
    isCreateTowerModalOpen,
    placedTowers,
    activeBuildTowerId,
    pendingBuildCell,
    selectedPlacedTowerId,
    selectedBlueprintId,
    projectiles,
    damageFloaters,
    explosionRings,
    blueprintMap,
    selectedPlacedTower,
    selectedClan,
    selectedEditorClan,
    playerClanBlueprints,
    editorClanBlueprints,
    selectedBlueprint,
    activeBlueprint,
    extractLevelConfigFromBp,
    ensureBlueprintLevels,
    getNextLevelConfig,
    syncBlueprintChanges,
    addBlueprintLevel,
    updateBlueprintLevel,
    removeBlueprintLevel,
    updateBlueprint,
    applyBlueprintToAllPlacedTowers,
    ensureDefaultClan,
    createClan,
    updateClan,
    deleteClan,
    selectEditorClan,
    setPlayerClan,
    openClanSelectModal,
    closeClanSelectModal,
    initGameClanSelection,
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
