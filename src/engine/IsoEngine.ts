import { Application, Container, Graphics, Sprite, Texture, Text, TextStyle, ImageSource } from 'pixi.js'
import { MapProject, AssetItem, GridCoord, Point2D, SelectedElementRef, UnitVariantType } from '../types/map'
import { networkSyncBuffer } from '../services/networkSync'
import { assetManager } from '../services/assetManager'
import characterManifest from '../assets/generated/characterManifest.json'
import { 
  gridToScreen, 
  screenToGrid, 
  getCellPolygon, 
  getFootprintPolygon,
  getFootprintBaseCenter,
  isInsideGrid,
  cellKey
} from '../utils/isometric'
import { getVariantDef, getVariantTint } from '../utils/unitVariants'
import { renderPixiUnitEffect } from '../utils/unitEffectRenderer'

export class IsoEngine {
  public app: Application
  public isInitialized = false

  // Containers
  public stageContainer: Container
  public worldContainer: Container
  public gridContainer: Container
  public layersContainer: Container
  public overlayContainer: Container
  public hoverGraphics: Graphics
  public selectionGraphics: Graphics
  public previewContainer: Container
  public gridGraphics: Graphics
  public borderGraphics: Graphics
  public coordsContainer: Container
  public spawnOverlayGraphics: Graphics
  public spawnMarkersContainer: Container

  // Character Container & Sprites
  public pathTrailGraphics: Graphics
  public characterContainer: Container
  public characterShadow: Graphics
  public characterSprite: Sprite
  public characterMarker: Graphics
  public onTick?: (deltaSec: number) => void

  // Tower Defense & Combat Visuals
  public combatGraphics: Graphics
  public buildGhostSprite: Sprite
  public currentFps: number = 60
  private towerTextures = new Map<string, Texture>()
  private towerContainerMap = new Map<string, Container>()
  private combatTrails = new Map<string, { x: number; y: number; alpha: number; size: number }[]>()
  public combatSparks: { x: number; y: number; vx: number; vy: number; color: number; alpha: number; size: number; life: number }[] = []

  // Sprites pool & Cache per layer: Map<layerId, Map<itemId, Sprite>>
  private layerSpriteMaps = new Map<string, Map<string, Sprite>>()
  private textureCache = new Map<string, Texture>()
  private loadingPromises = new Map<string, Promise<Texture | null>>()
  public static instance: IsoEngine | null = null

  constructor() {
    IsoEngine.instance = this
    this.app = new Application()
    this.stageContainer = new Container()
    this.worldContainer = new Container()
    this.gridContainer = new Container()
    this.layersContainer = new Container()
    this.overlayContainer = new Container()
    this.hoverGraphics = new Graphics()
    this.selectionGraphics = new Graphics()
    this.previewContainer = new Container()
    this.gridGraphics = new Graphics()
    this.borderGraphics = new Graphics()
    this.coordsContainer = new Container()
    this.combatGraphics = new Graphics()
    this.buildGhostSprite = new Sprite()
    this.buildGhostSprite.visible = false
    this.spawnOverlayGraphics = new Graphics()
    this.spawnMarkersContainer = new Container()

    // Character elements
    this.pathTrailGraphics = new Graphics()
    this.characterContainer = new Container()
    this.characterShadow = new Graphics()
    this.characterSprite = new Sprite()
    this.characterMarker = new Graphics()
  }

  private lastTrailSignature = ''
  private unitLastDepths: number[] = []

  async init(containerEl: HTMLElement, width: number, height: number): Promise<void> {
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const dpr = isMobile
      ? Math.min(window.devicePixelRatio || 1, 1.5)
      : Math.min(window.devicePixelRatio || 1, 2)

    await this.app.init({
      width,
      height,
      backgroundColor: 0x090d16,
      backgroundAlpha: 1,
      antialias: !isMobile,
      resolution: dpr,
      autoDensity: true,
    })

    containerEl.appendChild(this.app.canvas)

    this.app.stage.addChild(this.stageContainer)
    this.stageContainer.addChild(this.worldContainer)

    this.worldContainer.addChild(this.gridContainer)
    this.gridContainer.addChild(this.gridGraphics)
    this.gridContainer.addChild(this.borderGraphics)
    this.gridContainer.addChild(this.coordsContainer)

    this.worldContainer.addChild(this.layersContainer)
    this.layersContainer.sortableChildren = true

    // Add character into layers container for isometric z-depth sorting
    this.characterContainer.sortableChildren = true
    this.characterContainer.addChild(this.characterShadow)
    this.characterContainer.addChild(this.characterSprite)
    this.characterContainer.addChild(this.characterMarker)
    this.layersContainer.addChild(this.characterContainer)

    this.combatGraphics = new Graphics()
    this.worldContainer.addChild(this.overlayContainer)
    this.overlayContainer.addChild(this.hoverGraphics)
    this.overlayContainer.addChild(this.selectionGraphics)
    this.overlayContainer.addChild(this.previewContainer)
    this.overlayContainer.addChild(this.buildGhostSprite)
    this.overlayContainer.addChild(this.pathTrailGraphics)
    this.overlayContainer.addChild(this.spawnOverlayGraphics)
    this.overlayContainer.addChild(this.spawnMarkersContainer)
    this.worldContainer.addChild(this.combatGraphics)

    // Load core terrain textures and schedule background preloader
    await assetManager.loadCore()
    assetManager.preloadRemainingInBackground()

    // Ticker animation loop with live FPS calculation
    let frameCount = 0
    let lastFpsSampleTime = performance.now()

    this.app.ticker.add((ticker) => {
      frameCount++
      const now = performance.now()
      if (now - lastFpsSampleTime >= 500) {
        this.currentFps = Math.max(1, Math.round((frameCount * 1000) / (now - lastFpsSampleTime)))
        frameCount = 0
        lastFpsSampleTime = now
      }

      if (this.onTick) {
        this.onTick(ticker.deltaTime / 60)
      }
    })

    this.isInitialized = true
  }

  resize(width: number, height: number): void {
    if (!this.isInitialized) return
    this.app.renderer.resize(width, height)
  }

  setTransform(zoom: number, pan: Point2D): void {
    this.worldContainer.scale.set(zoom)
    this.worldContainer.position.set(pan.x, pan.y)
  }

  setPan(panX: number, panY: number): void {
    this.worldContainer.position.set(panX, panY)
  }

  centerMap(project: MapProject, viewWidth: number, viewHeight: number, zoom = 1.0): Point2D {
    const midCol = (project.cols - 1) / 2
    const midRow = (project.rows - 1) / 2

    const centerScreen = gridToScreen(midCol, midRow, project.tileWidth, project.tileHeight)

    const panX = viewWidth / 2 - centerScreen.x * zoom
    const panY = viewHeight / 2 - centerScreen.y * zoom

    return { x: Math.round(panX), y: Math.round(panY) }
  }

  renderGrid(
    project: MapProject,
    showGrid: boolean,
    gridOpacity: number,
    showCoords: boolean,
    showCenter = true,
    showSymmetry = true
  ): void {
    this.gridGraphics.clear()
    this.borderGraphics.clear()
    this.coordsContainer.removeChildren()

    const { cols, rows, tileWidth, tileHeight } = project
    const halfW = tileWidth / 2
    const halfH = tileHeight / 2
    const midCol = (cols - 1) / 2
    const midRow = (rows - 1) / 2
    const centerPt = gridToScreen(midCol, midRow, tileWidth, tileHeight)

    const gridColorNum = parseInt(project.gridColor.replace('#', ''), 16) || 0x38bdf8

    if (showGrid) {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const poly = getCellPolygon(c, r, tileWidth, tileHeight)
          this.gridGraphics
            .poly(poly)
            .stroke({ width: 1, color: gridColorNum, alpha: gridOpacity })
        }
      }

      // Exact Outer perimeter border
      const pTop = { x: 0, y: -halfH }
      const pRight = { x: cols * halfW, y: (cols - 1) * halfH }
      const pBottom = { x: (cols - rows) * halfW, y: (cols + rows - 1) * halfH }
      const pLeft = { x: -rows * halfW, y: (rows - 1) * halfH }

      this.borderGraphics
        .moveTo(pTop.x, pTop.y)
        .lineTo(pRight.x, pRight.y)
        .lineTo(pBottom.x, pBottom.y)
        .lineTo(pLeft.x, pLeft.y)
        .closePath()
        .stroke({ width: 2, color: 0x6366f1, alpha: Math.min(1, gridOpacity * 2 + 0.4) })

      // Exact Symmetry Axis Lines passing directly through the true center of the map
      if (showSymmetry) {
        // 1. Grid Column symmetry axis (midpoint of top-right edge to midpoint of bottom-left edge)
        const colStart = gridToScreen(midCol, -0.5, tileWidth, tileHeight)
        const colEnd = gridToScreen(midCol, rows - 0.5, tileWidth, tileHeight)

        this.borderGraphics
          .moveTo(colStart.x, colStart.y)
          .lineTo(colEnd.x, colEnd.y)
          .stroke({ width: 2, color: 0x10b981, alpha: 0.85 })

        // 2. Grid Row symmetry axis (midpoint of top-left edge to midpoint of bottom-right edge)
        const rowStart = gridToScreen(-0.5, midRow, tileWidth, tileHeight)
        const rowEnd = gridToScreen(cols - 0.5, midRow, tileWidth, tileHeight)

        this.borderGraphics
          .moveTo(rowStart.x, rowStart.y)
          .lineTo(rowEnd.x, rowEnd.y)
          .stroke({ width: 2, color: 0x10b981, alpha: 0.85 })

        // 3. Screen Diagonal Symmetry Axes (Corner to Corner Cross)
        this.borderGraphics
          .moveTo(pTop.x, pTop.y)
          .lineTo(pBottom.x, pBottom.y)
          .stroke({ width: 1.5, color: 0x06b6d4, alpha: 0.6 })

        this.borderGraphics
          .moveTo(pLeft.x, pLeft.y)
          .lineTo(pRight.x, pRight.y)
          .stroke({ width: 1.5, color: 0x06b6d4, alpha: 0.6 })
      }

      // Center Origin Highlight & Glowing Center Point
      if (showCenter) {
        const isOddOdd = cols % 2 !== 0 && rows % 2 !== 0

        if (isOddOdd) {
          const centerPoly = getCellPolygon(midCol, midRow, tileWidth, tileHeight)
          this.borderGraphics
            .poly(centerPoly)
            .fill({ color: 0x10b981, alpha: 0.28 })
            .stroke({ width: 2.5, color: 0x34d399, alpha: 0.95 })
        } else {
          const c0 = Math.floor(midCol)
          const r0 = Math.floor(midRow)
          const spanX = cols % 2 === 0 ? 2 : 1
          const spanY = rows % 2 === 0 ? 2 : 1
          const centerPoly = getFootprintPolygon(c0, r0, spanX, spanY, tileWidth, tileHeight)
          this.borderGraphics
            .poly(centerPoly)
            .fill({ color: 0x10b981, alpha: 0.22 })
            .stroke({ width: 2, color: 0x34d399, alpha: 0.85 })
        }

        // Outer glow ring
        this.borderGraphics
          .circle(centerPt.x, centerPt.y, 8)
          .stroke({ width: 1.5, color: 0x34d399, alpha: 0.7 })

        // Central Bullseye Dot
        this.borderGraphics
          .circle(centerPt.x, centerPt.y, 4.5)
          .fill({ color: 0x10b981, alpha: 1.0 })
          .stroke({ width: 2, color: 0xffffff, alpha: 0.95 })

        // Central Crosshair Ticks
        this.borderGraphics
          .moveTo(centerPt.x - 12, centerPt.y)
          .lineTo(centerPt.x + 12, centerPt.y)
          .moveTo(centerPt.x, centerPt.y - 12)
          .lineTo(centerPt.x, centerPt.y + 12)
          .stroke({ width: 1.5, color: 0xffffff, alpha: 0.85 })

        // Center Pin Badge
        const centerLabel = isOddOdd
          ? `[CENTER] (${midCol}, ${midRow})`
          : `[CENTER] (${cols % 2 === 0 ? `${midCol - 0.5}..${midCol + 0.5}` : midCol}, ${rows % 2 === 0 ? `${midRow - 0.5}..${midRow + 0.5}` : midRow})`

        const centerBadge = new Text({
          text: centerLabel,
          style: new TextStyle({
            fontFamily: 'SpaceMono, monospace',
            fontSize: Math.max(10, Math.min(12, tileWidth / 9)),
            fontWeight: 'bold',
            fill: 0x34d399,
            stroke: { color: 0x090d16, width: 3 },
            align: 'center',
          })
        })
        centerBadge.anchor.set(0.5, 1.5)
        centerBadge.position.set(centerPt.x, centerPt.y)
        this.coordsContainer.addChild(centerBadge)
      }
    }

    if (showCoords) {
      const textStyle = new TextStyle({
        fontFamily: 'SpaceMono, monospace',
        fontSize: Math.max(9, Math.min(12, tileWidth / 10)),
        fill: 0x94a3b8,
        align: 'center',
      })

      const isOddOdd = cols % 2 !== 0 && rows % 2 !== 0

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (isOddOdd && c === midCol && r === midRow) continue
          const pt = gridToScreen(c, r, tileWidth, tileHeight)
          const coordText = new Text({
            text: `${c},${r}`,
            style: textStyle,
          })
          coordText.anchor.set(0.5, 0.5)
          coordText.position.set(pt.x, pt.y)
          this.coordsContainer.addChild(coordText)
        }
      }
    }
  }

  renderHoverCell(
    hovered: GridCoord | null,
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.hoverGraphics.clear()
    this.previewContainer.removeChildren()

    if (!hovered || !isInsideGrid(hovered.col, hovered.row, project.cols, project.rows)) {
      return
    }

    const { tileWidth, tileHeight } = project
    const spanX = (activeAsset) ? (activeAsset.spanX || 1) : 1
    const spanY = (activeAsset) ? (activeAsset.spanY || 1) : 1

    const poly = getFootprintPolygon(hovered.col, hovered.row, spanX, spanY, tileWidth, tileHeight)

    let strokeColor = 0x38bdf8
    let fillColor = 0x38bdf8

    if (activeTool === 'eraser' || activeTool === 'box-clear') {
      strokeColor = 0xf87171
      fillColor = 0xef4444
    } else if (activeTool === 'bucket') {
      strokeColor = 0x10b981
      fillColor = 0x10b981
    } else if (activeTool === 'picker') {
      strokeColor = 0xf59e0b
      fillColor = 0xf59e0b
    } else if (activeTool === 'box-fill') {
      strokeColor = 0x38bdf8
      fillColor = 0x0284c7
    } else if (!activeAsset) {
      strokeColor = 0xa855f7
      fillColor = 0xa855f7
    }

    this.hoverGraphics
      .poly(poly)
      .fill({ color: fillColor, alpha: (activeTool === 'box-fill' || activeTool === 'box-clear') ? 0.35 : 0.28 })
      .stroke({ width: 2, color: strokeColor, alpha: 0.95 })

    // Ghost preview fitted to 1 tile width - ONLY for placing tools (not box-fill, box-clear, eraser, picker)
    if (activeAsset && activeTool !== 'box-fill' && activeTool !== 'box-clear' && activeTool !== 'eraser' && activeTool !== 'picker') {
      const texture = this.getTexture(activeAsset)
      if (texture) {
        const ghost = new Sprite(texture)
        ghost.anchor.set(activeAsset.anchorX, activeAsset.anchorY)
        const baseCenter = getFootprintBaseCenter(hovered.col, hovered.row, spanX, spanY, tileWidth, tileHeight)
        ghost.position.set(baseCenter.x, baseCenter.y)

        // Automatic 1-tile width fitting
        const baseScale = (tileWidth * spanX) / (activeAsset.width || tileWidth)
        const scaleVal = baseScale * (activeAsset.scale || 1.0)
        ghost.scale.set(scaleVal)
        ghost.alpha = 0.65
        this.previewContainer.addChild(ghost)
      }
    }
  }

  renderSelection(
    selected: SelectedElementRef | SelectedElementRef[] | null,
    project: MapProject,
    spanX = 1,
    spanY = 1
  ): void {
    this.selectionGraphics.clear()
    if (!selected) return

    const { tileWidth, tileHeight } = project

    const items = Array.isArray(selected) ? selected : [selected]
    if (items.length === 0) return

    for (const sel of items) {
      if (!sel) continue
      let itemSpanX = spanX
      let itemSpanY = spanY

      // If array of items passed, try finding item's span
      if (Array.isArray(selected)) {
        const layer = project.layers.find(l => l.id === sel.layerId)
        if (layer) {
          const key = cellKey(sel.col, sel.row)
          const cellItems = layer.tiles[key] || []
          const found = cellItems.find(i => i.id === sel.itemId)
          if (found) {
            itemSpanX = found.spanX || 1
            itemSpanY = found.spanY || 1
          }
        }
      }

      const poly = getFootprintPolygon(sel.col, sel.row, itemSpanX, itemSpanY, tileWidth, tileHeight)
      this.selectionGraphics
        .poly(poly)
        .fill({ color: 0xa855f7, alpha: 0.35 })
        .stroke({ width: 2.5, color: 0xc084fc, alpha: 1.0 })
    }
  }

  renderPreviewCells(
    cells: GridCoord[],
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.hoverGraphics.clear()
    this.previewContainer.removeChildren()

    if (cells.length === 0) return

    const { tileWidth, tileHeight } = project
    const isEraser = activeTool === 'eraser'
    const isBoxClear = activeTool === 'box-clear'
    const isBoxFill = activeTool === 'box-fill'
    const color = (isEraser || isBoxClear) ? 0xef4444 : (isBoxFill ? 0x0284c7 : 0x6366f1)
    const strokeColor = (isEraser || isBoxClear) ? 0xf87171 : (isBoxFill ? 0x38bdf8 : 0x818cf8)

    for (const cell of cells) {
      if (!isInsideGrid(cell.col, cell.row, project.cols, project.rows)) continue
      const poly = getCellPolygon(cell.col, cell.row, tileWidth, tileHeight)
      this.hoverGraphics
        .poly(poly)
        .fill({ color, alpha: (isBoxFill || isBoxClear) ? 0.38 : 0.35 })
        .stroke({ width: (isBoxFill || isBoxClear) ? 2.0 : 1.5, color: strokeColor, alpha: 0.95 })

      if (!isEraser && !isBoxClear && !isBoxFill && activeAsset) {
        const texture = this.getTexture(activeAsset)
        if (texture) {
          const ghost = new Sprite(texture)
          ghost.anchor.set(activeAsset.anchorX, activeAsset.anchorY)
          const center = gridToScreen(cell.col, cell.row, tileWidth, tileHeight)
          ghost.position.set(center.x, center.y)

          const baseScale = tileWidth / (activeAsset.width || tileWidth)
          const scaleVal = baseScale * (activeAsset.scale || 1.0)
          ghost.scale.set(scaleVal)
          ghost.alpha = 0.55
          this.previewContainer.addChild(ghost)
        }
      }
    }
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

  public onTextureLoaded?: (assetId: string, texture: Texture) => void

  public async preloadAsset(asset: AssetItem): Promise<Texture | null> {
    if (!asset) return null

    // 1. Fast check in AssetManager
    const managed = assetManager.getTexture(asset.id) || 
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
    const managed = assetManager.getTexture(asset.id) || 
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

  syncLayers(project: MapProject, assetMap: Map<string, AssetItem>): void {
    const activeLayerIds = new Set(project.layers.map(l => l.id))

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
          const isGround = layer.id === 'layer-ground' || layerIdx === 0 || layer.name.toLowerCase().includes('ground') || layer.name.toLowerCase().includes('yer')

          for (let cx = posX; cx < posX + spanX; cx++) {
            for (let cy = posY; cy < posY + spanY; cy++) {
              const specificZ = item.cellZIndex?.[`${cx},${cy}`] ?? item.zIndex ?? 0
              const effectiveGridDepth = (cx + cy) + depthOffset
              
              let cellScore: number
              if (isGround) {
                // Ground Base Plane (0 .. 50,000): Flat terrain tiles NEVER clip or occlude moving units or 3D entities
                cellScore = Math.round(effectiveGridDepth * 10 + (layerIdx * 2) + (specificZ * 2) + (cx - cy) * 0.01)
              } else {
                // 3D Isometric Entity Plane (100,000+): Accurate front-to-back depth sorting with characters, towers, and walls
                cellScore = 100000 + Math.round(effectiveGridDepth * 1000 + (layerIdx * 20) + (specificZ * 5) + (cx - cy) * 0.01)
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

  async loadCharacterTextures(): Promise<void> {
    await assetManager.loadGame()
  }

  async loadTowerTextures(): Promise<void> {
    await assetManager.loadEditor()
  }

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
      (assetId ? this.textureCache.get(assetId) : null) ||
      (baseName ? this.textureCache.get(`sprite-${baseName}`) : null) ||
      (baseName ? this.textureCache.get(baseName) : null) ||
      (assetName ? this.textureCache.get(assetName) : null) ||
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
            this.textureCache.set(assetPath, tex)
            if (assetId) this.textureCache.set(assetId, tex)
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

  renderTowersAndCombat(
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
    hoveredGridCoord: GridCoord | null = null
  ): void {
    if (!this.isInitialized) return
    const { tileWidth, tileHeight } = project

    // 1. Synchronize and Render Placed Tower Sprites in layersContainer
    const activeTowerIds = new Set(towerStore.placedTowers.map(t => t.id))

    // Remove deleted towers
    for (const [id, container] of this.towerContainerMap.entries()) {
      if (!activeTowerIds.has(id)) {
        this.layersContainer.removeChild(container)
        container.destroy({ children: true })
        this.towerContainerMap.delete(id)
      }
    }

    for (const tower of towerStore.placedTowers) {
      let container = this.towerContainerMap.get(tower.id)
      if (!container) {
        container = new Container()
        container.sortableChildren = true

        const shadow = new Graphics()
        shadow.zIndex = 0
        const shadowRadiusX = tileWidth * 0.28
        const shadowRadiusY = tileHeight * 0.28
        shadow
          .ellipse(0, 0, shadowRadiusX, shadowRadiusY)
          .fill({ color: 0x000000, alpha: 0.45 })

        const sprite = new Sprite()
        sprite.zIndex = 1

        const selection = new Graphics()
        selection.zIndex = 2

        container.addChild(shadow)
        container.addChild(sprite)
        container.addChild(selection)

        this.layersContainer.addChild(container)
        this.towerContainerMap.set(tower.id, container)
      }

      container.visible = true
      const sprite = container.getChildAt(1) as Sprite
      const selection = container.getChildAt(2) as Graphics

      const bp = (towerStore as any).blueprints?.find((b: any) => b.id === tower.blueprintId)
      const texture = this.getBlueprintTexture(bp)

      if (texture) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        sprite.visible = true
        const texW = (texture.width && texture.width > 10) ? texture.width : 256
        const baseScale = (tileWidth * 1.0) / texW
        sprite.scale.set(baseScale * 0.98)
        sprite.anchor.set(0.5, 0.88)
      }

      // Selection & Builder Color Base Ring + Overhead Gem Badge
      const isSelected = towerStore.selectedPlacedTowerId === tower.id
      const builderColor = tower.builderColor || '#38bdf8'
      const wasSelected = (container as any)._wasSelected
      const wasBuilderColor = (container as any)._wasBuilderColor
      const wasLevel = (container as any)._wasLevel

      if (isSelected !== wasSelected || wasBuilderColor !== builderColor || wasLevel !== tower.level) {
        selection.clear()
        const colHex = parseInt(builderColor.replace('#', '0x')) || 0x38bdf8

        // 1. Base Ring under tower
        if (isSelected) {
          selection
            .ellipse(0, 0, tileWidth * 0.40, tileHeight * 0.40)
            .fill({ color: colHex, alpha: 0.20 })
            .stroke({ width: 3, color: 0x38bdf8, alpha: 0.95 })
        } else {
          selection
            .ellipse(0, 0, tileWidth * 0.34, tileHeight * 0.34)
            .fill({ color: colHex, alpha: 0.12 })
            .stroke({ width: 2.2, color: colHex, alpha: 0.85 })
        }

        // 2. Overhead Builder Gem Badge (Player color gem over tower)
        const topY = -tileHeight * 1.32
        
        // Shadow / Outer Glow
        selection
          .poly([
            { x: 0, y: topY - 10 },
            { x: 8, y: topY },
            { x: 0, y: topY + 10 },
            { x: -8, y: topY },
          ])
          .fill({ color: colHex, alpha: 0.95 })
          .stroke({ width: 1.8, color: 0xffffff, alpha: 0.95 })

        // Inner Core Sparkle
        selection
          .circle(0, topY, 3)
          .fill({ color: 0xffffff, alpha: 0.9 })

        ;(container as any)._wasSelected = isSelected
        ;(container as any)._wasBuilderColor = builderColor
        ;(container as any)._wasLevel = tower.level
      }

      container.position.set(tower.screenX, tower.screenY)
      const towerSpanX = (tower as any).spanX || 1
      const towerSpanY = (tower as any).spanY || 1
      const effectiveTowerDepth = (tower.col + towerSpanX - 1) + (tower.row + towerSpanY - 1)
      container.zIndex = 100000 + effectiveTowerDepth * 1000 + 350
    }

    // 2. Combat Overlays in combatGraphics
    const hasProjectiles = (towerStore.projectiles && towerStore.projectiles.length > 0) || networkSyncBuffer.projectilesPool.some(p => p.active)
    const hasRings = (towerStore.explosionRings && towerStore.explosionRings.length > 0) || networkSyncBuffer.explosionRingsPool.some(r => r.active)
    const hasFloaters = (towerStore.damageFloaters && towerStore.damageFloaters.length > 0) || networkSyncBuffer.damageFloatersPool.some(f => f.active)
    const towerToHighlight = towerStore.placedTowers.find(t => t.id === towerStore.selectedPlacedTowerId)
    const hasRangePreview = Boolean(towerToHighlight || (towerStore.activeBuildTowerId && hoveredGridCoord))
    const units = (networkSyncBuffer.renderUnitsList.length > 0)
      ? networkSyncBuffer.renderUnitsList
      : (characterStore.units || [])
    const hasUnits = units.length > 0

    if (!hasProjectiles && !hasRings && !hasFloaters && !hasRangePreview && !hasUnits) {
      this.combatGraphics.clear()
      return
    }

    this.combatGraphics.clear()

    // 2.1 Attack Range Indicator (When inspecting a tower or hovering while placing)
    if (towerToHighlight) {
      if (this.buildGhostSprite) this.buildGhostSprite.visible = false
      const r = towerToHighlight.range
      const rx = (r * tileWidth) / Math.SQRT2
      const ry = (r * tileHeight) / Math.SQRT2

      this.combatGraphics
        .ellipse(towerToHighlight.screenX, towerToHighlight.screenY, rx, ry)
        .fill({ color: 0x38bdf8, alpha: 0.12 })
        .stroke({ width: 2, color: 0x38bdf8, alpha: 0.85 })
    } else if (towerStore.activeBuildTowerId && hoveredGridCoord) {
      const isBlocked = (characterStore.isCellBlockedForBuilding && characterStore.isCellBlockedForBuilding(hoveredGridCoord.col, hoveredGridCoord.row)) ||
                        towerStore.placedTowers.some(t => t.col === hoveredGridCoord.col && t.row === hoveredGridCoord.row)
      const ringColor = isBlocked ? 0xef4444 : 0x10b981
      const bp = towerStore.blueprints?.find((b: any) => b.id === towerStore.activeBuildTowerId) || towerStore.activeBlueprint
      const r = bp ? bp.range : 3.5
      const rx = (r * tileWidth) / Math.SQRT2
      const ry = (r * tileHeight) / Math.SQRT2
      const pt = gridToScreen(hoveredGridCoord.col, hoveredGridCoord.row, tileWidth, tileHeight)

      // 1. Semi-transparent building ghost preview (Ozginas shaffof bino ko'rinishi)
      if (!isBlocked && bp) {
        const texture = this.getBlueprintTexture(bp)
        if (texture) {
          if (this.buildGhostSprite.texture !== texture) {
            this.buildGhostSprite.texture = texture
          }
          this.buildGhostSprite.visible = true
          this.buildGhostSprite.position.set(pt.x, pt.y)
          this.buildGhostSprite.alpha = 0.55
          this.buildGhostSprite.anchor.set(0.5, 0.88)
          const texW = (texture.width && texture.width > 10) ? texture.width : 256
          const baseScale = (tileWidth * 1.0) / texW
          this.buildGhostSprite.scale.set(baseScale * 0.98)
        } else {
          this.buildGhostSprite.visible = false
        }
      } else {
        this.buildGhostSprite.visible = false
      }

      // 2. Isometric Cell Footprint Diamond (Clear active cell focus)
      this.combatGraphics
        .poly([
          { x: pt.x, y: pt.y - tileHeight * 0.5 },
          { x: pt.x + tileWidth * 0.5, y: pt.y },
          { x: pt.x, y: pt.y + tileHeight * 0.5 },
          { x: pt.x - tileWidth * 0.5, y: pt.y },
        ])
        .fill({ color: ringColor, alpha: isBlocked ? 0.35 : 0.22 })
        .stroke({ width: 2.8, color: ringColor, alpha: 0.95 })

      // 3. Attack Range Preview Ellipse
      this.combatGraphics
        .ellipse(pt.x, pt.y, rx, ry)
        .fill({ color: ringColor, alpha: isBlocked ? 0.12 : 0.08 })
        .stroke({ width: 2, color: ringColor, alpha: 0.80 })

      // 4. Confirmation Badge: Checkmark or Blocked
      const badgeY = pt.y - tileHeight * 0.80
      if (!isBlocked) {
        // Glowing green outer halo
        this.combatGraphics
          .circle(pt.x, badgeY, 15)
          .fill({ color: 0x10b981, alpha: 0.30 })

        // Dark pill background with emerald border
        this.combatGraphics
          .circle(pt.x, badgeY, 11)
          .fill({ color: 0x0f172a, alpha: 0.95 })
          .stroke({ width: 2.2, color: 0x10b981, alpha: 1.0 })

        // Checkmark
        this.combatGraphics
          .moveTo(pt.x - 5, badgeY)
          .lineTo(pt.x - 1.5, badgeY + 3.5)
          .lineTo(pt.x + 5.5, badgeY - 3.5)
          .stroke({ width: 2.5, color: 0x34d399, alpha: 1.0 })
      } else {
        // Red Blocked Warning Badge
        this.combatGraphics
          .circle(pt.x, badgeY, 15)
          .fill({ color: 0xef4444, alpha: 0.30 })

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
    } else {
      if (this.buildGhostSprite) this.buildGhostSprite.visible = false
    }

    // 2.2 Flying Animated Projectiles (Distinguished by projectileType)
    const nowTime = performance.now()
    const activeProjIds = new Set<string>()

    if (hasProjectiles) {
      const activeProjList = (towerStore.projectiles && towerStore.projectiles.length > 0)
        ? towerStore.projectiles
        : networkSyncBuffer.projectilesPool.filter(p => p.active)

      for (let i = 0; i < activeProjList.length; i++) {
        const proj = activeProjList[i]
        activeProjIds.add(proj.id)
        const type = proj.projectileType || 'cannonball'

        const totalDist = proj.totalDistance || Math.hypot(proj.targetX - proj.startX, proj.targetY - proj.startY) || 1
        const progress = Math.min(1.0, (proj.traveledDistance || 0) / totalDist)

        // Parabolic arc height (kamon o'qi, cannonball va fireball uchun tabiiy parvoz balandligi)
        const arcHeight = (type === 'laser' || type === 'magic_bolt')
          ? 0
          : Math.sin(progress * Math.PI) * Math.min(45, totalDist * 0.16)

        const renderX = proj.currentX
        const renderY = proj.currentY - arcHeight

        // Dynamic Tangent Flight Angle (Arrow pitches along parabolic arc trajectory)
        const baseAngle = Math.atan2(proj.targetY - proj.currentY, proj.targetX - proj.currentX)
        const arcSlope = (type === 'arrow') ? -Math.cos(progress * Math.PI) * (arcHeight / Math.max(30, totalDist * 0.4)) * 1.2 : 0
        const angle = baseAngle + arcSlope

        // 1. Update and Render Dynamic Trail (Matching TowerLivePreview)
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

        // 2. Render Projectile Heads (100% matched with TowerLivePreview)
        if (type === 'arrow') {
          // ARROW: Oriented wood shaft + sharp steel tip + fletching feathers
          const arrowLength = 16
          const tailX = renderX - Math.cos(angle) * arrowLength
          const tailY = renderY - Math.sin(angle) * arrowLength

          // Wood shaft
          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(renderX, renderY)
            .stroke({ width: 2.0, color: 0x78350f, alpha: 1.0 })

          // Steel arrowhead (triangle tip)
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

          // Feather fletchings at tail
          const featherLeftX = tailX + Math.cos(angle + 2.4) * 4
          const featherLeftY = tailY + Math.sin(angle + 2.4) * 4
          const featherRightX = tailX + Math.cos(angle - 2.4) * 4
          const featherRightY = tailY + Math.sin(angle - 2.4) * 4

          this.combatGraphics
            .moveTo(tailX, tailY).lineTo(featherLeftX, featherLeftY).stroke({ width: 1.5, color: 0xef4444, alpha: 0.95 })
          this.combatGraphics
            .moveTo(tailX, tailY).lineTo(featherRightX, featherRightY).stroke({ width: 1.5, color: 0xef4444, alpha: 0.95 })

        } else if (type === 'fireball') {
          // FIREBALL: Blazing fiery sphere with glowing core
          this.combatGraphics
            .circle(renderX, renderY, 7.5)
            .fill({ color: 0xef4444, alpha: 0.5 })

          this.combatGraphics
            .circle(renderX, renderY, 5.0)
            .fill({ color: 0xf97316, alpha: 0.95 })

          this.combatGraphics
            .circle(renderX, renderY, 2.5)
            .fill({ color: 0xfef08a, alpha: 1.0 })

        } else if (type === 'frost_bolt') {
          // FROST BOLT: Crystalline rotating diamond shard with cryogenic aura
          this.combatGraphics
            .circle(renderX, renderY, 6.5)
            .fill({ color: 0x06b6d4, alpha: 0.5 })

          const rotAngle = nowTime * 0.008
          const cosR = Math.cos(rotAngle)
          const sinR = Math.sin(rotAngle)

          const pTop = { x: renderX + (-sinR * -6), y: renderY + (cosR * -6) }
          const pRight = { x: renderX + (cosR * 4), y: renderY + (sinR * 4) }
          const pBottom = { x: renderX + (-sinR * 6), y: renderY + (cosR * 6) }
          const pLeft = { x: renderX + (cosR * -4), y: renderY + (sinR * -4) }

          this.combatGraphics
            .poly([pTop, pRight, pBottom, pLeft])
            .fill({ color: 0xffffff, alpha: 0.95 })
            .stroke({ width: 1.2, color: 0x0891b2, alpha: 1.0 })

        } else if (type === 'laser') {
          // LASER: Concentrated high-energy continuous plasma beam
          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(renderX, renderY)
            .stroke({ width: 5.0, color: 0xf43f5e, alpha: 0.45 })

          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(renderX, renderY)
            .stroke({ width: 1.8, color: 0xffffff, alpha: 1.0 })

          this.combatGraphics
            .circle(renderX, renderY, 4.0)
            .fill({ color: 0xffffff, alpha: 1.0 })

        } else if (type === 'missile') {
          // MISSILE: High-tech rocket with warhead and thruster flame
          const mLen = 14
          const tailX = renderX - Math.cos(angle) * mLen
          const tailY = renderY - Math.sin(angle) * mLen

          // Missile rocket fuselage
          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(renderX, renderY)
            .stroke({ width: 4.5, color: 0x334155, alpha: 1.0 })

          // Red warhead tip
          const tipX = renderX + Math.cos(angle) * 3.5
          const tipY = renderY + Math.sin(angle) * 3.5
          this.combatGraphics
            .circle(tipX, tipY, 2.8)
            .fill({ color: 0xef4444, alpha: 1.0 })

          // Thruster flame
          this.combatGraphics
            .circle(tailX, tailY, 3.2)
            .fill({ color: 0xfbbf24, alpha: 0.95 })

        } else if (type === 'cannonball') {
          // CANNONBALL: Heavy dark iron sphere with specular shine
          this.combatGraphics
            .circle(renderX, renderY, 5.5)
            .fill({ color: 0x1e293b, alpha: 1.0 })
            .stroke({ width: 1.2, color: 0x475569, alpha: 1.0 })

          this.combatGraphics
            .circle(renderX - 1.5, renderY - 1.5, 1.6)
            .fill({ color: 0x94a3b8, alpha: 0.95 })

        } else {
          // MAGIC BOLT: Arcane plasma sphere with 4-pointed electric cross star
          this.combatGraphics
            .circle(renderX, renderY, 6.5)
            .fill({ color: 0x38bdf8, alpha: 0.5 })

          this.combatGraphics
            .circle(renderX, renderY, 3.0)
            .fill({ color: 0xffffff, alpha: 1.0 })

          this.combatGraphics
            .moveTo(renderX - 5, renderY).lineTo(renderX + 5, renderY).stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 })
          this.combatGraphics
            .moveTo(renderX, renderY - 5).lineTo(renderX, renderY + 5).stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 })
        }
      }
    }

    // Clean up expired projectile trails
    for (const id of this.combatTrails.keys()) {
      if (!activeProjIds.has(id)) {
        this.combatTrails.delete(id)
      }
    }

    // 2.3 Explosion Shockwave Rings (Except for arrows)
    if (hasRings) {
      const activeRings = (towerStore.explosionRings && towerStore.explosionRings.length > 0)
        ? towerStore.explosionRings
        : networkSyncBuffer.explosionRingsPool.filter(r => r.active)

      for (let i = 0; i < activeRings.length; i++) {
        const ring = activeRings[i]
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

    // 2.3.1 Impact Spark Particles (100% matched with TowerLivePreview)
    if (this.combatSparks.length > 0) {
      for (let i = this.combatSparks.length - 1; i >= 0; i--) {
        const sp = this.combatSparks[i]
        sp.x += sp.vx * 0.016
        sp.y += sp.vy * 0.016
        sp.life -= 0.016
        sp.alpha = Math.max(0, sp.life / 0.45)

        if (sp.alpha > 0) {
          this.combatGraphics
            .circle(sp.x, sp.y, sp.size)
            .fill({ color: sp.color, alpha: sp.alpha })
        }

        if (sp.life <= 0) {
          this.combatSparks.splice(i, 1)
        }
      }
    }

    // 2.4 Floating Unit HP Bars (Hit Points)
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

        // Bar container
        this.combatGraphics
          .roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 2)
          .fill({ color: 0x090d16, alpha: 0.85 })
          .stroke({ width: 1, color: 0x1e293b, alpha: 0.9 })

        // Health fill
        const hpColor = ratio > 0.5 ? 0x22c55e : (ratio > 0.25 ? 0xeab308 : 0xef4444)
        this.combatGraphics
          .roundRect(barX, barY, Math.max(2, barW * ratio), barH, 1.5)
          .fill({ color: hpColor, alpha: 0.95 })
      }
    }

    // 2.5 Damage Text Floater Chips
    if (hasFloaters) {
      const activeFloaters = (towerStore.damageFloaters && towerStore.damageFloaters.length > 0)
        ? towerStore.damageFloaters
        : networkSyncBuffer.damageFloatersPool.filter(f => f.active)

      for (let i = 0; i < activeFloaters.length; i++) {
        const df = activeFloaters[i]
        this.combatGraphics
          .roundRect(df.x - 14, df.y - 7, 28, 14, 4)
          .fill({ color: 0x090d16, alpha: df.alpha * 0.85 })
          .stroke({ width: 1.2, color: df.color, alpha: df.alpha })
      }
    }
  }

  public renderTeammateHovers(teammateHovers: Map<string, any>, project: any): void {
    if (!this.hoverGraphics) return
    this.hoverGraphics.clear()

    if (!teammateHovers || teammateHovers.size === 0) return

    const { tileWidth, tileHeight } = project
    const now = Date.now()

    for (const [_, hover] of teammateHovers.entries()) {
      if (now - hover.lastUpdated > 3000) continue
      const pt = gridToScreen(hover.col, hover.row, tileWidth, tileHeight)
      const colHex = hover.playerColor ? parseInt(hover.playerColor.replace('#', '0x')) : 0x38bdf8

      const hw = tileWidth / 2
      const hh = tileHeight / 2

      this.hoverGraphics
        .poly([
          { x: pt.x, y: pt.y - hh },
          { x: pt.x + hw, y: pt.y },
          { x: pt.x, y: pt.y + hh },
          { x: pt.x - hw, y: pt.y },
        ])
        .fill({ color: colHex, alpha: 0.18 })
        .stroke({ width: 2.5, color: colHex, alpha: 0.9 })
    }
  }

  private unitContainers: Container[] = []

  renderCharacter(
    characterStore: any,
    project: MapProject
  ): void {
    if (!this.isInitialized) return

    if (!characterStore.isEnabled) {
      for (const c of this.unitContainers) c.visible = false
    }

    const { tileWidth, tileHeight } = project
    const isGame = Boolean(characterStore.isGameMode)
    const isDrawing = !isGame && Boolean(characterStore.isDrawingRoute)
    const drawingPathLen = characterStore.drawingPath?.length || 0
    const drawingWpLen = characterStore.drawingWaypoints?.length || 0
    const selectedWpIdx = characterStore.selectedWaypointIndex ?? -1
    const showSpawns = !isGame && (characterStore.showPathTrail !== false || isDrawing || Boolean(characterStore.isSettingSpawnPoint))
    const doorsCount = characterStore.detectedDoors?.length || 0
    const selectedDoorIdx = (characterStore.selectedDoorIndex !== null && characterStore.selectedDoorIndex !== undefined) ? characterStore.selectedDoorIndex : -1
    const spawnMode = characterStore.spawnMode || 'all_doors'
    const currentRouteLen = characterStore.currentActiveRoute?.length || 0

    const wpHash = isDrawing && characterStore.drawingWaypoints 
      ? characterStore.drawingWaypoints.map((p: GridCoord) => `${p.col},${p.row}`).join('|')
      : ''
    const showLines = Boolean(characterStore.showPathTrail !== false)

    const trailSignature = `${isGame}_${isDrawing}_${showLines}_${drawingPathLen}_${drawingWpLen}_${selectedWpIdx}_${wpHash}_${showSpawns}_${doorsCount}_${selectedDoorIdx}_${spawnMode}_${currentRouteLen}`

    // 1. Draw Custom Route / Patrol Trail & Spawn Overlay (Always above all elements)
    if (isDrawing || trailSignature !== this.lastTrailSignature) {
      this.lastTrailSignature = trailSignature
      this.pathTrailGraphics.clear()
      this.spawnOverlayGraphics.clear()
      this.spawnMarkersContainer.removeChildren()

      if (isDrawing) {
        // 1. Render all other existing routes with subtle semi-transparent lines so designer sees whole network!
        const colors = [0x8b5cf6, 0x38bdf8, 0xf59e0b, 0xec4899]
        if (characterStore.detectedDoors && characterStore.detectedDoors.length > 0) {
          characterStore.detectedDoors.forEach((_: any, dIdx: number) => {
            if (dIdx === selectedDoorIdx && characterStore.drawingPath && characterStore.drawingPath.length > 0) {
              return // Skip the active drawing route here
            }
            const otherRoute = characterStore.getRouteForDoor ? characterStore.getRouteForDoor(dIdx) : null
            if (otherRoute && otherRoute.length > 1) {
              const otherPts = otherRoute.map((p: GridCoord) => gridToScreen(p.col, p.row, tileWidth, tileHeight))
              const c = colors[dIdx % colors.length]
              
              this.pathTrailGraphics.moveTo(otherPts[0].x, otherPts[0].y)
              for (let i = 1; i < otherPts.length; i++) {
                this.pathTrailGraphics.lineTo(otherPts[i].x, otherPts[i].y)
              }
              this.pathTrailGraphics.stroke({ width: 3.5, color: c, alpha: 0.35 })

              for (let i = 0; i < otherPts.length; i += 4) {
                this.pathTrailGraphics.circle(otherPts[i].x, otherPts[i].y, 2.5).fill({ color: c, alpha: 0.6 })
              }
            }
          })
        }

        // 2. Render actively drawing route connecting line (expanded path)
        const activeRoute = characterStore.drawingPath
        if (activeRoute && activeRoute.length > 1) {
          const screenPts = activeRoute.map((p: GridCoord) => gridToScreen(p.col, p.row, tileWidth, tileHeight))
          
          // High-contrast dark outline
          this.pathTrailGraphics.moveTo(screenPts[0].x, screenPts[0].y)
          for (let i = 1; i < screenPts.length; i++) {
            this.pathTrailGraphics.lineTo(screenPts[i].x, screenPts[i].y)
          }
          this.pathTrailGraphics.stroke({ width: 8, color: 0x090d16, alpha: 0.95 })

          // Glowing active path stroke
          this.pathTrailGraphics.moveTo(screenPts[0].x, screenPts[0].y)
          for (let i = 1; i < screenPts.length; i++) {
            this.pathTrailGraphics.lineTo(screenPts[i].x, screenPts[i].y)
          }
          this.pathTrailGraphics.stroke({ width: 4.5, color: 0x10b981, alpha: 0.95 })

          // Glowing pulse waypoint dots along path
          for (let i = 0; i < screenPts.length; i += 3) {
            this.pathTrailGraphics
              .circle(screenPts[i].x, screenPts[i].y, 3)
              .fill({ color: 0x34d399, alpha: 0.85 })
              .stroke({ width: 1, color: 0xffffff, alpha: 0.95 })
          }
        }

        // 3. Discrete Numbered Waypoint Circle Badges ([ 1 ], [ 2 ], [ 3 ]...)
        const waypoints: GridCoord[] = characterStore.drawingWaypoints || []
        for (let i = 0; i < waypoints.length; i++) {
          const wp = waypoints[i]
          const pt = gridToScreen(wp.col, wp.row, tileWidth, tileHeight)
          const isSelected = i === selectedWpIdx
          const isStart = i === 0
          const isEnd = i === waypoints.length - 1 && waypoints.length > 1

          // 3.1 Ground Isometric Diamond Footprint
          const groundPoly = getCellPolygon(wp.col, wp.row, tileWidth, tileHeight)
          if (isSelected) {
            this.spawnOverlayGraphics
              .poly(groundPoly)
              .fill({ color: 0xfacc15, alpha: 0.45 })
              .stroke({ width: 2.5, color: 0xfacc15, alpha: 1.0 })
          } else if (isStart) {
            this.spawnOverlayGraphics
              .poly(groundPoly)
              .fill({ color: 0xf59e0b, alpha: 0.3 })
              .stroke({ width: 2, color: 0xf59e0b, alpha: 0.8 })
          } else if (isEnd) {
            this.spawnOverlayGraphics
              .poly(groundPoly)
              .fill({ color: 0x38bdf8, alpha: 0.3 })
              .stroke({ width: 2, color: 0x38bdf8, alpha: 0.8 })
          } else {
            this.spawnOverlayGraphics
              .poly(groundPoly)
              .fill({ color: 0x10b981, alpha: 0.2 })
              .stroke({ width: 1.5, color: 0x10b981, alpha: 0.6 })
          }

          // 3.2 Waypoint Circle Node Badge
          const circleRadius = isSelected ? 15 : (isStart || isEnd ? 13 : 11.5)
          const fillColor = isSelected 
            ? 0xf59e0b 
            : (isStart ? 0xf97316 : (isEnd ? 0x0284c7 : 0x10b981))

          if (isSelected) {
            // Glowing Double Pulse Rings around selected waypoint
            this.pathTrailGraphics
              .circle(pt.x, pt.y, 23)
              .stroke({ width: 2, color: 0xffffff, alpha: 0.8 })
            this.pathTrailGraphics
              .circle(pt.x, pt.y, 18)
              .stroke({ width: 3.5, color: 0xfacc15, alpha: 1.0 })
          } else if (isStart) {
            this.pathTrailGraphics
              .circle(pt.x, pt.y, 16)
              .stroke({ width: 2, color: 0xf59e0b, alpha: 0.7 })
          } else if (isEnd) {
            this.pathTrailGraphics
              .circle(pt.x, pt.y, 16)
              .stroke({ width: 2, color: 0x38bdf8, alpha: 0.7 })
          }

          // Main Circle Body
          this.pathTrailGraphics
            .circle(pt.x, pt.y, circleRadius)
            .fill({ color: fillColor, alpha: 1.0 })
            .stroke({ width: isSelected ? 3 : 2.5, color: 0xffffff, alpha: 1.0 })

          // 3.3 Number Text Badge inside circle (1, 2, 3...)
          const numText = new Text({
            text: String(i + 1),
            style: new TextStyle({
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: isSelected ? 12 : 11,
              fontWeight: '900',
              fill: 0xffffff,
              stroke: { color: 0x090d16, width: 2.5 },
              align: 'center',
            })
          })
          numText.anchor.set(0.5, 0.5)
          numText.position.set(pt.x, pt.y)
          this.spawnMarkersContainer.addChild(numText)

          // 3.4 Floating status tag if selected
          if (isSelected) {
            const selTag = new Text({
              text: `Point #${i + 1} (Click to move)`,
              style: new TextStyle({
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 10,
                fontWeight: 'bold',
                fill: 0xfacc15,
                stroke: { color: 0x090d16, width: 3 },
                align: 'center',
              })
            })
            selTag.anchor.set(0.5, 1.0)
            selTag.position.set(pt.x, pt.y - 26)
            this.spawnMarkersContainer.addChild(selTag)
          }
        }
      } else if (showSpawns) {
        // Draw route trails for all active doors or single door (Rendered on top!)
        if (characterStore.showPathTrail !== false) {
          const doors = characterStore.detectedDoors || []
          const routesToDraw: { route: GridCoord[]; dIdx: number }[] = (doors.length > 0)
            ? doors.map((_: any, idx: number) => ({
                route: characterStore.getRouteForDoor ? characterStore.getRouteForDoor(idx) : characterStore.currentActiveRoute,
                dIdx: idx
              }))
            : [{ route: characterStore.currentActiveRoute, dIdx: 0 }]

          const colors = [0x10b981, 0x38bdf8, 0xf59e0b, 0xec4899, 0x8b5cf6, 0x06b6d4]
          const isAnyRouteSelected = selectedDoorIdx >= 0

          routesToDraw.forEach(({ route, dIdx }) => {
            if (!route || route.length <= 1) return
            const pts = route.map(p => gridToScreen(p.col, p.row, tileWidth, tileHeight))
            const isSelectedRoute = (selectedDoorIdx >= 0 && dIdx === selectedDoorIdx)
            const baseColor = colors[dIdx % colors.length]
            const c = isSelectedRoute ? 0x10b981 : baseColor
            const lineAlpha = isSelectedRoute ? 1.0 : (isAnyRouteSelected ? 0.32 : 0.75)
            const lineWidth = isSelectedRoute ? 4.5 : 2.5
            const outlineWidth = isSelectedRoute ? 7.5 : 4.5

            // 1. Dark outline for high contrast over any tile/building
            this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) {
              this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
            }
            this.pathTrailGraphics.stroke({ width: outlineWidth, color: 0x090d16, alpha: isSelectedRoute ? 0.95 : (isAnyRouteSelected ? 0.4 : 0.65) })

            // 2. Glowing colored route stroke (with radiant halo for selected route)
            if (isSelectedRoute) {
              this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
              for (let i = 1; i < pts.length; i++) {
                this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
              }
              this.pathTrailGraphics.stroke({ width: lineWidth + 4, color: 0x34d399, alpha: 0.35 })
            }

            this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) {
              this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
            }
            this.pathTrailGraphics.stroke({ width: lineWidth, color: c, alpha: lineAlpha })

            // 3. Glowing waypoint beads
            const step = isSelectedRoute ? 2 : 4
            for (let i = 0; i < pts.length; i += step) {
              this.pathTrailGraphics
                .circle(pts[i].x, pts[i].y, isSelectedRoute ? 3.5 : 2.5)
                .fill({ color: c, alpha: lineAlpha })
                .stroke({ width: isSelectedRoute ? 1.5 : 1, color: 0xffffff, alpha: isSelectedRoute ? 0.95 : 0.5 })
            }
          })
        }
      }

      // 1.5 Render Glowing Top-Layer Spawn Point Beacons & Badges on Map (Always above all elements)
      if (showSpawns && characterStore.detectedDoors && characterStore.detectedDoors.length > 0) {
        characterStore.detectedDoors.forEach((door: any, dIdx: number) => {
          const c = door.spawnCol !== undefined ? door.spawnCol : door.col
          const r = door.spawnRow !== undefined ? door.spawnRow : door.row
          const pt = gridToScreen(c, r, tileWidth, tileHeight)
          const isSelected = selectedDoorIdx >= 0 && selectedDoorIdx === dIdx
          const beaconColor = isSelected ? 0xf59e0b : 0x10b981
          const poly = getCellPolygon(c, r, tileWidth, tileHeight)

          // 1. Isometric glowing floor diamond
          this.spawnOverlayGraphics
            .poly(poly)
            .fill({ color: beaconColor, alpha: isSelected ? 0.45 : 0.28 })
            .stroke({ width: isSelected ? 3 : 2, color: beaconColor, alpha: 1.0 })

          // 2. Outer glowing pulse ring
          this.spawnOverlayGraphics
            .ellipse(pt.x, pt.y, tileWidth * 0.4, tileHeight * 0.4)
            .stroke({ width: isSelected ? 2 : 1.5, color: beaconColor, alpha: 0.85 })

          // 3. Central anchor bullseye on ground
          this.spawnOverlayGraphics
            .circle(pt.x, pt.y, isSelected ? 5.5 : 4)
            .fill({ color: 0xffffff, alpha: 1.0 })
            .stroke({ width: 2, color: beaconColor, alpha: 1.0 })

          // 4. Pin stalk from ground point up to floating badge
          const badgeY = pt.y - Math.max(38, tileHeight * 0.75)
          this.spawnOverlayGraphics
            .moveTo(pt.x, pt.y)
            .lineTo(pt.x, badgeY + 8)
            .stroke({ width: 2.5, color: isSelected ? 0xf59e0b : 0x34d399, alpha: 0.95 })

          this.spawnOverlayGraphics
            .circle(pt.x, badgeY + 8, 3.5)
            .fill({ color: beaconColor, alpha: 1.0 })

          // 5. Floating badge background pill card (Clean label without duplicated coordinates)
          const rawName = door.name || `Route ${dIdx + 1}`
          const cleanName = rawName.replace(/\s*\(\d+,\s*\d+\)/g, '').trim() || `Route ${dIdx + 1}`
          const labelText = `${cleanName} (${c}, ${r})`
          const cardW = Math.max(80, labelText.length * 6.8 + 16)
          const cardH = 22
          this.spawnOverlayGraphics
            .roundRect(pt.x - cardW / 2, badgeY - cardH + 6, cardW, cardH, 6)
            .fill({ color: 0x090d16, alpha: 0.92 })
            .stroke({ width: isSelected ? 2 : 1.5, color: beaconColor, alpha: 0.95 })

          // 6. Floating text label badge
          const badgeText = new Text({
            text: labelText,
            style: new TextStyle({
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 10,
              fontWeight: 'bold',
              fill: isSelected ? 0xfef08a : 0xf1f5f9,
              align: 'center',
            })
          })
          badgeText.anchor.set(0.5, 0.5)
          badgeText.position.set(pt.x, badgeY - cardH / 2 + 6)
          this.spawnMarkersContainer.addChild(badgeText)
        })
      }
    }

    // 2. Render Multiple Character Units
    const units = (networkSyncBuffer.renderUnitsList.length > 0)
      ? networkSyncBuffer.renderUnitsList
      : (characterStore.units || [])

    // Ensure container pool size matches units count
    while (this.unitContainers.length < units.length) {
      const container = new Container()
      container.sortableChildren = true

      const shadow = new Graphics()
      shadow.zIndex = 0
      const shadowRadiusX = tileWidth * 0.18
      const shadowRadiusY = tileHeight * 0.18
      shadow
        .ellipse(0, 0, shadowRadiusX, shadowRadiusY)
        .fill({ color: 0x000000, alpha: 0.4 })

      const sprite = new Sprite()
      sprite.zIndex = 1

      const marker = new Graphics()
      marker.zIndex = 2

      container.addChild(shadow)
      container.addChild(sprite)
      container.addChild(marker)

      this.layersContainer.addChild(container)
      this.unitContainers.push(container)
    }

    // Hide extra containers
    for (let i = units.length; i < this.unitContainers.length; i++) {
      this.unitContainers[i].visible = false
    }

    let needsDepthSort = false
    if (this.unitLastDepths.length !== units.length) {
      needsDepthSort = true
      this.unitLastDepths = new Array(units.length).fill(-1)
    }

    // 3. Update each active unit
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]
      const container = this.unitContainers[i]

      if (!unit.isSpawned || (unit.isDead && (unit.deathFade !== undefined && unit.deathFade <= 0))) {
        if (container.visible) {
          container.visible = false
          this.unitLastDepths[i] = -1
        }
        continue
      }

      container.visible = true

      const shadow = container.getChildAt(0) as Graphics
      const sprite = container.getChildAt(1) as Sprite
      const marker = container.getChildAt(2) as Graphics

      // Get Texture from AssetManager
      const actionPrefix = unit.action || 'Idle'
      const frame = actionPrefix === 'Idle' ? '0' : (unit.frameIndex || 0)
      const texture = assetManager.getCharacterTexture(unit.direction, actionPrefix, frame, unit.characterModel || 'male')

      const fadeAlpha = unit.isDead ? Math.max(0, unit.deathFade ?? 1.0) : 1.0

      if (texture) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        sprite.visible = true
        sprite.alpha = fadeAlpha

        const modelKey = String(unit.characterModel || 'male').toLowerCase()
        const modelMeta = (characterManifest as any)?.[modelKey]
        const anchorX = modelMeta?.anchorX ?? 0.5
        const anchorY = modelMeta?.anchorY ?? (modelKey === 'male' ? 0.898 : 0.67)
        const cellW = modelMeta?.cellWidth || 256
        const baseScale = (tileWidth * 1.0) / cellW
        const scaleMult = modelMeta?.scale ?? (modelKey === 'warrior' ? 1.48 : (modelKey === 'demon' ? 1.35 : (modelKey === 'female' ? 1.15 : (modelKey === 'male' ? 0.95 : 1.0))))
        const globalScale = Number(characterStore?.unitScaleMultiplier) || 1.0
        const customUnitScale = (Number((unit as any).unitScale) || 1.0) * globalScale

        sprite.scale.set(baseScale * (modelKey === 'male' ? 0.95 : scaleMult) * customUnitScale)
        sprite.anchor.set(anchorX, anchorY)

        // Apply Unit Variant GPU Tinting & Real Dynamic Elemental Particle Effects
        const variant = (unit.unitVariant || 'normal') as UnitVariantType
        sprite.tint = getVariantTint(variant, unit.variantTint)

        if (!unit.isDead) {
          renderPixiUnitEffect({
            marker,
            shadow,
            variant,
            tileWidth,
            tileHeight,
            customUnitScale,
            fadeAlpha,
            unitIndex: i,
            animTime: performance.now() * 0.001
          })
        } else {
          shadow.visible = false
          marker.visible = false
        }
      } else {
        shadow.visible = false
        marker.visible = false
      }

      // Position (with customizable vertical height elevation offset)
      const unitElev = Number(characterStore?.unitElevation) || 0
      const unitOffsetY = (unit.offsetY ?? 0) + unitElev
      container.position.set(unit.screenX, unit.screenY)
      sprite.position.set(0, -unitOffsetY)
      marker.position.set(0, -unitOffsetY)
      shadow.position.set(0, 0)
      shadow.scale.set(Math.max(0.4, 1.0 - (unitOffsetY / 250)))

      // Depth sort tracking on 3D Entity Plane (Smooth continuous depth based on actual unit position)
      const charDepth = 100000 + Math.round((unit.currentCol + unit.currentRow) * 1000) + 300 + (i % 10)
      if (container.zIndex !== charDepth) {
        container.zIndex = charDepth
        needsDepthSort = true
      }
      this.unitLastDepths[i] = charDepth
    }

    if (needsDepthSort) {
      this.layersContainer.sortChildren()
    }
  }

  screenPointToGrid(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    project: MapProject
  ): { worldX: number; worldY: number; gridCoord: GridCoord } {
    const rawX = clientX - canvasRect.left
    const rawY = clientY - canvasRect.top

    const worldX = (rawX - this.worldContainer.position.x) / this.worldContainer.scale.x
    const worldY = (rawY - this.worldContainer.position.y) / this.worldContainer.scale.y

    const gridCoord = screenToGrid(worldX, worldY, project.tileWidth, project.tileHeight)

    return { worldX, worldY, gridCoord }
  }

  async exportImage(options: {
    includeGrid?: boolean
    transparentBg?: boolean
    project: MapProject
    assetMap: Map<string, AssetItem>
  }): Promise<string> {
    if (!this.isInitialized) return ''

    this.hoverGraphics.visible = false
    this.selectionGraphics.visible = false
    this.previewContainer.visible = false
    if (!options.includeGrid) {
      this.gridContainer.visible = false
    }

    try {
      const imageUri = await this.app.renderer.extract.base64(this.worldContainer)
      return imageUri
    } finally {
      this.hoverGraphics.visible = true
      this.selectionGraphics.visible = true
      this.previewContainer.visible = true
      this.gridContainer.visible = true
    }
  }

  stopTicker(): void {
    this.onTick = undefined
  }

  clearCombatVisuals(): void {
    if (this.combatGraphics) {
      this.combatGraphics.clear()
    }
  }

  clearCharacterVisuals(): void {
    if (this.pathTrailGraphics) {
      this.pathTrailGraphics.clear()
    }
    for (let i = 0; i < this.unitContainers.length; i++) {
      this.unitContainers[i].visible = false
    }
    this.characterContainer.visible = false
  }

  clearOverlayVisuals(): void {
    if (this.hoverGraphics) this.hoverGraphics.clear()
    if (this.selectionGraphics) this.selectionGraphics.clear()
    if (this.previewContainer) this.previewContainer.removeChildren()
  }

  destroy(): void {
    if (this.isInitialized) {
      this.stopTicker()
      this.app.destroy(true, { children: true, texture: true })
      this.isInitialized = false
    }
  }
}

