import { Container, Graphics, Sprite, ColorMatrixFilter } from 'pixi.js'
import { MapProject } from '../../types/map'
import { gridToScreen } from '../../utils/isometric'
import { assetManager } from '../../services/assetManager'
import characterManifest from '../../assets/generated/characterManifest.json'
import { useHeroStore } from '../../stores/heroStore'

export class HeroRenderer {
  public container: Container
  public silhouetteContainer: Container
  private sprite: Sprite
  private silhouetteSprite: Sprite
  private selectionRing: Graphics
  private targetMarkerGraphics: Graphics

  constructor() {
    this.container = new Container()
    this.container.sortableChildren = true

    // Top overlay container for X-Ray Silhouette & Selection Ring (always renders over front walls)
    this.silhouetteContainer = new Container()
    this.silhouetteContainer.zIndex = 999999
    this.silhouetteContainer.sortableChildren = true

    this.selectionRing = new Graphics()
    this.selectionRing.zIndex = 1

    this.silhouetteSprite = new Sprite()
    this.silhouetteSprite.zIndex = 2
    
    // Pure Luminous White X-Ray Filter: drives RGB to solid white while preserving frame silhouette
    const whiteFilter = new ColorMatrixFilter()
    whiteFilter.brightness(10, false)
    this.silhouetteSprite.filters = [whiteFilter]
    this.silhouetteSprite.alpha = 0.85

    this.sprite = new Sprite()
    this.sprite.zIndex = 2

    this.targetMarkerGraphics = new Graphics()
    this.targetMarkerGraphics.zIndex = 3

    this.container.addChild(this.sprite)
    this.container.addChild(this.targetMarkerGraphics)

    // Selection ring & silhouette sprite sit on top silhouette container
    this.silhouetteContainer.addChild(this.selectionRing)
    this.silhouetteContainer.addChild(this.silhouetteSprite)
  }

  public renderHero(
    heroStore: ReturnType<typeof useHeroStore>,
    project: MapProject,
    parentLayersContainer: Container
  ): void {
    if (!heroStore.isEnabled) {
      this.container.visible = false
      this.silhouetteContainer.visible = false
      return
    }

    if (this.container.parent !== parentLayersContainer) {
      parentLayersContainer.addChild(this.container)
    }
    if (this.silhouetteContainer.parent !== parentLayersContainer) {
      parentLayersContainer.addChild(this.silhouetteContainer)
    }

    this.container.visible = true
    this.silhouetteContainer.visible = true
    const { tileWidth, tileHeight } = project
    const hero = heroStore.hero

    // 1. Position on Isometric Screen
    const screenPos = gridToScreen(hero.currentCol, hero.currentRow, tileWidth, tileHeight)
    this.container.position.set(screenPos.x, screenPos.y)
    this.silhouetteContainer.position.set(screenPos.x, screenPos.y)

    // Dynamic isometric z-index sorting (entity plane 100000+)
    const depth = 100000 + Math.round((hero.currentCol + hero.currentRow) * 1000) + 500
    this.container.zIndex = depth

    // 2. Texture & Animation
    const texture = assetManager.getCharacterTexture(
      hero.direction,
      hero.action,
      hero.action === 'Idle' ? '0' : hero.frameIndex,
      hero.model
    )

    if (texture) {
      if (this.sprite.texture !== texture) {
        this.sprite.texture = texture
      }
      this.sprite.visible = true

      const modelKey = String(hero.model).toLowerCase()
      const modelMeta = (characterManifest as any)?.[modelKey]
      const anchorX = modelMeta?.anchorX ?? 0.5
      const anchorY = modelMeta?.anchorY ?? 0.898
      const cellW = modelMeta?.cellWidth || 256

      const baseScale = (tileWidth * 1.0) / cellW
      const scaleMult = modelMeta?.scale ?? 1.0
      const heroCustomScale = (hero.scale || 1.15)
      const finalScale = baseScale * scaleMult * heroCustomScale

      this.sprite.scale.set(finalScale)
      this.sprite.anchor.set(anchorX, anchorY)

      // Devor to'silishi (Occlusion) qoidasi:
      // Faqat galochka qo'yilgan (isFrontWall === true yoki depthOffset > 0) devorlar qahramonni to'sadi (X-Ray oq rangga bo'yadi).
      // Galochka qo'yilmagan oddiy devorlar qahramonni hech qachon to'smaydi va oqarmaydi.
      let isBehindWall = false
      const hColFloor = Math.floor(hero.currentCol)
      const hRowFloor = Math.floor(hero.currentRow)

      if (project.layers && Array.isArray(project.layers)) {
        for (let lIdx = 0; lIdx < project.layers.length; lIdx++) {
          const layer = project.layers[lIdx]
          if (!layer.visible || !layer.tiles) continue

          const isGround =
            layer.id === 'layer-ground' ||
            lIdx === 0 ||
            layer.name.toLowerCase().includes('ground') ||
            layer.name.toLowerCase().includes('yer')

          if (isGround) continue

          for (const [key, items] of Object.entries(layer.tiles)) {
            const [wCol, wRow] = key.split(',').map(Number)
            const itemArr = Array.isArray(items) ? items : [items]
            if (!itemArr || itemArr.length === 0) continue

            for (const item of itemArr) {
              if (!item) continue
              const isFront = item.isFrontWall === true || (item.depthOffset !== undefined && item.depthOffset > 0)
              if (!isFront) continue

              const spanX = item.spanX || 1
              const spanY = item.spanY || 1

              if (hColFloor >= wCol && hColFloor < wCol + spanX && hRowFloor >= wRow && hRowFloor < wRow + spanY) {
                isBehindWall = true
                break
              }
            }
            if (isBehindWall) break
          }
          if (isBehindWall) break
        }
      }

      if (isBehindWall) {
        if (this.silhouetteSprite.texture !== texture) {
          this.silhouetteSprite.texture = texture
        }
        this.silhouetteSprite.scale.set(finalScale)
        this.silhouetteSprite.anchor.set(anchorX, anchorY)
        this.silhouetteSprite.visible = true
      } else {
        this.silhouetteSprite.visible = false
      }
    } else {
      this.sprite.visible = false
      this.silhouetteSprite.visible = false
    }

    // 3. Selection Ring (Cyan / Emerald Glow under feet - always rendered on top overlay)
    this.selectionRing.clear()
    if (heroStore.isSelected) {
      const time = performance.now() * 0.003
      const pulseAlpha = 0.5 + Math.sin(time * 3) * 0.25
      const rx = tileWidth * 0.28
      const ry = tileHeight * 0.28

      // Outer glow ellipse
      this.selectionRing.ellipse(0, 0, rx * 1.15, ry * 1.15)
      this.selectionRing.stroke({ width: 2, color: 0x38bdf8, alpha: pulseAlpha * 0.6 })

      // Inner sharp ellipse
      this.selectionRing.ellipse(0, 0, rx, ry)
      this.selectionRing.stroke({ width: 2.5, color: 0x10b981, alpha: 0.95 })
      this.selectionRing.fill({ color: 0x10b981, alpha: 0.15 })

      // Hero indicator diamond pointer
      this.selectionRing.moveTo(0, -ry - 8)
      this.selectionRing.lineTo(4, -ry - 14)
      this.selectionRing.lineTo(-4, -ry - 14)
      this.selectionRing.closePath()
      this.selectionRing.fill({ color: 0x10b981, alpha: 0.9 })
    }

    // 4. Target Destination Ripple Marker
    this.targetMarkerGraphics.clear()
    if (heroStore.targetMarker) {
      const tm = heroStore.targetMarker
      const targetScreen = gridToScreen(tm.col, tm.row, tileWidth, tileHeight)
      // Relative offset from current hero container
      const relX = targetScreen.x - screenPos.x
      const relY = targetScreen.y - screenPos.y

      const progress = tm.timer / tm.maxDuration
      const ringAlpha = Math.max(0, 1.0 - progress)
      const ringRadius = 12 + progress * 24

      // Target isometric ground circle
      this.targetMarkerGraphics.ellipse(relX, relY, ringRadius * 1.2, ringRadius * 0.6)
      this.targetMarkerGraphics.stroke({ width: 2.5, color: 0x22c55e, alpha: ringAlpha })

      // Target center point
      this.targetMarkerGraphics.circle(relX, relY, 4)
      this.targetMarkerGraphics.fill({ color: 0x4ade80, alpha: ringAlpha * 0.9 })
    }
  }

  public clear(): void {
    this.container.visible = false
    this.silhouetteContainer.visible = false
    this.selectionRing.clear()
    this.targetMarkerGraphics.clear()
  }

  public destroy(): void {
    try {
      this.clear()
      if (this.container && !this.container.destroyed) {
        this.container.destroy({ children: true })
      }
      if (this.silhouetteContainer && !this.silhouetteContainer.destroyed) {
        this.silhouetteContainer.destroy({ children: true })
      }
    } catch (e) {
      console.warn('[HeroRenderer] destroy caught:', e)
    }
  }
}
