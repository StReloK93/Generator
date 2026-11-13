import { Container, Graphics, Sprite, Texture, ImageSource } from 'pixi.js'
import { assetManager } from '../../services/assetManager'
import { gridToScreen } from '../../utils/isometric'
import type { TowerBlueprint } from '../../types/tower'

const TOWER_SPRITE = 'tower-sprite'
const OWNER_MARK = 'tower-owner-mark'

export class TowerRenderer {
  public towerTextures = new Map<string, Texture>()
  public towerContainerMap = new Map<string, Container>()
  private loadingPromises = new Map<string, Promise<Texture | null>>()
  public fallbackTextureCache?: Map<string, Texture>

  public getBlueprintTexture(bp: TowerBlueprint | undefined): Texture | null {
    if (!bp?.asset) return null
    const assetName = bp.asset.assetName || ''
    const baseName = assetName.replace(/\.[^/.]+$/, '')
    const assetPath = bp.asset.assetPath || ''
    const assetId = bp.asset.assetId || ''

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
        parentLayersContainer.addChild(container)
        this.towerContainerMap.set(tower.id, container)
      }

      container.visible = true
      let sprite = container.getChildByLabel(TOWER_SPRITE) as Sprite | null
      // The owner's mark lies on the ground under the tower
      let selection = container.getChildByLabel(OWNER_MARK) as Graphics | null

      if (!sprite || sprite.destroyed) {
        sprite = new Sprite({ label: TOWER_SPRITE })
        sprite.zIndex = 1
        container.addChild(sprite)
      }

      if (!selection || selection.destroyed) {
        selection = new Graphics({ label: OWNER_MARK })
        selection.zIndex = 0
        container.addChild(selection)
        ;(container as any)._wasSelected = undefined
      }

      const bp = blueprints?.find((b: any) => b.id === tower.blueprintId)
      const texture = this.getBlueprintTexture(bp)

      if (texture && sprite) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        const bpAsset = bp?.asset
        const asset = bpAsset?.assetId ? assetManager.getAssetItem(bpAsset.assetId) : (bpAsset?.assetName ? assetManager.getAssetItem(bpAsset.assetName) : undefined)
        const spanX = (tower as any).spanX || bpAsset?.spanX || asset?.spanX || 1
        const assetWidth = asset?.width || (texture.width > 0 ? texture.width : tileWidth)
        const baseScale = (tileWidth * spanX) / (assetWidth || tileWidth)

        const scale = baseScale * (bpAsset?.scale || asset?.scale || 1.0) * ((tower as any).scale || 1.0)
        const anchorX = (tower as any).anchorX !== undefined ? (tower as any).anchorX : (asset?.anchorX ?? bpAsset?.anchorX ?? 0.5)
        const anchorY = (tower as any).anchorY !== undefined ? (tower as any).anchorY : (asset?.anchorY ?? bpAsset?.anchorY ?? 0.88)
        
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
        if (selection && !(selection as any).destroyed && typeof selection.clear === 'function') {
          selection.clear()
          const colHex = parseInt(builderColor.replace('#', '0x'), 16) || 0x38bdf8

          // A soft shadow in the owner's colour on the ground under the tower (the tower stands over it, so it reads
          // as the tower's shade, not as a ring drawn on top); brighter with a fine rim while selected
          selection
            .ellipse(0, 0, tileWidth * 0.36, tileHeight * 0.36)
            .fill({ color: 0x000000, alpha: 0.28 })
            .ellipse(0, 0, tileWidth * 0.3, tileHeight * 0.3)
            .fill({ color: colHex, alpha: isSelected ? 0.6 : 0.38 })
          if (isSelected) {
            selection
              .ellipse(0, 0, tileWidth * 0.38, tileHeight * 0.38)
              .stroke({ width: 2, color: 0xffffff, alpha: 0.85 })
          }
        }

        ;(container as any)._wasSelected = isSelected
        ;(container as any)._wasBuilderColor = builderColor
        ;(container as any)._wasLevel = tower.level
      }

      const pos = gridToScreen(tower.col, tower.row, tileWidth, tileHeight)
      container.position.set(pos.x, pos.y)
      const towerSpanX = (tower as any).spanX || 1
      const towerSpanY = (tower as any).spanY || 1
      const effectiveTowerDepth = tower.col + towerSpanX - 1 + (tower.row + towerSpanY - 1)
      container.zIndex = 100000 + effectiveTowerDepth * 1000 + 350
    }
  }

  public clear(parentLayersContainer?: Container): void {
    try {
      for (const container of this.towerContainerMap.values()) {
        if (parentLayersContainer && !parentLayersContainer.destroyed && container.parent === parentLayersContainer) {
          parentLayersContainer.removeChild(container)
        }
        if (container && !container.destroyed) {
          container.destroy({ children: true })
        }
      }
      this.towerContainerMap.clear()
    } catch (e) {
      console.warn('[TowerRenderer] clear caught:', e)
    }
  }

  public destroy(parentLayersContainer?: Container): void {
    this.clear(parentLayersContainer)
    this.towerTextures.clear()
    this.loadingPromises.clear()
  }
}
