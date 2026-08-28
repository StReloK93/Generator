import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GridCoord, Point2D } from '../types/map'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useCharacterStore } from './characterStore'
import { gridToScreen } from '../utils/isometric'

export type ProjectileType = 'cannonball' | 'arrow' | 'magic_bolt' | 'fireball'
export type SplashType = 'constant' | 'falloff'

export interface TowerBlueprint {
  id: string
  name: string
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
}

export interface PlacedTower {
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

  const selectedPlacedTower = computed<PlacedTower | null>(() => {
    if (!selectedPlacedTowerId.value) return null
    return placedTowers.value.find(t => t.id === selectedPlacedTowerId.value) || null
  })

  const selectedBlueprint = computed<TowerBlueprint | null>(() => {
    if (blueprints.value.length === 0) return null
    return blueprints.value.find(b => b.id === selectedBlueprintId.value) || blueprints.value[0] || null
  })

  const activeBlueprint = computed<TowerBlueprint | null>(() => {
    if (!activeBuildTowerId.value) return null
    return blueprints.value.find(b => b.id === activeBuildTowerId.value) || null
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
    mapStore.pushHistory(`${bp?.name || 'Minora'} xususiyatlari barcha minoralarga qo'llandi`)
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

  const isCreateTowerModalOpen = ref(false)

  function addNewBlueprint(customBp: TowerBlueprint) {
    blueprints.value.push(customBp)
    selectedBlueprintId.value = customBp.id
    syncBlueprintChanges(customBp.id)
    mapStore.pushHistory(`Yangi minora blueprint yaratildi: ${customBp.name}`)
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

    // In Game Mode: check gold balance
    if (characterStore.isGameMode) {
      if (characterStore.gold < bp.cost) {
        return null
      }
      characterStore.gold -= bp.cost
    }

    // Check if a tower already exists at this cell
    const existing = placedTowers.value.find(t => t.col === col && t.row === row)
    if (existing) {
      selectedPlacedTowerId.value = existing.id
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
      cooldownTimer: Math.random() * 0.3, // slight initial offset
      totalDamageDealt: 0,
      killsCount: 0,
    }

    placedTowers.value.push(newTower)
    selectedPlacedTowerId.value = newTower.id
    syncToProject()
    if (!characterStore.isGameMode) {
      mapStore.pushHistory(`${bp.name} (${col}, ${row}) katagiga qurildi`)
    }

    return newTower
  }

  /**
   * Sells a placed tower with gold refund (70%)
   */
  function sellPlacedTower(towerId: string) {
    const t = placedTowers.value.find(x => x.id === towerId)
    if (!t) return

    const bp = blueprints.value.find(b => b.id === t.blueprintId)
    const baseCost = bp ? bp.cost : 100
    const refund = Math.round(baseCost * 0.7 * (1 + (t.level - 1) * 0.5))

    characterStore.gold += refund
    removePlacedTower(towerId)
    mapStore.pushHistory(`${t.name} sotildi (+${refund} oltin)`)
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
      mapStore.pushHistory(`${removed.name} olib tashlandi`)
    }
  }

  /**
   * Upgrades a tower (increases stats by +30%)
   */
  function upgradePlacedTower(towerId: string) {
    const tower = placedTowers.value.find(t => t.id === towerId)
    if (!tower) return

    if (characterStore.isGameMode) {
      const bp = blueprints.value.find(b => b.id === tower.blueprintId)
      const baseCost = bp ? bp.cost : 100
      const cost = Math.round(baseCost * 0.6 * tower.level)
      if (characterStore.gold < cost) return
      characterStore.gold -= cost
    }

    tower.level++
    tower.damage = Math.round(tower.damage * 1.35)
    tower.attackSpeed = Math.max(0.15, Number((tower.attackSpeed * 0.9).toFixed(2)))
    tower.range = Number((tower.range + 0.3).toFixed(1))
    if (tower.isSplash) {
      tower.splashRadius = Number((tower.splashRadius + 0.2).toFixed(1))
    }
    syncToProject()
    if (!characterStore.isGameMode) {
      mapStore.pushHistory(`${tower.name} ${tower.level}-darajaga kuchaytirildi`)
    }
  }

  const editorTowersSnapshot = ref<PlacedTower[] | null>(null)

  function saveEditorTowersSnapshot() {
    editorTowersSnapshot.value = placedTowers.value.map(t => ({ ...t }))
  }

  function restoreEditorTowersSnapshot() {
    if (editorTowersSnapshot.value !== null) {
      placedTowers.value = editorTowersSnapshot.value.map(t => ({ ...t }))
      editorTowersSnapshot.value = null
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
    ;(mapStore.project as any).placedTowers = placedTowers.value.map(t => ({ ...t }))
    ;(mapStore.project as any).towerBlueprints = blueprints.value.map(b => ({ ...b }))
  }

  /**
   * Restores placed towers from project state
   */
  function restoreFromProject() {
    const p = mapStore.project as any
    if (p.placedTowers && Array.isArray(p.placedTowers)) {
      const { tileWidth, tileHeight } = mapStore.project
      placedTowers.value = p.placedTowers.map((t: any) => {
        const pt = gridToScreen(t.col, t.row, tileWidth, tileHeight)
        return {
          ...t,
          screenX: pt.x,
          screenY: pt.y,
          cooldownTimer: 0,
        }
      })
    }
    if (p.towerBlueprints && Array.isArray(p.towerBlueprints)) {
      blueprints.value = p.towerBlueprints
    }
  }

  /**
   * Main combat simulation tick:
   * 1. Updates damage floaters and explosion rings even when paused.
   * 2. When playing: updates cooldowns, acquires targets, moves projectiles.
   */
  function updateCombatTick(deltaSec: number) {
    // Always update floaters and explosion rings so they fade out smoothly
    const activeFloaters: DamageFloater[] = []
    for (const df of damageFloaters.value) {
      df.lifeTimer += deltaSec
      df.y -= deltaSec * 35 // Float upwards
      df.alpha = Math.max(0, 1.0 - df.lifeTimer / 0.85)
      if (df.lifeTimer < 0.85) {
        activeFloaters.push(df)
      }
    }
    damageFloaters.value = activeFloaters

    const activeRings: ExplosionRing[] = []
    for (const ring of explosionRings.value) {
      ring.lifeTimer += deltaSec
      const prog = ring.lifeTimer / 0.45
      ring.radius = ring.maxRadius * prog
      ring.alpha = Math.max(0, 1.0 - prog)
      if (ring.lifeTimer < 0.45) {
        activeRings.push(ring)
      }
    }
    explosionRings.value = activeRings

    if (!characterStore.isEnabled || !characterStore.isPlaying) {
      // Clear visual flying projectiles on pause/reset
      if (projectiles.value.length > 0) {
        projectiles.value = []
      }
      return
    }

    const { tileWidth, tileHeight } = mapStore.project
    const activeUnits = characterStore.units.filter((u: any) => u.isSpawned && !u.hasReachedEnd && !u.isDead)

    // 1. Towers Target Acquisition & Shooting
    for (const tower of placedTowers.value) {
      tower.cooldownTimer -= deltaSec

      if (tower.cooldownTimer <= 0) {
        // Find best target within range (closest to finish line / furthest along path)
        let bestTarget: any = null
        let maxPathDistance = -1

        for (const unit of activeUnits) {
          const distInTiles = Math.hypot(unit.currentCol - tower.col, unit.currentRow - tower.row)
          if (distInTiles <= tower.range) {
            const pathProgress = unit.pathIndex + unit.pathInterpolation
            if (pathProgress > maxPathDistance) {
              maxPathDistance = pathProgress
              bestTarget = unit
            }
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

          projectiles.value.push({
            id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        }
      }
    }

    // 2. Advance Flying Projectiles & Handle Hits
    const remainingProjectiles: Projectile[] = []

    for (const proj of projectiles.value) {
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

        remainingProjectiles.push(proj)
      }
    }

    projectiles.value = remainingProjectiles
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

      // Add Explosion Ring VFX
      explosionRings.value.push({
        id: `ring-${Date.now()}-${Math.random()}`,
        x: proj.targetX,
        y: proj.targetY,
        radius: 4,
        maxRadius: splashRadiusPx,
        color: proj.color || 0xf59e0b,
        alpha: 0.9,
        lifeTimer: 0,
      })

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

    unit.currentHp = Math.max(0, unit.currentHp - damage)

    // Damage text floater
    damageFloaters.value.push({
      id: `df-${Date.now()}-${Math.random()}`,
      text: `-${damage}`,
      x: unit.screenX + (Math.random() * 20 - 10),
      y: unit.screenY - mapStore.project.tileHeight * 1.1,
      color: damage >= 70 ? 0xef4444 : 0xfbbf24,
      alpha: 1.0,
      lifeTimer: 0,
    })

    if (sourceTower) {
      sourceTower.totalDamageDealt += damage
    }

    // Unit died!
    if (unit.currentHp <= 0) {
      unit.isDead = true
      unit.action = 'Pickup'
      unit.frameIndex = 0
      unit.animTimer = 0
      unit.deathFade = 1.0
      if (sourceTower) {
        sourceTower.killsCount++
      }

      // In Game Mode: Reward Gold & Score for each unit killed!
      if (characterStore.isGameMode) {
        const waveCfg = characterStore.currentWaveConfig
        const totalWaveReward = waveCfg ? waveCfg.goldReward : 80
        const totalUnits = Math.max(1, waveCfg ? waveCfg.unitCount : 10)
        const killGold = Math.max(5, Math.round(totalWaveReward / totalUnits))

        characterStore.gold += killGold
        characterStore.score += killGold * 10

        // Floating Gold VFX Floater (+15 💰)
        damageFloaters.value.push({
          id: `gold-${Date.now()}-${Math.random()}`,
          text: `+${killGold} 💰`,
          x: unit.screenX,
          y: unit.screenY - mapStore.project.tileHeight * 1.3,
          color: 0xfacc15,
          alpha: 1.0,
          lifeTimer: 0,
        })
      }
    }
  }

  return {
    blueprints,
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
    sellPlacedTower,
    placeTowerAt,
    removePlacedTower,
    upgradePlacedTower,
    clearAllTowers,
    saveEditorTowersSnapshot,
    restoreEditorTowersSnapshot,
    clearCombatEffects,
    syncToProject,
    restoreFromProject,
    updateCombatTick,
  }
})
