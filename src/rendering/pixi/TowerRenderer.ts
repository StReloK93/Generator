import { Container, Graphics, Sprite, Texture, ImageSource } from 'pixi.js'
import { assetManager } from '../../services/assetManager'

export class TowerRenderer {
  public towerTextures = new Map<string, Texture>()
  public towerContainerMap = new Map<string, Container>()
  private loadingPromises = new Map<string, Promise<Texture | null>>()
  public fallbackTextureCache?: Map<string, Texture>

  public getBlueprintTexture(bp: any): Texture | null {
    if (!bp) return null
    const assetName = bp.assetName || ''
    const baseName = assetName.replace(/\.[^/.]+$/, '')
    const assetPath = bp.assetPath || ''
    const assetId = bp.assetId || ''

    let texture: Texture | null =
      (assetId ? assetManager.getTexture(assetId) : null) ||
      (assetName ? assetManager.getTexture(assetName) : null) ||
      (baseName ? assetManager.getTexture(baseName) : null) ||
      (baseName ? assetManager.getTexture(`sprite-${baseName}`) : null) ||
      (assetName ? this.towerTextures.get(assetName) : null) ||
      (baseName ? this.towerTextures.get(baseName) : null) ||
      (assetPath ? this.towerTextures.get(assetPath) : null) ||
      (this.fallbackTextureCache && assetId ? this.fallbackTextureCache.get(assetId) : null) ||
      (this.fallbackTextureCache && baseName
        ? this.fallbackTextureCache.get(`sprite-${baseName}`)
        : null) ||
      (this.fallbackTextureCache && baseName ? this.fallbackTextureCache.get(baseName) : null) ||
      (this.fallbackTextureCache && assetName ? this.fallbackTextureCache.get(assetName) : null) ||
      null

    if (!texture && assetPath && !this.loadingPromises.has(assetPath)) {
      const promise = new Promise<Texture | null>((resolve) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const source = new ImageSource({ resource: img })
            const tex = new Texture({ source })
            if (assetName) this.towerTextures.set(assetName, tex)
            if (baseName) this.towerTextures.set(baseName, tex)
            this.towerTextures.set(assetPath, tex)
            if (this.fallbackTextureCache) {
              this.fallbackTextureCache.set(assetPath, tex)
              if (assetId) this.fallbackTextureCache.set(assetId, tex)
            }
            resolve(tex)
          } catch {
            resolve(null)
          }
        }
        img.onerror = () => resolve(null)
        img.src = assetPath
      })
      this.loadingPromises.set(assetPath, promise)
    }

    if (!texture) {
      texture = this.towerTextures.values().next().value || null
    }

    return texture
  }

  public syncTowers(
    placedTowers: any[],
    blueprints: any[],
    selectedPlacedTowerId: string | null,
    parentLayersContainer: Container,
    tileWidth: number,
    tileHeight: number
  ): void {
    const activeTowerIds = new Set(placedTowers.map((t) => t.id))

    // 1. Remove deleted towers
    for (const [id, container] of this.towerContainerMap.entries()) {
      if (!activeTowerIds.has(id)) {
        parentLayersContainer.removeChild(container)
        container.destroy({ children: true })
        this.towerContainerMap.delete(id)
      }
    }

    // 2. Render each placed tower
    for (const tower of placedTowers) {
      let container = this.towerContainerMap.get(tower.id)
      if (!container) {
        container = new Container()
        container.sortableChildren = true

        const shadow = new Graphics()
        shadow.zIndex = 0
        shadow.visible = false

        const sprite = new Sprite()
        sprite.zIndex = 1

        const selection = new Graphics()
        selection.zIndex = 2

        container.addChild(shadow)
        container.addChild(sprite)
        container.addChild(selection)

        parentLayersContainer.addChild(container)
        this.towerContainerMap.set(tower.id, container)
      }

      container.visible = true
      const sprite = container.getChildAt(1) as Sprite
      const selection = container.getChildAt(2) as Graphics

      const bp = blueprints?.find((b: any) => b.id === tower.blueprintId)
      const texture = this.getBlueprintTexture(bp)

      if (texture) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        const asset = bp?.assetId ? assetManager.getAssetItem(bp.assetId) : (bp?.assetName ? assetManager.getAssetItem(bp.assetName) : undefined)
        const scale = (bp?.scale || asset?.scale || 1.0) * ((tower as any).scale || 1.0)
        const anchorX = (tower as any).anchorX !== undefined ? (tower as any).anchorX : (asset?.anchorX ?? bp?.anchorX ?? 0.5)
        const anchorY = (tower as any).anchorY !== undefined ? (tower as any).anchorY : (asset?.anchorY ?? bp?.anchorY ?? 0.88)
        
        sprite.scale.set(scale)
        sprite.anchor.set(anchorX, anchorY)
        sprite.position.set(0, 0)
      }

      const isSelected = selectedPlacedTowerId === tower.id
      const builderColor = tower.builderColor || '#38bdf8'
      const wasSelected = (container as any)._wasSelected
      const wasBuilderColor = (container as any)._wasBuilderColor
      const wasLevel = (container as any)._wasLevel

      if (
        isSelected !== wasSelected ||
        wasBuilderColor !== builderColor ||
        wasLevel !== tower.level
      ) {
        selection.clear()
        const colHex = parseInt(builderColor.replace('#', '0x'), 16) || 0x38bdf8

        // Base Ring under tower
        if (isSelected) {
          selection
            .ellipse(0, 0, tileWidth * 0.4, tileHeight * 0.4)
            .fill({ color: colHex, alpha: 0.2 })
            .stroke({ width: 3, color: 0x38bdf8, alpha: 0.95 })
        } else {
          selection
            .ellipse(0, 0, tileWidth * 0.34, tileHeight * 0.34)
            .fill({ color: colHex, alpha: 0.12 })
            .stroke({ width: 2.2, color: colHex, alpha: 0.85 })
        }

        // Overhead Builder Gem Badge
        const topY = -tileHeight * 1.32
        selection
          .poly([
            { x: 0, y: topY - 10 },
            { x: 8, y: topY },
            { x: 0, y: topY + 10 },
            { x: -8, y: topY },
          ])
          .fill({ color: colHex, alpha: 0.95 })
          .stroke({ width: 1.8, color: 0xffffff, alpha: 0.95 })

        selection.circle(0, topY, 3).fill({ color: 0xffffff, alpha: 0.9 })

        ;(container as any)._wasSelected = isSelected
        ;(container as any)._wasBuilderColor = builderColor
        ;(container as any)._wasLevel = tower.level
      }

      container.position.set(tower.screenX, tower.screenY)
      const towerSpanX = (tower as any).spanX || 1
      const towerSpanY = (tower as any).spanY || 1
      const effectiveTowerDepth = tower.col + towerSpanX - 1 + (tower.row + towerSpanY - 1)
      container.zIndex = 100000 + effectiveTowerDepth * 1000 + 350
    }
  }

  public clear(parentLayersContainer?: Container): void {
    for (const container of this.towerContainerMap.values()) {
      if (parentLayersContainer) {
        parentLayersContainer.removeChild(container)
      }
      container.destroy({ children: true })
    }
    this.towerContainerMap.clear()
  }

  public destroy(parentLayersContainer?: Container): void {
    this.clear(parentLayersContainer)
    this.towerTextures.clear()
    this.loadingPromises.clear()
  }
}
