import { Container, Sprite, Texture, ImageSource } from 'pixi.js'
import { MapProject, AssetItem } from '../../types/map'
import { assetManager } from '../../services/assetManager'
import { getFootprintBaseCenter } from '../../utils/isometric'

export class MapRenderer {
  public layersContainer: Container
  private layerSpriteMaps = new Map<string, Map<string, Sprite>>()
  private textureCache = new Map<string, Texture>()
  private loadingPromises = new Map<string, Promise<Texture | null>>()
  public onTextureLoaded?: (assetId: string, texture: Texture) => void

  constructor() {
    this.layersContainer = new Container()
    this.layersContainer.sortableChildren = true
  }

  public async preloadAssetsBatch(
    assets: AssetItem[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    if (!assets || assets.length === 0) {
      if (onProgress) onProgress(1, 1)
      return
    }

    const uniqueAssets: AssetItem[] = []
    const seen = new Set<string>()
    for (const a of assets) {
      if (a && a.id && a.src && !seen.has(a.id)) {
        seen.add(a.id)
        uniqueAssets.push(a)
      }
    }

    const total = uniqueAssets.length
    let loaded = 0

    if (total === 0) {
      if (onProgress) onProgress(1, 1)
      return
    }

    for (const asset of uniqueAssets) {
      if (this.textureCache.has(asset.id)) {
        loaded++
        if (onProgress) onProgress(loaded, total)
        continue
      }

      await this.preloadAsset(asset)
      loaded++
      if (onProgress) onProgress(loaded, total)
    }
  }

  public async preloadAsset(asset: AssetItem): Promise<Texture | null> {
    if (!asset || !asset.src) return null

    if (this.textureCache.has(asset.id)) {
      return this.textureCache.get(asset.id)!
    }

    const clean = asset.id.replace(/^sprite-/, '')
    if (this.textureCache.has(clean)) {
      return this.textureCache.get(clean)!
    }

    const atlasTex = assetManager.getTexture(asset.id) || assetManager.getTexture(clean)
    if (atlasTex) {
      this.textureCache.set(asset.id, atlasTex)
      this.textureCache.set(clean, atlasTex)
      return atlasTex
    }

    if (this.loadingPromises.has(asset.id)) {
      return this.loadingPromises.get(asset.id)!
    }

    const loadPromise = new Promise<Texture | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        try {
          const source = new ImageSource({ resource: img })
          const texture = new Texture({ source })
          this.textureCache.set(asset.id, texture)
          this.textureCache.set(clean, texture)

          if (this.onTextureLoaded) {
            this.onTextureLoaded(asset.id, texture)
          }

          resolve(texture)
        } catch (err) {
          console.error(`[MapRenderer] Error creating texture for asset ${asset.id}:`, err)
          resolve(null)
        }
      }

      img.onerror = (err) => {
        console.warn(`[MapRenderer] Failed to load asset image: ${asset.id} (${asset.name})`, err)
        resolve(null)
      }

      img.src = asset.src
    })

    this.loadingPromises.set(asset.id, loadPromise)
    return loadPromise
  }

  public getTexture(asset: AssetItem): Texture | null {
    if (!asset) return null

    if (this.textureCache.has(asset.id)) {
      return this.textureCache.get(asset.id)!
    }

    const clean = asset.id.replace(/^sprite-/, '')
    if (this.textureCache.has(clean)) {
      return this.textureCache.get(clean)!
    }

    const atlasTex = assetManager.getTexture(asset.id) || assetManager.getTexture(clean)
    if (atlasTex) {
      this.textureCache.set(asset.id, atlasTex)
      this.textureCache.set(clean, atlasTex)
      return atlasTex
    }

    if (asset.src) {
      this.preloadAsset(asset)
    }

    return null
  }

  public registerTexture(key: string, texture: Texture): void {
    this.textureCache.set(key, texture)
  }

  public getRawTextureCache(): Map<string, Texture> {
    return this.textureCache
  }

  public syncLayers(project: MapProject, assetMap: Map<string, AssetItem>): void {
    const activeLayerIds = new Set(project.layers.map((l) => l.id))

    // 1. Clean up removed layers
    for (const [layerId, spriteMap] of this.layerSpriteMaps.entries()) {
      if (!activeLayerIds.has(layerId)) {
        for (const sprite of spriteMap.values()) {
          sprite.destroy()
        }
        spriteMap.clear()
        this.layerSpriteMaps.delete(layerId)
      }
    }

    // 2. Sync each layer's sprites
    for (let layerIdx = 0; layerIdx < project.layers.length; layerIdx++) {
      const layer = project.layers[layerIdx]
      let spriteMap = this.layerSpriteMaps.get(layer.id)
      if (!spriteMap) {
        spriteMap = new Map<string, Sprite>()
        this.layerSpriteMaps.set(layer.id, spriteMap)
      }

      const currentItemIds = new Set<string>()
      for (const items of Object.values(layer.tiles)) {
        const itemArr = Array.isArray(items) ? items : [items]
        for (const item of itemArr) {
          if (item && item.id) {
            currentItemIds.add(item.id)
          }
        }
      }

      // Remove orphaned sprites
      for (const [itemId, sprite] of spriteMap.entries()) {
        if (!currentItemIds.has(itemId)) {
          this.layersContainer.removeChild(sprite)
          sprite.destroy()
          spriteMap.delete(itemId)
        }
      }

      const isGround =
        layer.id === 'layer-ground' ||
        layerIdx === 0 ||
        layer.name.toLowerCase().includes('ground') ||
        layer.name.toLowerCase().includes('yer')

      for (const [cellKeyStr, items] of Object.entries(layer.tiles)) {
        const [col, row] = cellKeyStr.split(',').map(Number)
        const itemArr = Array.isArray(items) ? items : [items]

        for (const item of itemArr) {
          if (!item) continue
          let asset = assetMap.get(item.assetId)
          if (!asset && item.assetId) {
            const cleanId = item.assetId.replace(/^sprite-/, '')
            asset = assetMap.get(cleanId) || assetMap.get(`sprite-${cleanId}`)
          }
          if (!asset) continue

          const texture = this.getTexture(asset)
          if (!texture) continue

          let sprite = spriteMap.get(item.id)
          if (!sprite) {
            sprite = new Sprite(texture)
            spriteMap.set(item.id, sprite)
            this.layersContainer.addChild(sprite)
          } else {
            if (sprite.texture !== texture) {
              sprite.texture = texture
            }
          }

          const posX = item.x !== undefined ? item.x : col
          const posY = item.y !== undefined ? item.y : row
          const spanX = item.spanX || asset.spanX || 1
          const spanY = item.spanY || asset.spanY || 1

          // Strict 1-tile width auto-fitting: image width always matches tileWidth * spanX
          const baseScale = (project.tileWidth * spanX) / (asset.width || project.tileWidth)
          const scale = baseScale * (item.scale || 1.0) * (asset.scale || 1.0)

          const baseCenter = getFootprintBaseCenter(posX, posY, spanX, spanY, project.tileWidth, project.tileHeight)

          const anchorX = item.anchorX !== undefined ? item.anchorX : (asset.anchorX ?? 0.5)
          const anchorY = item.anchorY !== undefined ? item.anchorY : (asset.anchorY ?? 0.5)

          sprite.anchor.set(anchorX, anchorY)
          sprite.position.set(baseCenter.x + (item.offsetX || 0), baseCenter.y + (item.offsetY || 0))
          sprite.scale.x = (item.flipX ? -1 : 1) * scale
          sprite.scale.y = scale
          sprite.angle = item.rotation || 0
          sprite.visible = layer.visible
          sprite.alpha = (item.opacity ?? 1.0) * layer.opacity

          // Precise Depth Sorting across ALL covered cells using layer priority, relative depth offset and per-cell Z-index
          let maxDepthScore = 0
          const depthOffset = (item.depthOffset !== undefined && item.depthOffset !== 0)
            ? item.depthOffset
            : (item.isFrontWall || asset.isFrontWall ? 1 : (asset.depthOffset || 0))

          for (let cx = posX; cx < posX + spanX; cx++) {
            for (let cy = posY; cy < posY + spanY; cy++) {
              const specificZ = item.cellZIndex?.[`${cx},${cy}`] ?? item.zIndex ?? 0
              const effectiveGridDepth = cx + cy + depthOffset

              let cellScore: number
              if (isGround) {
                // Ground Base Plane (0 .. 50,000)
                cellScore = Math.round(effectiveGridDepth * 10 + layerIdx * 2 + specificZ * 2 + (cx - cy) * 0.01)
              } else {
                // 3D Isometric Entity Plane (100,000+)
                cellScore = 100000 + Math.round(effectiveGridDepth * 1000 + layerIdx * 20 + specificZ * 5 + (cx - cy) * 0.01)
              }

              if (cellScore > maxDepthScore) {
                maxDepthScore = cellScore
              }
            }
          }
          sprite.zIndex = maxDepthScore
        }
      }
    }

    this.layersContainer.sortChildren()
  }

  public clear(): void {
    try {
      for (const spriteMap of this.layerSpriteMaps.values()) {
        for (const sprite of spriteMap.values()) {
          if (sprite && !sprite.destroyed) {
            sprite.destroy()
          }
        }
        spriteMap.clear()
      }
      this.layerSpriteMaps.clear()

      if (this.layersContainer && !this.layersContainer.destroyed) {
        this.layersContainer.removeChildren()
      }
    } catch (e) {
      console.warn('[MapRenderer] clear caught:', e)
    }
  }

  public destroy(): void {
    try {
      this.clear()
      this.textureCache.clear()
      this.loadingPromises.clear()
      if (this.layersContainer && !this.layersContainer.destroyed) {
        this.layersContainer.destroy({ children: true })
      }
    } catch (e) {
      console.warn('[MapRenderer] destroy caught:', e)
    }
  }
}
