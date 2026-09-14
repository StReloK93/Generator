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

    // Parallel preload in batches of 16
    const batchSize = 16
    for (let i = 0; i < total; i += batchSize) {
      const chunk = uniqueAssets.slice(i, i + batchSize)
      await Promise.all(
        chunk.map(async (asset) => {
          await this.preloadAsset(asset)
          loaded++
          if (onProgress) onProgress(loaded, total)
        })
      )
    }
  }

  public async preloadAsset(asset: AssetItem): Promise<Texture | null> {
    if (!asset) return null

    // 1. Fast check in AssetManager
    const managed =
      assetManager.getTexture(asset.id) ||
      assetManager.getTexture(asset.fileRelativePath || '') ||
      assetManager.getTexture(asset.name)
    if (managed) {
      this.textureCache.set(asset.id, managed)
      return managed
    }

    if (!asset.src) return null
    if (this.textureCache.has(asset.id)) {
      return this.textureCache.get(asset.id)!
    }

    if (this.loadingPromises.has(asset.id)) {
      return this.loadingPromises.get(asset.id)!
    }

    const promise = new Promise<Texture | null>((resolve) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const source = new ImageSource({ resource: img })
          const texture = new Texture({ source })
          this.textureCache.set(asset.id, texture)
          this.textureCache.set(asset.src, texture)
          const cleanId = asset.id.replace(/^sprite-/, '')
          this.textureCache.set(cleanId, texture)
          this.textureCache.set(`sprite-${cleanId}`, texture)
          assetManager.registerCustomTexture(asset.id, texture)

          if (asset.fileRelativePath) {
            this.textureCache.set(asset.fileRelativePath, texture)
            const baseNoExt = asset.fileRelativePath.replace(/\.[^/.]+$/, '')
            this.textureCache.set(baseNoExt, texture)
            this.textureCache.set(`sprite-${baseNoExt}`, texture)
            assetManager.registerCustomTexture(baseNoExt, texture)
          }
          if (this.onTextureLoaded) {
            this.onTextureLoaded(asset.id, texture)
          }
          resolve(texture)
        } catch (e) {
          console.error('Texture creation error:', asset.name, e)
          resolve(null)
        }
      }
      img.onerror = (e) => {
        console.error('Image load error for asset:', asset.name, e)
        resolve(null)
      }
      img.src = asset.src
    })

    this.loadingPromises.set(asset.id, promise)
    return await promise
  }

  public getTexture(asset: AssetItem): Texture | null {
    if (!asset) return null

    // 1. Prioritize Central AssetManager (instant O(1) spritesheet sub-texture)
    const managed =
      assetManager.getTexture(asset.id) ||
      assetManager.getTexture(asset.fileRelativePath || '') ||
      assetManager.getTexture(asset.name)
    if (managed) {
      return managed
    }

    // 2. Check local fallback cache
    if (this.textureCache.has(asset.id)) {
      return this.textureCache.get(asset.id)!
    }
    const cleanId = asset.id.replace(/^sprite-/, '')
    if (this.textureCache.has(cleanId)) {
      return this.textureCache.get(cleanId)!
    }
    if (this.textureCache.has(`sprite-${cleanId}`)) {
      return this.textureCache.get(`sprite-${cleanId}`)!
    }
    if (asset.src && this.textureCache.has(asset.src)) {
      return this.textureCache.get(asset.src)!
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

      for (const [itemId, sprite] of spriteMap.entries()) {
        if (!currentItemIds.has(itemId)) {
          this.layersContainer.removeChild(sprite)
          sprite.destroy()
          spriteMap.delete(itemId)
        }
      }

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
          const depthOffset = item.depthOffset || 0
          const isGround =
            layer.id === 'layer-ground' ||
            layerIdx === 0 ||
            layer.name.toLowerCase().includes('ground') ||
            layer.name.toLowerCase().includes('yer')

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
    for (const spriteMap of this.layerSpriteMaps.values()) {
      for (const sprite of spriteMap.values()) {
        sprite.destroy()
      }
      spriteMap.clear()
    }
    this.layerSpriteMaps.clear()
    this.layersContainer.removeChildren()
  }

  public destroy(): void {
    this.clear()
    this.textureCache.clear()
    this.loadingPromises.clear()
    this.layersContainer.destroy({ children: true })
  }
}
