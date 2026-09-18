import { Graphics, Sprite } from 'pixi.js'
import { GridCoord, MapProject } from '../../types/map'
import { gridToScreen } from '../../utils/isometric'
import { networkSyncBuffer } from '../../services/networkSync'
import { combatEvents } from '../../services/combatEvents'
import { assetManager } from '../../services/assetManager'
import { getProjectileTheme, renderPixiProjectileHead } from '../../utils/projectileEffectRenderer'
import { getProjectileDef } from '../../utils/projectileCatalog'

export interface CombatSparkParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: number
  alpha: number
  size: number
  life: number
  maxLife: number
  type: 'ice_shard' | 'snowflake' | 'fire_ember' | 'lightning_arc' | 'acid_drop' | 'arcane_star' | 'void_blood' | 'shrapnel' | 'holy_cross' | 'sand_dust' | 'spark_line' | 'default'
  rot: number
  vRot: number
}

export class CombatRenderer {
  public combatGraphics: Graphics
  private combatTrails = new Map<string, { x: number; y: number; alpha: number; size: number }[]>()
  public combatSparks: CombatSparkParticle[] = []

  private activeProjIds = new Set<string>()
  private unsubscribeImpact?: () => void
  private lastTime = 0

  constructor() {
    this.combatGraphics = new Graphics()
    this.combatGraphics.zIndex = 999999

    // Listen to decoupled combat impact events
    this.unsubscribeImpact = combatEvents.onImpact((evt) => {
      const projDef = evt.projectileType ? getProjectileDef(evt.projectileType) : null
      const sparkType = projDef?.sparkType || 'default'
      const cat = projDef?.category || (evt.isSplash ? 'fire' : 'siege')
      const count = evt.count || projDef?.sparkCount || (evt.isSplash ? 20 : 10)
      const baseColor = evt.color ?? projDef?.sparkColorHex ?? 0xfbbf24

      for (let s = 0; s < count; s++) {
        const angle = (Math.PI * 2 * s) / count + (Math.random() - 0.5) * 0.6
        const speed = (cat === 'electro' ? 80 : 35) + Math.random() * (cat === 'fire' || cat === 'frost' ? 95 : 75)
        
        let pType: CombatSparkParticle['type'] = sparkType !== 'default' ? (sparkType as any) : 'default'
        let pColor = baseColor
        let pSize = 1.8 + Math.random() * 2.5
        let pLife = 0.32 + Math.random() * 0.22

        if (pType === 'default') {
          if (cat === 'frost') {
            pType = s % 3 === 0 ? 'snowflake' : 'ice_shard'
            pColor = s % 3 === 0 ? 0xffffff : (s % 2 === 0 ? 0x67e8f9 : 0x38bdf8)
            pSize = 2.2 + Math.random() * 2.8
            pLife = 0.38 + Math.random() * 0.2
          } else if (cat === 'fire') {
            pType = 'fire_ember'
            pColor = s % 4 === 0 ? 0xfef08a : (s % 3 === 0 ? 0xfbbf24 : (s % 2 === 0 ? 0xf97316 : 0xef4444))
            pSize = 2.0 + Math.random() * 3.2
          } else if (cat === 'electro') {
            pType = 'lightning_arc'
            pColor = s % 2 === 0 ? 0x38bdf8 : (s % 3 === 0 ? 0xffffff : 0x60a5fa)
            pSize = 1.5 + Math.random() * 2.0
            pLife = 0.2 + Math.random() * 0.15
          } else if (cat === 'poison') {
            pType = 'acid_drop'
            pColor = s % 3 === 0 ? 0xd9f99d : (s % 2 === 0 ? 0x84cc16 : 0x22c55e)
            pSize = 2.4 + Math.random() * 2.6
          } else if (cat === 'arcane') {
            pType = 'arcane_star'
            pColor = s % 3 === 0 ? 0xffffff : (s % 2 === 0 ? 0xc084fc : 0xa855f7)
            pSize = 2.5 + Math.random() * 3.0
          } else if (cat === 'void') {
            pType = 'void_blood'
            pColor = s % 3 === 0 ? 0x881337 : (s % 2 === 0 ? 0xf43f5e : 0x7c3aed)
            pSize = 2.2 + Math.random() * 2.5
          } else if (cat === 'holy') {
            pType = 'holy_cross'
            pColor = s % 2 === 0 ? 0xffffff : 0xfde047
            pSize = 2.8 + Math.random() * 3.0
          } else if (cat === 'siege') {
            pType = 'shrapnel'
            pColor = s % 3 === 0 ? 0xf59e0b : (s % 2 === 0 ? 0x94a3b8 : 0x64748b)
            pSize = 2.0 + Math.random() * 2.4
          }
        }

        this.combatSparks.push({
          x: evt.x,
          y: evt.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.75,
          color: pColor,
          alpha: 1.0,
          size: pSize,
          life: pLife,
          maxLife: pLife,
          type: pType,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 12,
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
    const hasSparks = this.combatSparks.length > 0

    if (!hasProjectiles && !hasRings && !hasRangePreview && !hasUnits && !hasSparks) {
      this.combatGraphics.clear()
      return
    }

    this.combatGraphics.clear()
    this.combatGraphics.zIndex = 999999

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
          const asset = bp?.assetId ? assetManager.getAssetItem(bp.assetId) : (bp?.assetName ? assetManager.getAssetItem(bp.assetName) : undefined)
          const spanX = bp?.spanX || asset?.spanX || 1
          const assetWidth = asset?.width || (texture.width > 0 ? texture.width : tileWidth)
          const baseScale = (tileWidth * spanX) / (assetWidth || tileWidth)

          const scale = baseScale * (bp?.scale || asset?.scale || 1.0)
          const anchorX = asset?.anchorX ?? bp?.anchorX ?? 0.5
          const anchorY = asset?.anchorY ?? bp?.anchorY ?? 0.88
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

    // 2. Flying Animated Projectiles
    const nowTime = performance.now()
    const dt = this.lastTime > 0 ? Math.min(0.1, (nowTime - this.lastTime) / 1000) : 0.016
    this.lastTime = nowTime
    this.activeProjIds.clear()

    if (hasProjectiles) {
      const isLocal = Boolean(towerStore.projectiles && towerStore.projectiles.length > 0)
      const count = isLocal ? towerStore.projectiles.length : networkSyncBuffer.projectilesPool.length

      for (let i = 0; i < count; i++) {
        const proj = isLocal ? towerStore.projectiles[i] : networkSyncBuffer.projectilesPool[i]
        if (!proj || (proj.active === false && !isLocal)) continue
        this.activeProjIds.add(proj.id)
        const type = proj.projectileType || 'fireball'
        const projDef = getProjectileDef(type)
        const theme = getProjectileTheme(type, proj.color)

        const totalDist =
          proj.totalDistance ||
          Math.hypot(proj.targetX - proj.startX, proj.targetY - proj.startY) ||
          1
        const progress = Math.min(1.0, (proj.traveledDistance || 0) / totalDist)

        const hasArc = theme.isLaser ? false : (projDef.hasArc === false || theme.hasArc === false ? false : Boolean(projDef.hasArc ?? theme.hasArc))
        const arcMaxHeight =
          type === 'arrow'
            ? Math.min(48, totalDist * 0.18)
            : hasArc
            ? Math.min(45, totalDist * 0.16)
            : 0

        const arcHeight = arcMaxHeight > 0 ? Math.sin(progress * Math.PI) * arcMaxHeight : 0

        const dx = proj.targetX - proj.startX
        const dy = proj.targetY - proj.startY
        const len = Math.hypot(dx, dy) || 1
        const perpX = -dy / len
        const perpY = dx / len
        
        let lateralX = 0
        let lateralY = 0
        const projOffsetPerp = (proj as any).offsetPerp ?? 0
        const projPhaseOffset = (proj as any).phaseOffset ?? 0
        const isHelix = projDef.formation === 'twin_helix'

        if (projOffsetPerp !== 0) {
          const swirl = isHelix
            ? Math.sin(progress * Math.PI * 6 + projPhaseOffset) * projOffsetPerp
            : projOffsetPerp
          lateralX = perpX * swirl
          lateralY = perpY * swirl * 0.5
        }

        const renderX = proj.currentX + lateralX
        const renderY = proj.currentY - arcHeight + lateralY

        const vx = dx
        const vy = dy - (arcMaxHeight > 0 ? Math.cos(progress * Math.PI) * Math.PI * arcMaxHeight : 0)
        const angle = Math.atan2(vy, vx)

        const trailStyle = projDef.trailStyle || (projDef.shape === 'arrow' || projDef.shape === 'feather' ? 'particles' : 'solid_line')
        const trailColor = projDef.trailColorHex ?? theme.trailColorHex ?? 0xfbbf24
        const trailAlpha = projDef.trailAlpha ?? theme.trailAlpha ?? 0.8
        const trailWidth = projDef.trailWidth ?? 4
        const isFireProj = projDef.category === 'fire' || type.includes('flame') || type.includes('fire')

        this.activeProjIds.add(proj.id)

        let trail = this.combatTrails.get(proj.id)
        if (!trail) {
          trail = []
          this.combatTrails.set(proj.id, trail)
        }
        trail.push({ x: renderX, y: renderY, alpha: 1.0, size: trailWidth })
        const maxTrailLen = Math.max(3, projDef.trailLength ?? 8)
        if (trail.length > maxTrailLen) trail.shift()

        // Render Trail according to user preference (strictly respecting style)
        if (trailStyle !== 'none' && !projDef.isLaser && !projDef.isInstant && projDef.shape !== 'instant_strike') {
          if (trailStyle === 'particles') {
            for (let t = 0; t < trail.length; t++) {
              const pt = trail[t]
              const frac = (t + 1) / trail.length
              const trailRadius = frac * Math.max(1.0, trailWidth * 0.75)
              this.combatGraphics
                .circle(pt.x, pt.y, Math.max(0.8, trailRadius))
                .fill({ color: trailColor, alpha: frac * trailAlpha })
            }
          } else if (trailStyle === 'glow_streak') {
            if (trail.length >= 2) {
              this.combatGraphics.moveTo(trail[0].x, trail[0].y)
              for (let t = 1; t < trail.length; t++) {
                this.combatGraphics.lineTo(trail[t].x, trail[t].y)
              }
              this.combatGraphics.stroke({
                width: Math.max(1.5, trailWidth * 2.2),
                color: trailColor,
                alpha: trailAlpha * 0.35,
                cap: 'round',
                join: 'round',
              })

              this.combatGraphics.moveTo(trail[0].x, trail[0].y)
              for (let t = 1; t < trail.length; t++) {
                this.combatGraphics.lineTo(trail[t].x, trail[t].y)
              }
              this.combatGraphics.stroke({
                width: Math.max(1.0, trailWidth),
                color: trailColor,
                alpha: trailAlpha * 0.95,
                cap: 'round',
                join: 'round',
              })
            }
          } else if (trailStyle === 'solid_line') {
            if (trail.length >= 2) {
              if (isFireProj) {
                // Layer 1: Outer Crimson Combustion Heat Shimmer
                this.combatGraphics.moveTo(trail[0].x, trail[0].y)
                for (let t = 1; t < trail.length; t++) {
                  this.combatGraphics.lineTo(trail[t].x, trail[t].y)
                }
                this.combatGraphics.stroke({
                  width: Math.max(2.0, trailWidth * 2.8),
                  color: 0xdc2626,
                  alpha: trailAlpha * 0.35,
                  cap: 'round',
                  join: 'round',
                })

                // Layer 2: Mid Roaring Orange Flame Body
                this.combatGraphics.moveTo(trail[0].x, trail[0].y)
                for (let t = 1; t < trail.length; t++) {
                  this.combatGraphics.lineTo(trail[t].x, trail[t].y)
                }
                this.combatGraphics.stroke({
                  width: Math.max(1.5, trailWidth * 1.6),
                  color: 0xf97316,
                  alpha: trailAlpha * 0.75,
                  cap: 'round',
                  join: 'round',
                })

                // Layer 3: Blazing Golden-Yellow Incandescent Core
                this.combatGraphics.moveTo(trail[0].x, trail[0].y)
                for (let t = 1; t < trail.length; t++) {
                  this.combatGraphics.lineTo(trail[t].x, trail[t].y)
                }
                this.combatGraphics.stroke({
                  width: Math.max(1.0, trailWidth * 0.8),
                  color: trailColor,
                  alpha: trailAlpha * 0.95,
                  cap: 'round',
                  join: 'round',
                })

                // Layer 4: Floating Micro-Embers along trail path
                for (let t = 0; t < trail.length - 1; t += 2) {
                  const pt = trail[t]
                  const eJitterX = Math.sin(nowTime * 0.01 + t * 4) * 2.0
                  const eJitterY = Math.cos(nowTime * 0.01 + t * 4) * 2.0
                  const eFrac = (t + 1) / trail.length
                  this.combatGraphics
                    .circle(pt.x + eJitterX, pt.y + eJitterY, Math.max(1.0, 2.0 * eFrac))
                    .fill({ color: t % 4 === 0 ? 0xffffff : 0xfef08a, alpha: eFrac * 0.9 })
                }
              } else {
                this.combatGraphics.moveTo(trail[0].x, trail[0].y)
                for (let t = 1; t < trail.length; t++) {
                  this.combatGraphics.lineTo(trail[t].x, trail[t].y)
                }
                this.combatGraphics.stroke({
                  width: Math.max(1.0, trailWidth),
                  color: trailColor,
                  alpha: trailAlpha,
                  cap: 'round',
                  join: 'round',
                })
              }
            }
          }
        }

        // Render projectile head
        renderPixiProjectileHead(
          this.combatGraphics,
          type,
          renderX,
          renderY,
          angle,
          proj.startX,
          proj.startY,
          nowTime,
          projDef
        )
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
        sp.x += sp.vx * dt
        sp.y += sp.vy * dt
        sp.rot += (sp.vRot || 0) * dt
        sp.life -= dt
        sp.alpha = Math.max(0, sp.life / (sp.maxLife || 0.45))

        if (sp.alpha > 0) {
          if (sp.type === 'fire_ember') {
            sp.vy -= 120 * dt // Buoyant rising fire embers
            this.combatGraphics.circle(sp.x, sp.y, sp.size * (sp.alpha * 0.8 + 0.2)).fill({ color: sp.color, alpha: sp.alpha })
            this.combatGraphics.circle(sp.x, sp.y, sp.size * 0.4).fill({ color: 0xffffff, alpha: sp.alpha })
          } else if (sp.type === 'ice_shard') {
            const cosR = Math.cos(sp.rot)
            const sinR = Math.sin(sp.rot)
            const s = sp.size
            this.combatGraphics.poly([
              { x: sp.x + cosR * s * 1.5, y: sp.y + sinR * s * 1.5 },
              { x: sp.x - sinR * s * 0.6, y: sp.y + cosR * s * 0.6 },
              { x: sp.x - cosR * s * 1.5, y: sp.y - sinR * s * 1.5 },
              { x: sp.x + sinR * s * 0.6, y: sp.y - cosR * s * 0.6 },
            ]).fill({ color: sp.color, alpha: sp.alpha }).stroke({ width: 0.8, color: 0xffffff, alpha: sp.alpha * 0.8 })
          } else if (sp.type === 'snowflake') {
            const s = sp.size * 1.2
            for (let spoke = 0; spoke < 3; spoke++) {
              const ang = sp.rot + (spoke * Math.PI) / 3
              const dx = Math.cos(ang) * s
              const dy = Math.sin(ang) * s
              this.combatGraphics.moveTo(sp.x - dx, sp.y - dy).lineTo(sp.x + dx, sp.y + dy).stroke({ width: 1.2, color: sp.color, alpha: sp.alpha })
            }
          } else if (sp.type === 'lightning_arc') {
            const lx = sp.x + sp.vx * dt * 3
            const ly = sp.y + sp.vy * dt * 3
            this.combatGraphics.moveTo(sp.x, sp.y).lineTo(lx, ly).stroke({ width: 1.8, color: sp.color, alpha: sp.alpha })
            this.combatGraphics.circle(sp.x, sp.y, 1.2).fill({ color: 0xffffff, alpha: sp.alpha })
          } else if (sp.type === 'acid_drop') {
            this.combatGraphics.circle(sp.x, sp.y, sp.size).fill({ color: sp.color, alpha: sp.alpha * 0.85 })
            this.combatGraphics.circle(sp.x, sp.y, sp.size * 1.5).stroke({ width: 1.0, color: 0xa3e635, alpha: sp.alpha * 0.4 })
          } else if (sp.type === 'arcane_star' || sp.type === 'holy_cross') {
            const s = sp.size * 1.3
            const cosR = Math.cos(sp.rot)
            const sinR = Math.sin(sp.rot)
            this.combatGraphics.moveTo(sp.x - cosR * s, sp.y - sinR * s).lineTo(sp.x + cosR * s, sp.y + sinR * s).stroke({ width: 1.5, color: sp.color, alpha: sp.alpha })
            this.combatGraphics.moveTo(sp.x + sinR * s, sp.y - cosR * s).lineTo(sp.x - sinR * s, sp.y + cosR * s).stroke({ width: 1.5, color: sp.color, alpha: sp.alpha })
            this.combatGraphics.circle(sp.x, sp.y, s * 0.35).fill({ color: 0xffffff, alpha: sp.alpha })
          } else if (sp.type === 'sand_dust') {
            sp.vy += 35 * dt
            this.combatGraphics.circle(sp.x, sp.y, Math.max(0.8, sp.size * 0.8)).fill({ color: sp.color, alpha: sp.alpha * 0.9 })
          } else if (sp.type === 'spark_line') {
            const s = sp.size * 1.5
            const cosR = Math.cos(sp.rot)
            const sinR = Math.sin(sp.rot)
            this.combatGraphics.moveTo(sp.x - cosR * s, sp.y - sinR * s).lineTo(sp.x + cosR * s, sp.y + sinR * s).stroke({ width: 1.5, color: sp.color, alpha: sp.alpha })
            this.combatGraphics.circle(sp.x, sp.y, 1.0).fill({ color: 0xffffff, alpha: sp.alpha })
          } else {
            this.combatGraphics.circle(sp.x, sp.y, sp.size).fill({ color: sp.color, alpha: sp.alpha })
          }
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
    try {
      if (this.combatGraphics && !this.combatGraphics.destroyed) {
        this.combatGraphics.clear()
      }
      this.combatTrails.clear()
      this.combatSparks = []
    } catch (e) {
      console.warn('[CombatRenderer] clear caught:', e)
    }
  }

  public destroy(): void {
    try {
      if (this.unsubscribeImpact) {
        this.unsubscribeImpact()
      }
      this.clear()
      if (this.combatGraphics && !this.combatGraphics.destroyed) {
        this.combatGraphics.destroy()
      }
    } catch (e) {
      console.warn('[CombatRenderer] destroy caught:', e)
    }
  }
}
