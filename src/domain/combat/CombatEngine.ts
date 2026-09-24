import { PlacedTower, TowerBlueprint, Projectile, DamageFloater, ExplosionRing } from '../../stores/towerStore'
import { CharacterUnit } from '../../types/unit'
import { TargetingSystem, DamageCalculator, CombatSimulation, CombatUnitTarget } from './index'
import { getProjectileDefinition } from '../../utils/projectileCatalog'
import { combatEvents } from '../../services/combatEvents'
import { gridToScreen } from '../../utils/isometric'

export interface CombatTickContext {
  placedTowers: PlacedTower[]
  blueprintsMap: Map<string, TowerBlueprint>
  activeUnits: CharacterUnit[]
  projectiles: Projectile[]
  damageFloaters: DamageFloater[]
  explosionRings: ExplosionRing[]
  tileWidth: number
  tileHeight: number
  deltaSec: number
  isPaused: boolean
  onKill?: (tower: PlacedTower, unit: CharacterUnit) => void
}

/**
 * CombatEngine — Tower Defense combat engine, projectile flight, splash, chain lightning, and damage resolution.
 * 
 * SOLID: Single Responsibility Principle (SRP) & Dependency Inversion (DIP).
 */
export class CombatEngine {
  /**
   * Main combat cycle (Combat Tick):
   * 1. Update visual combat floaters and rings.
   * 2. Select target and fire tower attacks.
   * 3. Advance flying projectiles and resolve impacts.
   */
  public static updateCombatTick(ctx: CombatTickContext): void {
    const {
      placedTowers,
      blueprintsMap,
      activeUnits,
      projectiles,
      damageFloaters,
      explosionRings,
      tileWidth,
      tileHeight,
      deltaSec,
      isPaused,
      onKill,
    } = ctx

    // 1. Update visual effects
    damageFloaters.length = CombatSimulation.updateDamageFloaters(damageFloaters, deltaSec)
    explosionRings.length = CombatSimulation.updateExplosionRings(explosionRings, deltaSec)

    if (isPaused) {
      if (projectiles.length > 0) {
        projectiles.length = 0
      }
      return
    }

    // 2. Tower targeting and shooting
    for (let tIdx = 0; tIdx < placedTowers.length; tIdx++) {
      const tower = placedTowers[tIdx]
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

          const bp = blueprintsMap.get(tower.blueprintId)
          const towerScreen = gridToScreen(tower.col, tower.row, tileWidth, tileHeight)
          const muzzleX = towerScreen.x + (bp?.asset?.muzzleOffsetX ?? bp?.muzzleOffsetX ?? 0)
          const muzzleY = towerScreen.y - tileHeight * 1.35 + (bp?.asset?.muzzleOffsetY ?? bp?.muzzleOffsetY ?? 0)

          const targetScreen = gridToScreen(bestTarget.movement.currentCol, bestTarget.movement.currentRow, tileWidth, tileHeight)
          const targetX = targetScreen.x
          const targetY = targetScreen.y - tileHeight * 0.5

          const projId = (tower as any).projectileId || tower.projectileType || 'fireball'
          const projDef = getProjectileDefinition(projId)
          const isInstant = Boolean(projDef.movement.isInstant || projDef.visual.shape === 'instant_strike')

          if (isInstant) {
            combatEvents.emitStrike({
              x: targetX,
              y: targetY,
              startX: muzzleX,
              startY: muzzleY,
              projectileType: projId,
              duration: 0.45,
            })

            const dummyProj: Projectile = {
              id: `instant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              towerId: tower.id,
              startX: muzzleX,
              startY: muzzleY,
              currentX: targetX,
              currentY: targetY,
              targetUnitId: bestTarget.id,
              targetX,
              targetY,
              damage: tower.damage,
              isSplash: tower.isSplash,
              splashRadius: tower.splashRadius,
              splashType: tower.splashType,
              projectileType: projId,
              color: tower.projectileColor || projDef.impact?.sparkColorHex || 0xfbbf24,
              speed: 9999,
              totalDistance: 1,
              traveledDistance: 1,
            }

            this.processImpact(
              dummyProj,
              placedTowers,
              activeUnits,
              damageFloaters,
              explosionRings,
              tileWidth,
              tileHeight,
              onKill
            )
          } else {
            const effStartX = muzzleX
            const effStartY = muzzleY
            const totalDist = Math.hypot(targetX - muzzleX, targetY - muzzleY) || 1
            const projSpeedTiles = projDef.movement.speed || tower.projectileSpeed || 12.0
            const projSpeedPx = projSpeedTiles * (tileWidth * 0.45)
            const formation = projDef.formation.type || 'single'

            this.spawnProjectilesForFormation(
              formation,
              tower,
              bestTarget.id,
              effStartX,
              effStartY,
              targetX,
              targetY,
              projSpeedPx,
              totalDist,
              projectiles
            )
          }
        }
      }
    }

    // 3. Projectile flight and impacts
    let remainingCount = 0
    for (let pIdx = 0; pIdx < projectiles.length; pIdx++) {
      const proj = projectiles[pIdx]
      const targetUnit = activeUnits.find(u => u.id === proj.targetUnitId)
      if (targetUnit) {
        const tScreen = gridToScreen(targetUnit.movement.currentCol, targetUnit.movement.currentRow, tileWidth, tileHeight)
        proj.targetX = tScreen.x
        proj.targetY = tScreen.y - tileHeight * 0.5
      }

      const dx = proj.targetX - proj.currentX
      const dy = proj.targetY - proj.currentY
      const distToTarget = Math.hypot(dx, dy)
      const moveStep = proj.speed * deltaSec

      if (distToTarget <= moveStep || distToTarget < 12) {
        this.processImpact(proj, placedTowers, activeUnits, damageFloaters, explosionRings, tileWidth, tileHeight, onKill)
      } else {
        const dirX = dx / distToTarget
        const dirY = dy / distToTarget
        proj.currentX += dirX * moveStep
        proj.currentY += dirY * moveStep
        proj.traveledDistance += moveStep
        projectiles[remainingCount++] = proj
      }
    }
    projectiles.length = remainingCount
  }

  /**
   * Spawns projectiles based on projectile formation pattern.
   */
  private static spawnProjectilesForFormation(
    formation: string,
    tower: PlacedTower,
    targetUnitId: string,
    effStartX: number,
    effStartY: number,
    targetX: number,
    targetY: number,
    projSpeedPx: number,
    totalDist: number,
    projectiles: Projectile[]
  ): void {
    const baseProj: Omit<Projectile, 'id' | 'damage' | 'offsetPerp' | 'phaseOffset'> = {
      towerId: tower.id,
      startX: effStartX,
      startY: effStartY,
      currentX: effStartX,
      currentY: effStartY,
      targetUnitId,
      targetX,
      targetY,
      isSplash: tower.isSplash,
      splashRadius: tower.splashRadius,
      splashType: tower.splashType,
      projectileType: tower.projectileType,
      color: tower.projectileColor,
      speed: projSpeedPx,
      totalDistance: totalDist,
      traveledDistance: 0,
    }

    if (formation === 'single_helix') {
      projectiles.push({
        ...baseProj,
        id: `proj-${Date.now()}-0-${Math.random().toString(36).slice(2, 6)}`,
        damage: tower.damage,
        offsetPerp: 14,
        phaseOffset: 0,
      })
    } else if (formation === 'volley_3') {
      const offsets = [-16, 0, 16]
      offsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 3,
          offsetPerp: off,
          phaseOffset: 0,
        })
      })
    } else if (formation === 'volley_5') {
      const offsets = [-24, -12, 0, 12, 24]
      offsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 5,
          offsetPerp: off,
          phaseOffset: 0,
        })
      })
    } else if (formation === 'twin_helix') {
      const helixOffsets = [12, -12]
      const helixPhases = [0, Math.PI]
      helixOffsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 2,
          offsetPerp: off,
          phaseOffset: helixPhases[idx],
        })
      })
    } else if (formation === 'triple_helix') {
      const helixOffsets = [14, 14, 14]
      const helixPhases = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
      helixOffsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 3,
          offsetPerp: off,
          phaseOffset: helixPhases[idx],
        })
      })
    } else if (formation === 'fan_spread') {
      const offsets = [-28, -14, 0, 14, 28]
      offsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 5,
          offsetPerp: off,
          phaseOffset: 0,
        })
      })
    } else if (formation === 'ring_burst') {
      const ringCount = 6
      for (let r = 0; r < ringCount; r++) {
        const ang = (Math.PI * 2 * r) / ringCount
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / ringCount,
          offsetPerp: Math.sin(ang) * 20,
          phaseOffset: ang,
        })
      }
    } else if (formation === 'cluster_burst') {
      const clusterOffsets = [-9, 0, 9]
      clusterOffsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 3,
          offsetPerp: off,
          phaseOffset: idx * 0.4,
        })
      })
    } else if (formation === 'staggered_burst') {
      const burstOffsets = [-6, 0, 6]
      burstOffsets.forEach((off, idx) => {
        projectiles.push({
          ...baseProj,
          id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          damage: tower.damage / 3,
          offsetPerp: off * 0.5,
          phaseOffset: 0,
          traveledDistance: -idx * (totalDist * 0.12),
        })
      })
    } else {
      projectiles.push({
        ...baseProj,
        id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        damage: tower.damage,
        offsetPerp: 0,
        phaseOffset: 0,
      })
    }
  }

  /**
   * Resolves impact when projectile reaches target.
   */
  private static processImpact(
    proj: Projectile,
    placedTowers: PlacedTower[],
    activeUnits: CharacterUnit[],
    damageFloaters: DamageFloater[],
    explosionRings: ExplosionRing[],
    tileWidth: number,
    tileHeight: number,
    onKill?: (tower: PlacedTower, unit: CharacterUnit) => void
  ): void {
    const originTower = placedTowers.find(t => t.id === proj.towerId)
    const targetUnit = activeUnits.find(u => u.id === proj.targetUnitId)

    // Strict single-source rule: splash ONLY if tower and projectile both have splash enabled
    const isSplash = Boolean(originTower ? originTower.isSplash : proj.isSplash)

    if (isSplash) {
      explosionRings.push({
        id: `ring-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: proj.targetX,
        y: proj.targetY,
        radius: 0,
        maxRadius: (proj.splashRadius || originTower?.splashRadius || 1.5) * 64,
        color: proj.color,
        alpha: 0.85,
        lifeTimer: 0,
      })
    }

    combatEvents.emitImpact({
      x: proj.targetX,
      y: proj.targetY,
      projectileType: proj.projectileType,
      isSplash: isSplash,
      color: proj.color,
    })

    if (isSplash) {
      const splashRadiusTiles = proj.splashRadius || originTower?.splashRadius || 1.5

      for (const u of activeUnits) {
        if (u.lifecycle.isDead || !u.lifecycle.isSpawned || u.lifecycle.hasReachedEnd) continue
        const uScreen = gridToScreen(u.movement.currentCol, u.movement.currentRow, tileWidth, tileHeight)
        const distPx = Math.hypot(uScreen.x - proj.targetX, uScreen.y - proj.targetY)
        const distTiles = distPx / 64

        if (distTiles <= splashRadiusTiles) {
          const splashDmg = DamageCalculator.calculateSplashDamage(
            proj.damage,
            distTiles,
            splashRadiusTiles,
            proj.splashType || 'falloff'
          )

          if (splashDmg > 0) {
            const combatTarget: CombatUnitTarget = {
              id: u.id,
              currentCol: u.movement.currentCol,
              currentRow: u.movement.currentRow,
              screenX: uScreen.x,
              screenY: uScreen.y,
              currentHp: u.combat.currentHp,
              maxHp: u.combat.maxHp,
              isDead: u.lifecycle.isDead,
              hasReachedEnd: u.lifecycle.hasReachedEnd,
              isSpawned: u.lifecycle.isSpawned,
              pathIndex: u.movement.pathIndex,
              immunities: u.combat.immunities,
              statusEffects: u.combat.statusEffects,
              consecutiveHits: u.combat.consecutiveHits,
            }

            const dmgRes = DamageCalculator.calculateDamage(
              splashDmg,
              originTower,
              combatTarget
            )

            const actualDmg = dmgRes.finalDamage
            u.combat.currentHp = Math.max(0, u.combat.currentHp - actualDmg)
            if (originTower) originTower.totalDamageDealt += actualDmg

            damageFloaters.push({
              id: `df-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              text: `-${actualDmg}`,
              x: uScreen.x + (Math.random() * 16 - 8),
              y: uScreen.y - tileHeight * 0.9,
              color: proj.color,
              alpha: 1.0,
              lifeTimer: 0,
            })

            combatEvents.emitFloatingText({
              x: uScreen.x,
              y: uScreen.y - tileHeight * 0.9,
              text: `-${actualDmg}`,
              color: proj.color,
            })

            if (dmgRes.appliedStatusEffects && dmgRes.appliedStatusEffects.length > 0) {
              u.combat.statusEffects = u.combat.statusEffects || []
              for (const eff of dmgRes.appliedStatusEffects) {
                u.combat.statusEffects.push({ ...eff, sourceTowerId: originTower?.id })
              }
            }

            if (u.combat.currentHp <= 0 && !u.lifecycle.isDead) {
              u.lifecycle.isDead = true
              u.animation.action = 'Pickup'
              u.animation.frameIndex = 0
              u.animation.animTimer = 0
              u.lifecycle.deathFade = 1.0
              if (originTower) {
                originTower.killsCount++
                if (onKill) onKill(originTower, u)
              }
            }
          }
        }
      }
    } else if (targetUnit && !targetUnit.lifecycle.isDead) {
      const targetScreen = gridToScreen(targetUnit.movement.currentCol, targetUnit.movement.currentRow, tileWidth, tileHeight)
      const combatTarget: CombatUnitTarget = {
        id: targetUnit.id,
        currentCol: targetUnit.movement.currentCol,
        currentRow: targetUnit.movement.currentRow,
        screenX: targetScreen.x,
        screenY: targetScreen.y,
        currentHp: targetUnit.combat.currentHp,
        maxHp: targetUnit.combat.maxHp,
        isDead: targetUnit.lifecycle.isDead,
        hasReachedEnd: targetUnit.lifecycle.hasReachedEnd,
        isSpawned: targetUnit.lifecycle.isSpawned,
        pathIndex: targetUnit.movement.pathIndex,
        immunities: targetUnit.combat.immunities,
        statusEffects: targetUnit.combat.statusEffects,
        consecutiveHits: targetUnit.combat.consecutiveHits,
      }

      const dmgRes = DamageCalculator.calculateDamage(
        proj.damage,
        originTower,
        combatTarget
      )

      const actualDmg = dmgRes.finalDamage
      targetUnit.combat.currentHp = Math.max(0, targetUnit.combat.currentHp - actualDmg)
      if (originTower) originTower.totalDamageDealt += actualDmg

      damageFloaters.push({
        id: `df-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: `-${actualDmg}`,
        x: targetScreen.x + (Math.random() * 16 - 8),
        y: targetScreen.y - tileHeight * 0.9,
        color: proj.color,
        alpha: 1.0,
        lifeTimer: 0,
      })

      combatEvents.emitFloatingText({
        x: targetScreen.x,
        y: targetScreen.y - tileHeight * 0.9,
        text: `-${actualDmg}`,
        color: proj.color,
      })

      if (dmgRes.appliedStatusEffects && dmgRes.appliedStatusEffects.length > 0) {
        targetUnit.combat.statusEffects = targetUnit.combat.statusEffects || []
        for (const eff of dmgRes.appliedStatusEffects) {
          targetUnit.combat.statusEffects.push({ ...eff, sourceTowerId: originTower?.id })
        }
      }

      // Chain lightning
      const chainEffect = originTower?.effects?.find(e => e.type === 'chain') as import('../../types/combat').ChainEffect | undefined
      const chainTargetsCount = chainEffect?.targets || 0
      if (originTower && chainTargetsCount > 1) {
        const chainedUnits = TargetingSystem.findChainTargets(
          targetUnit.id,
          targetScreen.x,
          targetScreen.y,
          chainTargetsCount,
          150,
          activeUnits,
          tileWidth,
          tileHeight
        )

        let chainDmg = actualDmg * 0.7
        for (const chUnit of chainedUnits) {
          const chScreen = gridToScreen(chUnit.movement.currentCol, chUnit.movement.currentRow, tileWidth, tileHeight)
          const chCombatTarget: CombatUnitTarget = {
            id: chUnit.id,
            currentCol: chUnit.movement.currentCol,
            currentRow: chUnit.movement.currentRow,
            screenX: chScreen.x,
            screenY: chScreen.y,
            currentHp: chUnit.combat.currentHp,
            maxHp: chUnit.combat.maxHp,
            isDead: chUnit.lifecycle.isDead,
            hasReachedEnd: chUnit.lifecycle.hasReachedEnd,
            isSpawned: chUnit.lifecycle.isSpawned,
            pathIndex: chUnit.movement.pathIndex,
            immunities: chUnit.combat.immunities,
            statusEffects: chUnit.combat.statusEffects,
            consecutiveHits: chUnit.combat.consecutiveHits,
          }

          const chDmgRes = DamageCalculator.calculateDamage(chainDmg, originTower, chCombatTarget)
          const chActual = chDmgRes.finalDamage
          chUnit.combat.currentHp = Math.max(0, chUnit.combat.currentHp - chActual)
          originTower.totalDamageDealt += chActual

          damageFloaters.push({
            id: `df-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: `-${chActual}`,
            x: chScreen.x,
            y: chScreen.y - tileHeight * 0.9,
            color: 0x38bdf8,
            alpha: 1.0,
            lifeTimer: 0,
          })

          combatEvents.emitFloatingText({
            x: chScreen.x,
            y: chScreen.y - tileHeight * 0.9,
            text: `-${chActual}`,
            color: 0x38bdf8,
          })

          if (chUnit.combat.currentHp <= 0 && !chUnit.lifecycle.isDead) {
            chUnit.lifecycle.isDead = true
            chUnit.animation.action = 'Pickup'
            chUnit.animation.frameIndex = 0
            chUnit.animation.animTimer = 0
            chUnit.lifecycle.deathFade = 1.0
            originTower.killsCount++
            if (onKill) onKill(originTower, chUnit)
          }
          chainDmg *= 0.7
        }
      }

      if (targetUnit.combat.currentHp <= 0 && !targetUnit.lifecycle.isDead) {
        targetUnit.lifecycle.isDead = true
        targetUnit.animation.action = 'Pickup'
        targetUnit.animation.frameIndex = 0
        targetUnit.animation.animTimer = 0
        targetUnit.lifecycle.deathFade = 1.0
        if (originTower) {
          originTower.killsCount++
          if (onKill) onKill(originTower, targetUnit)
        }
      }
    }
  }

  /**
   * Updates client-side combat interpolation for multiplayer.
   */
  public static updateClientCombatInterpolation(
    damageFloaters: DamageFloater[],
    explosionRings: ExplosionRing[],
    deltaSec: number
  ): void {
    damageFloaters.length = CombatSimulation.updateDamageFloaters(damageFloaters, deltaSec)
    explosionRings.length = CombatSimulation.updateExplosionRings(explosionRings, deltaSec)
  }
}
