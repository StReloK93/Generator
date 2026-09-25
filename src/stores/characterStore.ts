import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { UnitVariantType, WaveConfig, TowerTraitType, RouteInfo, Route } from '../types/map'
import { 
  CharacterUnit, 
  CharacterAction, 
  CharacterModel, 
  UnitStatusEffect, 
  UnitIdentity, 
  UnitMovement, 
  UnitCombat, 
  UnitAnimation, 
  UnitLifecycle 
} from '../types/unit'
import { useMapStore } from './mapStore'
import { useTowerStore } from './towerStore'
import { useMultiplayerStore } from './multiplayerStore'
import { useRouteStore } from './routeStore'
import { useWaveStore } from './waveStore'
import { useGameStore } from './gameStore'
import { networkSyncBuffer } from '../services/networkSync'
import { gridToScreen } from '../utils/isometric'
import characterManifest from '../assets/generated/characterManifest.json'
import { CrowdSimulation, GameStateMachine } from '../domain/simulation'

export type { 
  CharacterUnit, 
  CharacterAction, 
  CharacterModel, 
  UnitStatusEffect,
  UnitIdentity,
  UnitMovement,
  UnitCombat,
  UnitAnimation,
  UnitLifecycle,
  WaveConfig, 
  RouteInfo, 
  Route 
}

/**
 * Computes exact effective immunities from wave configuration.
 * When immunities array is explicitly provided (even if empty []), it is treated as Single Source of Truth.
 * Fallback to unitVariant is only applied when immunities field is undefined (legacy maps).
 */
export function computeEffectiveImmunities(waveCfg?: WaveConfig | null): TowerTraitType[] {
  if (!waveCfg) return []
  if (Array.isArray(waveCfg.immunities)) {
    return [...waveCfg.immunities]
  }
  const varType = String(waveCfg.unitVariant || '').toLowerCase()
  if (['fire', 'frost', 'poison', 'blood', 'electric', 'void'].includes(varType)) {
    return [varType as TowerTraitType]
  }
  return []
}

/**
 * useCharacterStore — Pinia Store owning active units and orchestrating unit simulation.
 * 
 * SOLID Principles:
 * 1. Single Responsibility: Manages active units list, spawning, and simulation loop.
 * 2. Pure Domain Calculations: All coordinate/angle/DoT math is in CrowdSimulation.
 * 3. Separation of Concerns: Game economy -> gameStore, routes -> routeStore, waves -> waveStore.
 */
export const useCharacterStore = defineStore('characterStore', () => {
  const mapStore = useMapStore()
  const towerStore = useTowerStore()
  const multiplayerStore = useMultiplayerStore()
  const routeStore = useRouteStore()
  const waveStore = useWaveStore()
  const gameStore = useGameStore()

  // ==========================================
  // 1. REACTIVE STATE
  // ==========================================
  const isEnabled = ref(true)
  const isPlaying = ref(false)
  const units = ref<CharacterUnit[]>([])
  const routeWaveProgress = ref<Record<number, number>>({})
  const statusMessage = ref('Waiting at spawn point')

  // ==========================================
  // 2. COMPUTEDS
  // ==========================================
  /**
   * Count of active, living enemies currently marching on the field.
   */
  const aliveEnemiesCount = computed(() => {
    if (multiplayerStore.roomId) {
      return networkSyncBuffer.renderUnitsList.filter(
        u => u.isSpawned && !u.isDead && !u.hasReachedEnd
      ).length
    }
    return units.value.filter(
      u => u.lifecycle.isSpawned && !u.lifecycle.isDead && !u.lifecycle.hasReachedEnd
    ).length
  })

  // ==========================================
  // 3. HELPERS
  // ==========================================
  /**
   * Determines action frame count from character manifest metadata.
   */
  function getModelActionFrameCount(model: string = 'male', action: string = 'Run'): number {
    const meta = (characterManifest as any)?.[String(model || 'male').toLowerCase()]
    if (!meta || !meta.actions) {
      return model === 'warrior' ? 24 : 10
    }
    const actions = Object.values(meta.actions) as any[]
    const act = actions.find((a: any) => a.id.toLowerCase() === action.toLowerCase())
      || actions.find((a: any) => action.toLowerCase() === 'run' && /run|walk|sprint|move/i.test(a.id))
      || actions.find((a: any) => action.toLowerCase() === 'idle' && /idle|stand|wait/i.test(a.id))
      || actions.find((a: any) => action.toLowerCase() === 'pickup' && /die|death|dead|pickup|hit|collapse/i.test(a.id))
      || actions[0]
    return act?.frameCount || (model === 'warrior' ? 24 : 10)
  }

  // ==========================================
  // 4. UNIT CREATION & SPAWNING
  // ==========================================
  /**
   * Initializes units for the current wave using the composable structure.
   */
  function initializeUnits(): void {
    if (routeStore.routes.length === 0) {
      units.value = []
      return
    }

    const list: CharacterUnit[] = []
    const waveCfg = waveStore.currentWaveConfig
    const count = Math.max(1, Math.min(100, waveCfg ? waveCfg.unitCount : 10))
    const isPairFormation = gameStore.formation === 'pairs'
    const model: CharacterModel = (waveCfg?.characterModel as CharacterModel) || 'male'
    const initialMaxFrames = getModelActionFrameCount(model, 'Run')

    const activeRoutesToSpawn = (gameStore.spawnMode === 'all_routes' && routeStore.routes.length > 1)
      ? routeStore.routes.map((_, idx) => idx)
      : [routeStore.selectedRouteIndex !== null && routeStore.selectedRouteIndex >= 0 ? routeStore.selectedRouteIndex : 0]

    const progressMap: Record<number, number> = {}
    const baseHp = waveCfg ? waveCfg.unitHp : 100

    const effectiveImmunities = computeEffectiveImmunities(waveCfg)

    for (const rIdx of activeRoutesToSpawn) {
      progressMap[rIdx] = 0
      const route = routeStore.getRouteForIndex(rIdx)
      const startPt = route[0] || { col: 2, row: 2 }
      const routeItem = routeStore.routes[rIdx]
      const routeId = routeItem ? routeItem.id : `route-${rIdx}`

      for (let i = 0; i < count; i++) {
        const pairIndex = isPairFormation ? Math.floor(i / 2) : i
        const sideOffset = isPairFormation ? (i % 2 === 0 ? -1 : 1) : 0

        list.push({
          id: `unit-r${rIdx}-${i}-${Date.now()}`,
          identity: {
            routeId,
            routeIndex: rIdx,
            unitIndex: i,
            pairIndex,
            sideOffset,
            model,
            variant: waveCfg?.unitVariant || 'normal',
            variantTint: waveCfg?.variantTint,
            offsetY: waveCfg?.offsetY || 0,
            scale: waveCfg?.unitScale || 1.0,
          },
          movement: {
            currentCol: startPt.col,
            currentRow: startPt.row,
            direction: 2,
            pathIndex: 0,
            pathInterpolation: 0,
            distanceTraveled: 0,
          },
          combat: {
            maxHp: baseHp,
            currentHp: baseHp,
            immunities: [...effectiveImmunities],
            statusEffects: [],
            consecutiveHits: {},
          },
          animation: {
            action: 'Idle',
            frameIndex: (i * 2) % initialMaxFrames,
            animTimer: 0,
            animSpeed: waveCfg?.animSpeed || 1.0,
          },
          lifecycle: {
            isSpawned: pairIndex === 0,
            hasReachedEnd: false,
            isDead: false,
            deathFade: 1.0,
            celebrationTimer: 0,
          },
        })
      }
    }

    routeWaveProgress.value = progressMap
    units.value = list
  }

  /**
   * Synchronizes currently active/spawned units on the battlefield in real-time with the latest wave settings.
   */
  function syncLiveUnitsWithWaveConfig(): void {
    const waveCfg = waveStore.currentWaveConfig
    if (!waveCfg) return

    const effectiveImmunities = computeEffectiveImmunities(waveCfg)

    for (const u of units.value) {
      if (!u.lifecycle.isDead) {
        // 1. Immediately update immunities
        u.combat.immunities = [...effectiveImmunities]

        // Clear active status effects if unit is newly immune to them
        if (u.combat.statusEffects && u.combat.statusEffects.length > 0) {
          u.combat.statusEffects = u.combat.statusEffects.filter(eff => {
            if (eff.type === 'fire' && effectiveImmunities.includes('fire')) return false
            if (eff.type === 'frost' && effectiveImmunities.includes('frost')) return false
            if (eff.type === 'poison' && effectiveImmunities.includes('poison')) return false
            if (eff.type === 'blood' && effectiveImmunities.includes('blood')) return false
            if (eff.type === 'electric' && effectiveImmunities.includes('electric')) return false
            if (eff.type === 'void' && effectiveImmunities.includes('void')) return false
            return true
          })
        }

        // 2. Update HP proportionally with new maxHp
        if (waveCfg.unitHp && waveCfg.unitHp > 0 && u.combat.maxHp !== waveCfg.unitHp) {
          const hpRatio = u.combat.maxHp > 0 ? u.combat.currentHp / u.combat.maxHp : 1.0
          u.combat.maxHp = waveCfg.unitHp
          u.combat.currentHp = Math.max(1, Math.min(u.combat.maxHp, Math.round(u.combat.maxHp * hpRatio)))
        }

        // 3. Update visual identity & animation parameters
        if (waveCfg.unitVariant) {
          u.identity.variant = waveCfg.unitVariant
        }
        if (waveCfg.variantTint !== undefined) {
          u.identity.variantTint = waveCfg.variantTint
        }
        if (waveCfg.unitScale !== undefined) {
          u.identity.scale = waveCfg.unitScale
        }
        if (waveCfg.offsetY !== undefined) {
          u.identity.offsetY = waveCfg.offsetY
        }
        if (waveCfg.animSpeed !== undefined) {
          u.animation.animSpeed = waveCfg.animSpeed
        }
      }
    }
  }

  // Real-time synchronization watcher for sandbox test tools and live configuration changes
  watch(
    () => [
      waveStore.currentWaveConfig?.immunities,
      waveStore.currentWaveConfig?.unitHp,
      waveStore.currentWaveConfig?.unitSpeed,
      waveStore.currentWaveConfig?.unitScale,
      waveStore.currentWaveConfig?.unitVariant,
      waveStore.currentWaveConfig?.variantTint,
      waveStore.currentWaveConfig?.animSpeed,
      waveStore.currentWaveConfig?.offsetY,
    ],
    () => {
      syncLiveUnitsWithWaveConfig()
    },
    { deep: true }
  )

  /**
   * Spawns units for the selected route.
   */
  function spawnAtRoute(routeIdx?: number | null): void {
    if (routeIdx !== undefined && routeIdx !== null) {
      routeStore.selectedRouteIndex = routeIdx
    }
    initializeUnits()
    isPlaying.value = false
    const totalCount = units.value.length
    const hpStr = waveStore.currentWaveConfig ? `(HP: ${waveStore.currentWaveConfig.unitHp})` : ''
    statusMessage.value = gameStore.spawnMode === 'all_routes' && routeStore.routes.length > 1
      ? `All ${routeStore.routes.length} routes ready (${totalCount} units ${hpStr})`
      : `${routeStore.selectedRoute?.name || 'Route'} ready (${totalCount} units ${hpStr})`
  }

  // ==========================================
  // 5. SIMULATION CONTROLS
  // ==========================================
  /**
   * Starts unit tour / marching.
   */
  function startTour(): void {
    if (units.value.length === 0) {
      initializeUnits()
    }
    isPlaying.value = true
    for (const u of units.value) {
      if (u.lifecycle.isSpawned && !u.lifecycle.hasReachedEnd && !u.lifecycle.isDead) {
        u.animation.action = 'Run'
      }
    }
    const waveName = waveStore.currentWaveConfig ? waveStore.currentWaveConfig.name : 'Units'
    statusMessage.value = `${waveName} — ${units.value.length} units marching to target...`
  }

  /**
   * Pauses unit movement.
   */
  function pauseTour(): void {
    isPlaying.value = false
    for (const u of units.value) {
      if (!u.lifecycle.hasReachedEnd && !u.lifecycle.isDead) {
        u.animation.action = 'Idle'
      }
    }
    statusMessage.value = 'Movement paused'
  }

  /**
   * Toggles play/pause state.
   */
  function togglePlay(): void {
    if (isPlaying.value) {
      pauseTour()
    } else {
      startTour()
    }
  }

  /**
   * Resets unit tour to spawn points.
   */
  function resetTour(): void {
    pauseTour()
    towerStore.clearCombatEffects()
    routeWaveProgress.value = {}
    units.value = []
    initializeUnits()
    statusMessage.value = 'Reset to spawn point and ready'
  }

  // ==========================================
  // 6. MAIN SIMULATION UPDATE LOOP
  // ==========================================
  /**
   * Primary frame update loop for units.
   */
  function updateTick(deltaSec: number): void {
    if (!isEnabled.value) return

    // Phase 1: Build Prep phase
    if (gameStore.isGameMode && gameStore.gameState === 'build_prep') {
      if (multiplayerStore.roomId && multiplayerStore.isHost) {
        if (gameStore.prepCountdown > 0) {
          gameStore.prepCountdown -= deltaSec
          if (gameStore.prepCountdown <= 0) {
            gameStore.prepCountdown = 0
            gameStore.startNextWaveInGame()
            startTour()
          }
        }
      }

      // Idle animation for preview units at spawn point
      for (const unit of units.value) {
        if (unit.lifecycle.isSpawned && !unit.lifecycle.isDead && !unit.lifecycle.hasReachedEnd) {
          unit.animation.action = 'Idle'
          unit.animation.animTimer += deltaSec
          if (unit.animation.animTimer >= 0.15) {
            unit.animation.animTimer = 0
            const maxIdle = getModelActionFrameCount(unit.identity.model, 'Idle')
            unit.animation.frameIndex = (unit.animation.frameIndex + 1) % maxIdle
          }
        }
      }
      return
    }

    // Phase 2: Start marching when wave begins
    if (gameStore.isGameMode && gameStore.gameState === 'wave_running' && !isPlaying.value) {
      startTour()
    }

    // Phase 3: Paused idle animation
    if (!isPlaying.value) {
      for (const unit of units.value) {
        if (!unit.lifecycle.isDead && !unit.lifecycle.hasReachedEnd) {
          unit.animation.action = 'Idle'
          unit.animation.animTimer += deltaSec
          if (unit.animation.animTimer >= 0.15) {
            unit.animation.animTimer = 0
            const maxIdle = getModelActionFrameCount(unit.identity.model, 'Idle')
            unit.animation.frameIndex = (unit.animation.frameIndex + 1) % maxIdle
          }
        }
      }
      return
    }

    // Phase 4: Active movement & path calculations
    const tileWidth = mapStore.project.tileWidth
    const tileHeight = mapStore.project.tileHeight
    const waveCfg = waveStore.currentWaveConfig
    const unitBaseSpeed = waveCfg ? waveCfg.unitSpeed : 2.5
    const stepDistance = unitBaseSpeed * deltaSec
    const spacingInTiles = gameStore.pairDistance

    for (const rIdxStr in routeWaveProgress.value) {
      const rIdx = Number(rIdxStr)
      routeWaveProgress.value[rIdx] += stepDistance
    }

    let allCompletedOrDead = true

    for (const unit of units.value) {
      const route = routeStore.getRouteForIndex(unit.identity.routeIndex ?? 0)
      if (!route || route.length <= 1) continue

      // Dead unit animation
      if (unit.lifecycle.isDead) {
        unit.animation.action = 'Pickup'
        unit.animation.animTimer += deltaSec
        if (unit.animation.animTimer >= 0.08) {
          unit.animation.animTimer = 0
          const maxDead = getModelActionFrameCount(unit.identity.model, 'Pickup')
          if (unit.animation.frameIndex < maxDead) {
            unit.animation.frameIndex++
          }
        }
        if (unit.lifecycle.deathFade > 0) {
          unit.lifecycle.deathFade = Math.max(0, unit.lifecycle.deathFade - deltaSec * 1.2)
        }
        continue
      }

      // DoT and status effects processing
      let maxSlowPercent = 0
      if (unit.combat.statusEffects && unit.combat.statusEffects.length > 0) {
        const effectRes = CrowdSimulation.processStatusEffects(unit, deltaSec)
        maxSlowPercent = effectRes.maxSlowPercent

        if (effectRes.dotDamage > 0) {
          const uScreen = gridToScreen(unit.movement.currentCol, unit.movement.currentRow, tileWidth, tileHeight)
          towerStore.damageFloaters.push({
            id: `dot-${Date.now()}-${Math.random()}`,
            text: effectRes.dotText || `-${effectRes.dotDamage}`,
            x: uScreen.x + (Math.random() * 16 - 8),
            y: uScreen.y - tileHeight * 1.05,
            color: effectRes.dotColor || 0xf97316,
            alpha: 1.0,
            lifeTimer: 0,
          })
        }

        if (effectRes.unitDied) {
          gameStore.totalKills++

          const unitBounty = waveCfg ? (waveCfg.unitBonus ?? waveCfg.goldReward ?? 1) : 1
          if (unitBounty > 0) {
            if (multiplayerStore.roomId) {
              const myPl = multiplayerStore.players.find(p => p.id === multiplayerStore.myPlayerId)
              if (myPl) {
                myPl.gold = (myPl.gold || 0) + unitBounty
                myPl.totalGoldEarned = (myPl.totalGoldEarned || 0) + unitBounty
                myPl.killsCount = (myPl.killsCount || 0) + 1
                gameStore.gold = myPl.gold
                gameStore.totalGoldEarned = myPl.totalGoldEarned
              }
            } else {
              gameStore.gold += unitBounty
              gameStore.totalGoldEarned += unitBounty
            }

            const uScreen = gridToScreen(unit.movement.currentCol, unit.movement.currentRow, tileWidth, tileHeight)
            towerStore.damageFloaters.push({
              id: `dot-gold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text: `+${unitBounty}g`,
              x: uScreen.x,
              y: uScreen.y - tileHeight * 1.2,
              color: 0xfacc15,
              alpha: 1.0,
              lifeTimer: 0,
            })
          }
        }
      }

      if (unit.lifecycle.isDead) continue

      // Spawning interval distance check
      const isStunned = maxSlowPercent >= 99
      const speedMultiplier = isStunned ? 0 : Math.max(0.1, 1.0 - (Math.min(90, maxSlowPercent) / 100))
      const waveDist = routeWaveProgress.value[unit.identity.routeIndex ?? 0] ?? 0
      const targetSpawnDist = unit.identity.pairIndex * spacingInTiles

      if (waveDist < targetSpawnDist && (unit.movement.distanceTraveled === undefined || unit.movement.distanceTraveled === 0)) {
        unit.lifecycle.isSpawned = false
        unit.animation.action = 'Idle'
        allCompletedOrDead = false
        continue
      }

      unit.lifecycle.isSpawned = true

      // Advance unit along route
      const advRes = CrowdSimulation.advanceUnitPosition(
        unit,
        route,
        deltaSec,
        unitBaseSpeed,
        speedMultiplier,
        gameStore.formation,
        tileWidth,
        tileHeight
      )

      if (advRes.hasReachedEnd) {
        if (advRes.isJustReachedEnd && gameStore.isGameMode && gameStore.gameState === 'wave_running') {
          const lifeRes = GameStateMachine.deductLife(gameStore.playerLives)
          gameStore.playerLives = lifeRes.remainingLives
          if (lifeRes.isGameOver) {
            gameStore.gameState = 'game_over'
            isPlaying.value = false
            statusMessage.value = 'Defeat! All lives lost.'
            towerStore.clearCombatEffects()
          }
        }
        continue
      }

      allCompletedOrDead = false

      // Update run animation
      const maxRun = getModelActionFrameCount(unit.identity.model, 'Run')
      CrowdSimulation.updateUnitAnimation(unit, deltaSec, maxRun, unitBaseSpeed)
    }

    // Phase 5: Wave completion evaluation
    if (allCompletedOrDead && units.value.length > 0) {
      const completedWave = waveStore.currentWaveConfig
      const reward = completedWave ? (completedWave.endWaveBonus ?? completedWave.goldReward ?? 50) : 50

      if (gameStore.isGameMode) {
        if (gameStore.playerLives > 0) {
          if (multiplayerStore.roomId) {
            for (const p of multiplayerStore.players) {
              p.gold = (p.gold || 0) + reward
              p.totalGoldEarned = (p.totalGoldEarned || p.gold || 0) + reward
              if (p.id === multiplayerStore.myPlayerId) {
                gameStore.gold = p.gold
                gameStore.totalGoldEarned = p.totalGoldEarned
              }
            }
          } else {
            gameStore.gold += reward
            gameStore.totalGoldEarned += reward
          }

          const completion = GameStateMachine.evaluateWaveCompletion(
            waveStore.currentWaveIndex,
            waveStore.waveConfigs.length
          )

          if (completion.isVictory) {
            gameStore.gameState = 'victory'
            isPlaying.value = false
            statusMessage.value = 'Victory! All waves successfully cleared!'
            towerStore.clearCombatEffects()
          } else {
            waveStore.currentWaveIndex++
            gameStore.gameState = 'build_prep'
            gameStore.prepCountdown = gameStore.wavePrepDuration
            isPlaying.value = false
            towerStore.clearCombatEffects()
            spawnAtRoute(0)
            if (multiplayerStore.roomId) {
              statusMessage.value = `${completedWave?.name || 'Wave'} cleared! +${reward} Gold. ${gameStore.wavePrepDuration}s build prep...`
            } else {
              statusMessage.value = `${completedWave?.name || 'Wave'} cleared! +${reward} Gold. Click Start to begin next wave.`
            }
          }
        }
      } else {
        gameStore.gold += reward
        pauseTour()
        towerStore.clearCombatEffects()
        statusMessage.value = `${completedWave?.name || 'Wave'} test completed!`
      }
    }
  }

  /**
   * Client-side network interpolation for multiplayer.
   */
  function updateClientInterpolation(deltaSec: number): void {
    networkSyncBuffer.interpolate(deltaSec)
  }

  /**
   * Developer tool: clear all creeps.
   */
  function devClearAllCreeps(): void {
    for (const u of units.value) {
      u.lifecycle.isDead = true
      u.animation.action = 'Pickup'
      u.lifecycle.deathFade = 0.2
    }
    units.value = []
    towerStore.clearCombatEffects()
  }

  /**
   * Reset unit state for a new project.
   */
  function resetForNewProject(): void {
    units.value = []
    statusMessage.value = 'Waiting at spawn point'
  }

  return {
    units,
    isEnabled,
    isPlaying,
    statusMessage,
    aliveEnemiesCount,
    initializeUnits,
    syncLiveUnitsWithWaveConfig,
    spawnAtRoute,
    startTour,
    pauseTour,
    togglePlay,
    resetTour,
    updateTick,
    updateClientInterpolation,
    devClearAllCreeps,
    resetForNewProject,
  }
})
