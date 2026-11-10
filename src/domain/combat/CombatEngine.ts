import { PlacedTower, TowerBlueprint } from '../../types/tower'
import { Projectile, DamageFloater } from '../../types/combat'
import type { ProjectileDefinition } from '../../types/projectile'
import { CharacterUnit } from '../../types/unit'
import { TargetingSystem, DamageCalculator, CombatSimulation, CombatUnitTarget } from './index'
import { getProjectile, isInstantProjectile, launchSlots, projectileColor } from '../projectile'
import { combatEvents } from '../../services/combatEvents'
import { emitProjectileImpact, emitProjectileStrike, SPLASH_PX_PER_TILE } from '../../services/projectileImpact'
import { gridToScreen } from '../../utils/isometric'

export interface CombatTickContext {
  placedTowers: PlacedTower[]
  blueprintsMap: Map<string, TowerBlueprint>
  activeUnits: CharacterUnit[]
  projectiles: Projectile[]
  damageFloaters: DamageFloater[]
  tileWidth: number
  tileHeight: number
  deltaSec: number
  isPaused: boolean
  onKill?: (tower: PlacedTower, unit: CharacterUnit) => void
  /** Called once per projectile spawned this tick, before it flies (multiplayer host mirrors it to clients). */
  onFire?: (projectile: Projectile) => void
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
      tileWidth,
      tileHeight,
      deltaSec,
      isPaused,
      onKill,
      onFire,
    } = ctx

    // 1. Update visual effects
    damageFloaters.length = CombatSimulation.updateDamageFloaters(damageFloaters, deltaSec)

    if (isPaused) {
      if (projectiles.length > 0) {
        projectiles.length = 0
      }
      return
    }

    // 2. Tower targeting and shooting
    const firstFiredIndex = projectiles.length
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
          const muzzleX = towerScreen.x + (bp?.asset?.muzzleOffsetX ?? bp?.asset.muzzleOffsetX ?? 0)
          const muzzleY = towerScreen.y - tileHeight * 1.35 + (bp?.asset?.muzzleOffsetY ?? bp?.asset.muzzleOffsetY ?? 0)

          const targetScreen = gridToScreen(bestTarget.movement.currentCol, bestTarget.movement.currentRow, tileWidth, tileHeight)
          const targetX = targetScreen.x
          const targetY = targetScreen.y - tileHeight * 0.5

          const projDef = getProjectile(tower.projectileId)
          const projId = projDef.id
          if (isInstantProjectile(projDef)) {
            emitProjectileStrike(muzzleX, muzzleY, targetX, targetY, projId)

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
              splashRadius: tower.splashRadius || 1.5,
              splashType: tower.splashType || 'falloff',
              projectileType: projId,
              color: projectileColor(projDef),
              speed: 9999,
              totalDistance: 1,
              traveledDistance: 1,
            }

            // Instant hits never enter the flying list, so report them to onFire here
            onFire?.(dummyProj)
            this.processImpact(
              dummyProj,
              placedTowers,
              activeUnits,
              damageFloaters,
              tileWidth,
              tileHeight,
              onKill
            )
          } else {
            const effStartX = muzzleX
            const effStartY = muzzleY
            const totalDist = Math.hypot(targetX - muzzleX, targetY - muzzleY) || 1
            const projSpeedPx = projDef.motion.speed * (tileWidth * 0.45)

            this.spawnShot(
              projDef,
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

    if (onFire) {
      for (let i = firstFiredIndex; i < projectiles.length; i++) onFire(projectiles[i])
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

      const moveStep = proj.speed * deltaSec
      // A staggered volley's later projectiles wait at the muzzle before they set off
      if (proj.traveledDistance < 0) {
        proj.traveledDistance = Math.min(0, proj.traveledDistance + moveStep)
        projectiles[remainingCount++] = proj
        continue
      }

      const dx = proj.targetX - proj.currentX
      const dy = proj.targetY - proj.currentY
      const distToTarget = Math.hypot(dx, dy)

      if (distToTarget <= moveStep || distToTarget < 12) {
        this.processImpact(proj, placedTowers, activeUnits, damageFloaters, tileWidth, tileHeight, onKill)
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

  /** Spawns every projectile of one shot (its volley comes from the projectile's launch pattern). */
  private static spawnShot(
    def: ProjectileDefinition,
    tower: PlacedTower,
    targetUnitId: string,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    speedPx: number,
    totalDist: number,
    projectiles: Projectile[]
  ): void {
    const slots = launchSlots(def.launch)
    slots.forEach((slot, idx) => {
      projectiles.push({
        id: `proj-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        towerId: tower.id,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        targetUnitId,
        targetX,
        targetY,
        damage: tower.damage / slots.length,
        isSplash: tower.isSplash,
        splashRadius: tower.splashRadius || 1.5,
        splashType: tower.splashType || 'falloff',
        projectileType: def.id,
        color: projectileColor(def),
        speed: speedPx,
        totalDistance: totalDist,
        traveledDistance: -slot.delay * totalDist,
        offsetPerp: slot.offsetPerp,
        phaseOffset: slot.phaseOffset,
      })
    })
  }

  /**
   * Resolves impact when projectile reaches target.
   */
  private static processImpact(
    proj: Projectile,
    placedTowers: PlacedTower[],
    activeUnits: CharacterUnit[],
    damageFloaters: DamageFloater[],
    tileWidth: number,
    tileHeight: number,
    onKill?: (tower: PlacedTower, unit: CharacterUnit) => void
  ): void {
    const originTower = placedTowers.find(t => t.id === proj.towerId)
    const targetUnit = activeUnits.find(u => u.id === proj.targetUnitId)

    // Strict single-source rule: splash ONLY if tower and projectile both have splash enabled
    const isSplash = Boolean(originTower ? originTower.isSplash : proj.isSplash)

    const splashRadiusTiles = proj.splashRadius || originTower?.splashRadius || 1.5
    emitProjectileImpact(proj.targetX, proj.targetY, proj.projectileType, isSplash ? splashRadiusTiles : 0)

    let directTarget = targetUnit
    if (!directTarget) {
      let closestUnit: CharacterUnit | null = null
      let closestDist = Infinity
      for (const u of activeUnits) {
        if (u.lifecycle.isDead || !u.lifecycle.isSpawned || u.lifecycle.hasReachedEnd) continue
        const uScreen = gridToScreen(u.movement.currentCol, u.movement.currentRow, tileWidth, tileHeight)
        const d = Math.hypot(uScreen.x - proj.targetX, uScreen.y - proj.targetY)
        if (d < closestDist) {
          closestDist = d
          closestUnit = u
        }
      }
      if (closestUnit && closestDist <= 36) {
        directTarget = closestUnit
      }
    }

    if (isSplash) {
      for (const u of activeUnits) {
        if (u.lifecycle.isDead || !u.lifecycle.isSpawned || u.lifecycle.hasReachedEnd) continue
        const uScreen = gridToScreen(u.movement.currentCol, u.movement.currentRow, tileWidth, tileHeight)
        const distPx = Math.hypot(uScreen.x - proj.targetX, uScreen.y - proj.targetY)
        const distTiles = distPx / SPLASH_PX_PER_TILE

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

            const isDirectTarget = Boolean(directTarget && u.id === directTarget.id)
            const dmgRes = DamageCalculator.calculateDamage(
              splashDmg,
              originTower,
              combatTarget,
              { isSplashHit: !isDirectTarget }
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
                const existing = u.combat.statusEffects.find(e => e.type === eff.type && e.sourceTowerId === originTower?.id)
                if (existing) {
                  existing.duration = Math.max(existing.duration, eff.duration)
                  if (eff.slowPercent) existing.slowPercent = eff.slowPercent
                  if (eff.dps) existing.dps = eff.dps
                  if (eff.amplification) existing.amplification = eff.amplification
                } else {
                  u.combat.statusEffects.push({ ...eff, sourceTowerId: originTower?.id })
                }
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
          const existing = targetUnit.combat.statusEffects.find(e => e.type === eff.type && e.sourceTowerId === originTower?.id)
          if (existing) {
            existing.duration = Math.max(existing.duration, eff.duration)
            if (eff.slowPercent) existing.slowPercent = eff.slowPercent
            if (eff.dps) existing.dps = eff.dps
            if (eff.amplification) existing.amplification = eff.amplification
          } else {
            targetUnit.combat.statusEffects.push({ ...eff, sourceTowerId: originTower?.id })
          }
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
  public static updateClientCombatInterpolation(damageFloaters: DamageFloater[], deltaSec: number): void {
    damageFloaters.length = CombatSimulation.updateDamageFloaters(damageFloaters, deltaSec)
  }
}
