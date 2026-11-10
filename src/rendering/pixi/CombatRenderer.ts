import { Graphics, Sprite } from 'pixi.js'
import { GridCoord, MapProject } from '../../types/map'
import { useRouteStore } from '../../stores/routeStore'
import { useWaveStore } from '../../stores/waveStore'
import { useGameStore } from '../../stores/gameStore'
import { gridToScreen } from '../../utils/isometric'
import { networkSyncBuffer } from '../../services/networkSync'
import { combatEvents } from '../../services/combatEvents'
import { assetManager } from '../../services/assetManager'
import { getProjectile } from '../../domain/projectile'
import { ProjectileFx } from './projectile/ProjectileFx'

const SHOCKWAVE_LIFE = 0.55

/**
 * Where a unit's feet are drawn, as its tile plus a screen offset — the same placement UnitRenderer uses
 * (pairs formation side step, per-unit / wave offsetY and the global elevation), so effects land on the sprite.
 */
function unitFeet(
  unit: any,
  tileWidth: number,
  formation: string | undefined,
  elevation: number,
  waveOffsetY: number | undefined
): { col: number; row: number; dx: number; dy: number } | null {
  const col = unit.movement ? unit.movement.currentCol : unit.currentCol
  const row = unit.movement ? unit.movement.currentRow : unit.currentRow
  if (typeof col !== 'number' || typeof row !== 'number') return null
  let dx = 0
  let dy = 0
  const sideOffset = unit.identity ? unit.identity.sideOffset : (unit.sideOffset ?? 0)
  if (formation === 'pairs' && sideOffset) {
    const direction = unit.movement ? unit.movement.direction : (unit.direction ?? 2)
    const offsetDist = tileWidth * 0.15 * sideOffset
    dx += Math.cos((direction * Math.PI) / 4 + Math.PI / 2) * offsetDist
    dy += Math.sin((direction * Math.PI) / 4 + Math.PI / 2) * 0.5 * offsetDist
  }
  const offsetY = (unit.identity ? unit.identity.offsetY : unit.offsetY) ?? waveOffsetY ?? 0
  dy -= (Number(offsetY) || 0) + elevation
  return { col, row, dx, dy }
}

export class CombatRenderer {
  public combatGraphics: Graphics
  /** Projectile bodies, trails, particles, impacts, strikes and beams (fed by combat and combatEvents) */
  private projectileFx: ProjectileFx
  /** Splash shockwave rings sized to the real splash damage area — fed by combatEvents (host and clients alike). */
  private activeShockwaves: { x: number; y: number; maxRadius: number; color: number; life: number }[] = []

  private unsubscribeImpact?: () => void
  private unsubscribeStrike?: () => void
  private unsubscribeShockwave?: () => void
  private lastTime = 0

  constructor() {
    this.combatGraphics = new Graphics()
    this.combatGraphics.zIndex = 999999
    this.projectileFx = new ProjectileFx(this.combatGraphics)

    this.unsubscribeStrike = combatEvents.onStrike((evt) => {
      this.projectileFx.strike(getProjectile(evt.projectileType), evt.startX ?? evt.x, evt.startY ?? evt.y, evt.x, evt.y, evt.targetUnitId)
    })
    this.unsubscribeShockwave = combatEvents.onShockwave((evt) => {
      this.activeShockwaves.push({ ...evt, life: SHOCKWAVE_LIFE })
    })
    this.unsubscribeImpact = combatEvents.onImpact((evt) => {
      this.projectileFx.impact(getProjectile(evt.projectileType), evt.x, evt.y)
    })
  }

  public renderCombat(
    towerStore: {
      placedTowers: any[]
      selectedPlacedTowerId: string | null
      activeBuildTowerId: string | null
      blueprints?: any[]
      activeBlueprint?: any
      projectiles: any[]
      damageFloaters: any[]
    },
    project: MapProject,
    characterStore: any,
    hoveredGridCoord: GridCoord | null = null,
    buildGhostSprite?: Sprite,
    getBlueprintTexture?: (bp: any) => any
  ): void {
    const { tileWidth, tileHeight } = project

    const hasProjectiles =
      (towerStore.projectiles && towerStore.projectiles.length > 0) ||
      networkSyncBuffer.projectilesPool.some((p) => p.active)
    const hasRings = this.activeShockwaves.length > 0
    const towerToHighlight = towerStore.placedTowers.find(
      (t) => t.id === towerStore.selectedPlacedTowerId
    )
    const hasRangePreview = Boolean(
      towerToHighlight || (towerStore.activeBuildTowerId && hoveredGridCoord)
    )
    const units =
      networkSyncBuffer.renderUnitsList.length > 0
        ? networkSyncBuffer.renderUnitsList
        : characterStore.units || []
    const hasUnits = units.length > 0

    if (!hasProjectiles && !hasRings && !hasRangePreview && !hasUnits && this.projectileFx.isIdle) {
      if (this.combatGraphics && !this.combatGraphics.destroyed) {
        this.combatGraphics.clear()
      }
      return
    }

    if (this.combatGraphics && !this.combatGraphics.destroyed) {
      this.combatGraphics.clear()
      this.combatGraphics.zIndex = 999999
    } else {
      return
    }

    // 1. Attack Range Indicator
    if (towerToHighlight) {
      if (buildGhostSprite) buildGhostSprite.visible = false
      const r = towerToHighlight.range
      const rx = (r * tileWidth) / Math.SQRT2
      const ry = (r * tileHeight) / Math.SQRT2

      const towerPos = gridToScreen(towerToHighlight.col, towerToHighlight.row, tileWidth, tileHeight)
      this.combatGraphics
        .ellipse(towerPos.x, towerPos.y, rx, ry)
        .fill({ color: 0x38bdf8, alpha: 0.12 })
        .stroke({ width: 2, color: 0x38bdf8, alpha: 0.85 })
    } else if (towerStore.activeBuildTowerId && hoveredGridCoord) {
      const isCustomBuild =
        project.buildMode === 'custom' ||
        (Array.isArray(project.buildableCells) && project.buildableCells.length > 0)
      const isNotBuildable =
        isCustomBuild &&
        !project.buildableCells?.includes(`${hoveredGridCoord.col},${hoveredGridCoord.row}`)
      const routeStore = useRouteStore()
      const isBlocked =
        (routeStore.isCellBlockedForBuilding &&
          routeStore.isCellBlockedForBuilding(hoveredGridCoord.col, hoveredGridCoord.row)) ||
        towerStore.placedTowers.some(
          (t) => t.col === hoveredGridCoord.col && t.row === hoveredGridCoord.row
        ) ||
        isNotBuildable
      const ringColor = isBlocked ? 0xef4444 : 0x10b981
      const bp =
        towerStore.blueprints?.find((b: any) => b.id === towerStore.activeBuildTowerId) ||
        towerStore.activeBlueprint
      const r = bp?.levels?.[0]?.range ?? 3.5
      const rx = (r * tileWidth) / Math.SQRT2
      const ry = (r * tileHeight) / Math.SQRT2
      const pt = gridToScreen(hoveredGridCoord.col, hoveredGridCoord.row, tileWidth, tileHeight)

      // Ghost preview
      if (!isBlocked && bp && buildGhostSprite && getBlueprintTexture) {
        const texture = getBlueprintTexture(bp)
        if (texture) {
          if (buildGhostSprite.texture !== texture) {
            buildGhostSprite.texture = texture
          }
          buildGhostSprite.visible = true
          buildGhostSprite.position.set(pt.x, pt.y)
          const bpAsset = bp.asset
          const asset = bpAsset?.assetId ? assetManager.getAssetItem(bpAsset.assetId) : (bpAsset?.assetName ? assetManager.getAssetItem(bpAsset.assetName) : undefined)
          const spanX = bpAsset?.spanX || asset?.spanX || 1
          const assetWidth = asset?.width || (texture.width > 0 ? texture.width : tileWidth)
          const baseScale = (tileWidth * spanX) / (assetWidth || tileWidth)

          const scale = baseScale * (bpAsset?.scale || asset?.scale || 1.0)
          const anchorX = asset?.anchorX ?? bpAsset?.anchorX ?? 0.5
          const anchorY = asset?.anchorY ?? bpAsset?.anchorY ?? 0.88
          buildGhostSprite.scale.set(scale)
          buildGhostSprite.anchor.set(anchorX, anchorY)
        } else {
          buildGhostSprite.visible = false
        }
      } else if (buildGhostSprite) {
        buildGhostSprite.visible = false
      }

      // Isometric Cell Footprint Diamond
      this.combatGraphics
        .poly([
          { x: pt.x, y: pt.y - tileHeight * 0.5 },
          { x: pt.x + tileWidth * 0.5, y: pt.y },
          { x: pt.x, y: pt.y + tileHeight * 0.5 },
          { x: pt.x - tileWidth * 0.5, y: pt.y },
        ])
        .fill({ color: ringColor, alpha: isBlocked ? 0.35 : 0.22 })
        .stroke({ width: 2.8, color: ringColor, alpha: 0.95 })

      // Range Preview Ellipse
      this.combatGraphics
        .ellipse(pt.x, pt.y, rx, ry)
        .fill({ color: ringColor, alpha: isBlocked ? 0.12 : 0.08 })
        .stroke({ width: 2, color: ringColor, alpha: 0.8 })

      // Confirmation / Blocked Badge
      const badgeY = pt.y - tileHeight * 0.8
      if (!isBlocked) {
        this.combatGraphics.circle(pt.x, badgeY, 15).fill({ color: 0x10b981, alpha: 0.3 })
        this.combatGraphics
          .circle(pt.x, badgeY, 11)
          .fill({ color: 0x0f172a, alpha: 0.95 })
          .stroke({ width: 2.2, color: 0x10b981, alpha: 1.0 })
        this.combatGraphics
          .moveTo(pt.x - 5, badgeY)
          .lineTo(pt.x - 1.5, badgeY + 3.5)
          .lineTo(pt.x + 5.5, badgeY - 3.5)
          .stroke({ width: 2.5, color: 0x34d399, alpha: 1.0 })
      } else {
        this.combatGraphics.circle(pt.x, badgeY, 15).fill({ color: 0xef4444, alpha: 0.3 })
        this.combatGraphics
          .circle(pt.x, badgeY, 11)
          .fill({ color: 0x0f172a, alpha: 0.95 })
          .stroke({ width: 2.2, color: 0xef4444, alpha: 1.0 })
        this.combatGraphics
          .moveTo(pt.x - 4, badgeY - 4)
          .lineTo(pt.x + 4, badgeY + 4)
          .stroke({ width: 2.5, color: 0xef4444, alpha: 1.0 })
          .moveTo(pt.x + 4, badgeY - 4)
          .lineTo(pt.x - 4, badgeY + 4)
          .stroke({ width: 2.5, color: 0xef4444, alpha: 1.0 })
      }
    } else if (buildGhostSprite) {
      buildGhostSprite.visible = false
    }


    const nowTime = performance.now()
    const dt = this.lastTime > 0 ? Math.min(0.1, (nowTime - this.lastTime) / 1000) : 0.016
    this.lastTime = nowTime
    this.projectileFx.beginFrame(dt)

    // 2. Flying projectiles (host simulation or the multiplayer client's mirrored ones)
    if (hasProjectiles) {
      const isLocal = Boolean(towerStore.projectiles && towerStore.projectiles.length > 0)
      const list = isLocal ? towerStore.projectiles : networkSyncBuffer.projectilesPool
      for (const proj of list) {
        if (!proj || (!isLocal && !proj.active)) continue
        this.projectileFx.drawFlying({
          id: proj.id,
          def: getProjectile(proj.projectileType),
          x: proj.currentX,
          y: proj.currentY,
          startX: proj.startX,
          startY: proj.startY,
          targetX: proj.targetX,
          targetY: proj.targetY,
          traveled: proj.traveledDistance || 0,
          total: proj.totalDistance || Math.hypot(proj.targetX - proj.startX, proj.targetY - proj.startY) || 1,
          offsetPerp: proj.offsetPerp,
          phaseOffset: proj.phaseOffset,
        })
      }
    }

    // 3. Splash shockwaves: eased isometric ground ring + trailing inner ring + soft scorch fill
    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const w = this.activeShockwaves[i]
      w.life -= dt
      if (w.life <= 0) {
        this.activeShockwaves.splice(i, 1)
        continue
      }
      const t = 1 - w.life / SHOCKWAVE_LIFE
      const ease = 1 - Math.pow(1 - t, 3)
      const fade = 1 - t
      const rx = w.maxRadius * ease
      if (t < 0.35) {
        const burst = 1 - t / 0.35
        const br = w.maxRadius * 0.45 * (0.6 + t)
        this.combatGraphics.ellipse(w.x, w.y, br, br * 0.5).fill({ color: w.color, alpha: 0.45 * burst })
        this.combatGraphics.ellipse(w.x, w.y, br * 0.5, br * 0.25).fill({ color: 0xffffff, alpha: 0.55 * burst })
      }
      this.combatGraphics.ellipse(w.x, w.y, rx, rx * 0.5).fill({ color: w.color, alpha: 0.14 * fade })
      this.combatGraphics.ellipse(w.x, w.y, rx, rx * 0.5).stroke({ width: 3 + 7 * fade, color: w.color, alpha: 0.28 * fade })
      this.combatGraphics.ellipse(w.x, w.y, rx, rx * 0.5).stroke({ width: 1.5 + 2 * fade, color: w.color, alpha: 0.95 * fade })
      this.combatGraphics.ellipse(w.x, w.y, rx * 0.97, rx * 0.485).stroke({ width: 1, color: 0xffffff, alpha: 0.6 * fade })
    }

    // 4. Particles, strikes, beams, impact rings and flashes; strikes stay on their unit while it walks
    const formation = useGameStore()?.formation
    const elevation = Number(characterStore?.unitElevation) || 0
    const waveCfg = (() => {
      const ws = useWaveStore()
      return ws?.currentWaveConfig || ws?.waveConfigs?.[ws?.currentWaveIndex ?? 0] || null
    })()
    this.projectileFx.endFrame(id => {
      const unit = units.find((u: any) => u.id === id)
      if (!unit || (unit.lifecycle ? unit.lifecycle.isDead : unit.isDead)) return null
      const feet = unitFeet(unit, tileWidth, formation, elevation, waveCfg?.offsetY)
      if (!feet) return null
      const base = gridToScreen(feet.col, feet.row, tileWidth, tileHeight)
      return { x: base.x + feet.dx, y: base.y + feet.dy, height: tileHeight * 0.5 }
    })


    // 5. Floating Unit HP Bars
    if (hasUnits) {
      const waveStore = useWaveStore()
      const gameStore = useGameStore()
      const currentWaveCfg =
        waveStore?.currentWaveConfig ||
        waveStore?.waveConfigs?.[waveStore?.currentWaveIndex ?? 0] ||
        null

      for (let i = 0; i < units.length; i++) {
        const unit = units[i]
        const isSpawned = unit.lifecycle ? unit.lifecycle.isSpawned : unit.isSpawned
        const isDead = unit.lifecycle ? unit.lifecycle.isDead : unit.isDead
        if (!isSpawned || isDead) continue

        const maxHp = (unit.combat ? unit.combat.maxHp : unit.maxHp) || 100
        const currentHp = Math.max(0, (unit.combat ? unit.combat.currentHp : unit.currentHp) ?? maxHp)
        const ratio = Math.min(1, Math.max(0, currentHp / maxHp))

        const unitElev = Number(characterStore?.unitElevation) || 0
        const rawOffsetY = (unit.identity ? unit.identity.offsetY : unit.offsetY) ?? currentWaveCfg?.offsetY ?? 0
        const unitOffsetY = rawOffsetY + unitElev

        const col = unit.movement ? unit.movement.currentCol : unit.currentCol
        const row = unit.movement ? unit.movement.currentRow : unit.currentRow
        const direction = unit.movement ? unit.movement.direction : (unit.direction ?? 2)
        const baseScreen = gridToScreen(col, row, tileWidth, tileHeight)

        const sideOffset = unit.identity ? unit.identity.sideOffset : (unit.sideOffset ?? 0)
        let finalScreenX = baseScreen.x
        let finalScreenY = baseScreen.y

        if (gameStore?.formation === 'pairs' && sideOffset !== 0) {
          const perpX = Math.cos((direction * Math.PI) / 4 + Math.PI / 2)
          const perpY = Math.sin((direction * Math.PI) / 4 + Math.PI / 2) * 0.5
          const offsetDist = tileWidth * 0.15 * sideOffset
          finalScreenX += perpX * offsetDist
          finalScreenY += perpY * offsetDist
        }

        const globalScale = Number(characterStore?.unitScaleMultiplier) || 1.0
        const rawUnitScale = (unit.identity ? unit.identity.scale : (unit as any).unitScale) ?? currentWaveCfg?.unitScale
        const customUnitScale = (Number(rawUnitScale) || 1.0) * globalScale

        const barW = Math.round(32 * Math.min(1.5, Math.max(0.8, customUnitScale)))
        const barH = 4
        const barX = finalScreenX - barW / 2
        const barY = finalScreenY - (tileHeight * 1.15 * customUnitScale) - unitOffsetY

        this.combatGraphics
          .roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2)
          .fill({ color: 0x090d16, alpha: 0.85 })
          .stroke({ width: 1, color: 0x1e293b, alpha: 0.9 })

        const hpColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444
        this.combatGraphics
          .roundRect(barX, barY, Math.max(2, barW * ratio), barH, 1.5)
          .fill({ color: hpColor, alpha: 0.95 })
      }
    }
  }

  public clear(): void {
    try {
      if (this.combatGraphics && !this.combatGraphics.destroyed) {
        this.combatGraphics.clear()
      }
      this.projectileFx.clear()
      this.activeShockwaves.length = 0
    } catch (e) {
      console.warn('[CombatRenderer] clear caught:', e)
    }
  }

  public destroy(): void {
    try {
      this.unsubscribeImpact?.()
      this.unsubscribeShockwave?.()
      this.unsubscribeStrike?.()
      this.clear()
      if (this.combatGraphics && !this.combatGraphics.destroyed) {
        this.combatGraphics.destroy()
      }
    } catch (e) {
      console.warn('[CombatRenderer] destroy caught:', e)
    }
  }
}
