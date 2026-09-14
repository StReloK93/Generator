import { Graphics, Sprite } from 'pixi.js'
import { GridCoord, MapProject } from '../../types/map'
import { gridToScreen } from '../../utils/isometric'
import { networkSyncBuffer } from '../../services/networkSync'
import { combatEvents } from '../../services/combatEvents'

export class CombatRenderer {
  public combatGraphics: Graphics
  private combatTrails = new Map<string, { x: number; y: number; alpha: number; size: number }[]>()
  public combatSparks: {
    x: number
    y: number
    vx: number
    vy: number
    color: number
    alpha: number
    size: number
    life: number
  }[] = []

  private activeProjIds = new Set<string>()
  private unsubscribeImpact?: () => void

  constructor() {
    this.combatGraphics = new Graphics()

    // Listen to decoupled combat impact events
    this.unsubscribeImpact = combatEvents.onImpact((evt) => {
      const count = evt.count || 8
      for (let s = 0; s < count; s++) {
        const angle = (Math.PI * 2 * s) / count + (Math.random() - 0.5) * 0.5
        const speed = 40 + Math.random() * 80
        this.combatSparks.push({
          x: evt.x,
          y: evt.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: evt.color ?? 0xfbbf24,
          alpha: 1.0,
          size: 1.5 + Math.random() * 2,
          life: 0.35 + Math.random() * 0.15,
        })
      }
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
      explosionRings: any[]
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
    const hasRings =
      (towerStore.explosionRings && towerStore.explosionRings.length > 0) ||
      networkSyncBuffer.explosionRingsPool.some((r) => r.active)
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

    if (!hasProjectiles && !hasRings && !hasRangePreview && !hasUnits) {
      this.combatGraphics.clear()
      return
    }

    this.combatGraphics.clear()

    // 1. Attack Range Indicator
    if (towerToHighlight) {
      if (buildGhostSprite) buildGhostSprite.visible = false
      const r = towerToHighlight.range
      const rx = (r * tileWidth) / Math.SQRT2
      const ry = (r * tileHeight) / Math.SQRT2

      this.combatGraphics
        .ellipse(towerToHighlight.screenX, towerToHighlight.screenY, rx, ry)
        .fill({ color: 0x38bdf8, alpha: 0.12 })
        .stroke({ width: 2, color: 0x38bdf8, alpha: 0.85 })
    } else if (towerStore.activeBuildTowerId && hoveredGridCoord) {
      const isCustomBuild =
        project.buildMode === 'custom' ||
        (Array.isArray(project.buildableCells) && project.buildableCells.length > 0)
      const isNotBuildable =
        isCustomBuild &&
        !project.buildableCells?.includes(`${hoveredGridCoord.col},${hoveredGridCoord.row}`)
      const isBlocked =
        (characterStore.isCellBlockedForBuilding &&
          characterStore.isCellBlockedForBuilding(hoveredGridCoord.col, hoveredGridCoord.row)) ||
        towerStore.placedTowers.some(
          (t) => t.col === hoveredGridCoord.col && t.row === hoveredGridCoord.row
        ) ||
        isNotBuildable
      const ringColor = isBlocked ? 0xef4444 : 0x10b981
      const bp =
        towerStore.blueprints?.find((b: any) => b.id === towerStore.activeBuildTowerId) ||
        towerStore.activeBlueprint
      const r = bp ? bp.range : 3.5
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
          buildGhostSprite.alpha = 0.55
          buildGhostSprite.anchor.set(0.5, 0.88)
          const texW = texture.width && texture.width > 10 ? texture.width : 256
          const baseScale = (tileWidth * 1.0) / texW
          buildGhostSprite.scale.set(baseScale * 0.98)
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

    // 2. Flying Animated Projectiles
    const nowTime = performance.now()
    this.activeProjIds.clear()

    if (hasProjectiles) {
      const isLocal = Boolean(towerStore.projectiles && towerStore.projectiles.length > 0)
      const count = isLocal ? towerStore.projectiles.length : networkSyncBuffer.projectilesPool.length

      for (let i = 0; i < count; i++) {
        const proj = isLocal ? towerStore.projectiles[i] : networkSyncBuffer.projectilesPool[i]
        if (!proj || (proj.active === false && !isLocal)) continue
        this.activeProjIds.add(proj.id)
        const type = proj.projectileType || 'cannonball'

        const totalDist =
          proj.totalDistance ||
          Math.hypot(proj.targetX - proj.startX, proj.targetY - proj.startY) ||
          1
        const progress = Math.min(1.0, (proj.traveledDistance || 0) / totalDist)

        const arcHeight =
          type === 'laser' || type === 'magic_bolt'
            ? 0
            : Math.sin(progress * Math.PI) * Math.min(45, totalDist * 0.16)

        const renderX = proj.currentX
        const renderY = proj.currentY - arcHeight

        const baseAngle = Math.atan2(proj.targetY - proj.currentY, proj.targetX - proj.currentX)
        const arcSlope =
          type === 'arrow'
            ? -Math.cos(progress * Math.PI) * (arcHeight / Math.max(30, totalDist * 0.4)) * 1.2
            : 0
        const angle = baseAngle + arcSlope

        let trail = this.combatTrails.get(proj.id)
        if (!trail) {
          trail = []
          this.combatTrails.set(proj.id, trail)
        }
        trail.push({ x: renderX, y: renderY, alpha: 1.0, size: 3.5 })
        if (trail.length > 8) trail.shift()

        for (let t = 0; t < trail.length; t++) {
          const pt = trail[t]
          pt.alpha = Math.max(0, pt.alpha - 0.04)
          if (pt.alpha <= 0) continue

          const trailRadius = (t / trail.length) * 3.5
          let trailColor = 0x94a3b8
          let trailAlpha = pt.alpha * 0.5

          if (type === 'fireball') {
            trailColor = 0xf97316
            trailAlpha = pt.alpha * 0.7
          } else if (type === 'frost_bolt') {
            trailColor = 0x06b6d4
            trailAlpha = pt.alpha * 0.7
          } else if (type === 'laser') {
            trailColor = 0xf43f5e
            trailAlpha = pt.alpha * 0.8
          } else if (type === 'magic_bolt') {
            trailColor = 0x38bdf8
            trailAlpha = pt.alpha * 0.7
          }

          this.combatGraphics
            .circle(pt.x, pt.y, Math.max(1, trailRadius))
            .fill({ color: trailColor, alpha: trailAlpha })
        }

        // Render projectile heads
        if (type === 'arrow') {
          const arrowLength = 16
          const tailX = renderX - Math.cos(angle) * arrowLength
          const tailY = renderY - Math.sin(angle) * arrowLength

          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(renderX, renderY)
            .stroke({ width: 2.0, color: 0x78350f, alpha: 1.0 })

          const tipX = renderX + Math.cos(angle) * 5
          const tipY = renderY + Math.sin(angle) * 5
          const leftWingX = renderX + Math.cos(angle + 2.5) * 4.5
          const leftWingY = renderY + Math.sin(angle + 2.5) * 4.5
          const rightWingX = renderX + Math.cos(angle - 2.5) * 4.5
          const rightWingY = renderY + Math.sin(angle - 2.5) * 4.5

          this.combatGraphics
            .poly([tipX, tipY, leftWingX, leftWingY, rightWingX, rightWingY])
            .fill({ color: 0xe2e8f0, alpha: 1.0 })
            .stroke({ width: 1, color: 0x475569, alpha: 1.0 })

          const featherLeftX = tailX + Math.cos(angle + 2.4) * 4
          const featherLeftY = tailY + Math.sin(angle + 2.4) * 4
          const featherRightX = tailX + Math.cos(angle - 2.4) * 4
          const featherRightY = tailY + Math.sin(angle - 2.4) * 4

          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(featherLeftX, featherLeftY)
            .stroke({ width: 1.5, color: 0xef4444, alpha: 0.95 })
          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(featherRightX, featherRightY)
            .stroke({ width: 1.5, color: 0xef4444, alpha: 0.95 })
        } else if (type === 'fireball') {
          this.combatGraphics.circle(renderX, renderY, 7.5).fill({ color: 0xef4444, alpha: 0.5 })
          this.combatGraphics.circle(renderX, renderY, 5.0).fill({ color: 0xf97316, alpha: 0.95 })
          this.combatGraphics.circle(renderX, renderY, 2.5).fill({ color: 0xfef08a, alpha: 1.0 })
        } else if (type === 'frost_bolt') {
          this.combatGraphics.circle(renderX, renderY, 6.5).fill({ color: 0x06b6d4, alpha: 0.5 })
          const rotAngle = nowTime * 0.008
          const cosR = Math.cos(rotAngle)
          const sinR = Math.sin(rotAngle)

          const pTop = { x: renderX + -sinR * -6, y: renderY + cosR * -6 }
          const pRight = { x: renderX + cosR * 4, y: renderY + sinR * 4 }
          const pBottom = { x: renderX + -sinR * 6, y: renderY + cosR * 6 }
          const pLeft = { x: renderX + cosR * -4, y: renderY + sinR * -4 }

          this.combatGraphics
            .poly([pTop, pRight, pBottom, pLeft])
            .fill({ color: 0xffffff, alpha: 0.95 })
            .stroke({ width: 1.2, color: 0x0891b2, alpha: 1.0 })
        } else if (type === 'laser') {
          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(renderX, renderY)
            .stroke({ width: 5.0, color: 0xf43f5e, alpha: 0.45 })
          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(renderX, renderY)
            .stroke({ width: 1.8, color: 0xffffff, alpha: 1.0 })
          this.combatGraphics.circle(renderX, renderY, 4.0).fill({ color: 0xffffff, alpha: 1.0 })
        } else if (type === 'missile') {
          const mLen = 14
          const tailX = renderX - Math.cos(angle) * mLen
          const tailY = renderY - Math.sin(angle) * mLen

          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(renderX, renderY)
            .stroke({ width: 4.5, color: 0x334155, alpha: 1.0 })

          const tipX = renderX + Math.cos(angle) * 3.5
          const tipY = renderY + Math.sin(angle) * 3.5
          this.combatGraphics.circle(tipX, tipY, 2.8).fill({ color: 0xef4444, alpha: 1.0 })
          this.combatGraphics.circle(tailX, tailY, 3.2).fill({ color: 0xfbbf24, alpha: 0.95 })
        } else if (type === 'cannonball') {
          this.combatGraphics
            .circle(renderX, renderY, 5.5)
            .fill({ color: 0x1e293b, alpha: 1.0 })
            .stroke({ width: 1.2, color: 0x475569, alpha: 1.0 })
          this.combatGraphics
            .circle(renderX - 1.5, renderY - 1.5, 1.6)
            .fill({ color: 0x94a3b8, alpha: 0.95 })
        } else {
          this.combatGraphics.circle(renderX, renderY, 6.5).fill({ color: 0x38bdf8, alpha: 0.5 })
          this.combatGraphics.circle(renderX, renderY, 3.0).fill({ color: 0xffffff, alpha: 1.0 })
          this.combatGraphics
            .moveTo(renderX - 5, renderY)
            .lineTo(renderX + 5, renderY)
            .stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 })
          this.combatGraphics
            .moveTo(renderX, renderY - 5)
            .lineTo(renderX, renderY + 5)
            .stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 })
        }
      }
    }

    // Clean trails
    for (const id of this.combatTrails.keys()) {
      if (!this.activeProjIds.has(id)) {
        this.combatTrails.delete(id)
      }
    }

    // 3. Explosion Shockwave Rings
    if (hasRings) {
      const isLocal = Boolean(towerStore.explosionRings && towerStore.explosionRings.length > 0)
      const ringsCount = isLocal ? towerStore.explosionRings.length : networkSyncBuffer.explosionRingsPool.length

      for (let i = 0; i < ringsCount; i++) {
        const ring = isLocal ? towerStore.explosionRings[i] : networkSyncBuffer.explosionRingsPool[i]
        if (!ring || (ring.active === false && !isLocal)) continue

        const rx = ring.radius
        const ry = ring.radius * 0.5
        this.combatGraphics
          .ellipse(ring.x, ring.y, rx, ry)
          .stroke({ width: 2.5, color: ring.color, alpha: ring.alpha * 0.85 })
        this.combatGraphics
          .ellipse(ring.x, ring.y, rx * 0.8, ry * 0.8)
          .fill({ color: ring.color, alpha: ring.alpha * 0.2 })
      }
    }

    // 4. Impact Spark Particles
    if (this.combatSparks.length > 0) {
      for (let i = this.combatSparks.length - 1; i >= 0; i--) {
        const sp = this.combatSparks[i]
        sp.x += sp.vx * 0.016
        sp.y += sp.vy * 0.016
        sp.life -= 0.016
        sp.alpha = Math.max(0, sp.life / 0.45)

        if (sp.alpha > 0) {
          this.combatGraphics.circle(sp.x, sp.y, sp.size).fill({ color: sp.color, alpha: sp.alpha })
        }

        if (sp.life <= 0) {
          this.combatSparks.splice(i, 1)
        }
      }
    }

    // 5. Floating Unit HP Bars
    if (hasUnits) {
      for (let i = 0; i < units.length; i++) {
        const unit = units[i]
        if (!unit.isSpawned || unit.isDead) continue

        const maxHp = unit.maxHp || 100
        const currentHp = Math.max(0, unit.currentHp ?? maxHp)
        const ratio = Math.min(1, Math.max(0, currentHp / maxHp))

        const unitElev = Number(characterStore?.unitElevation) || 0
        const unitOffsetY = (unit.offsetY ?? 0) + unitElev
        const barW = 32
        const barH = 4
        const barX = unit.screenX - barW / 2
        const barY = unit.screenY - tileHeight * 1.25 - unitOffsetY

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
    this.combatGraphics.clear()
    this.combatTrails.clear()
    this.combatSparks = []
  }

  public destroy(): void {
    if (this.unsubscribeImpact) {
      this.unsubscribeImpact()
    }
    this.clear()
    this.combatGraphics.destroy()
  }
}
