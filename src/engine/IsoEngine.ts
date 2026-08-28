import { Application, Container, Graphics, Sprite, Texture, Text, TextStyle, ImageSource } from 'pixi.js'
import { MapProject, AssetItem, GridCoord, Point2D, SelectedElementRef } from '../types/map'
import { 
  gridToScreen, 
  screenToGrid, 
  getCellPolygon, 
  getFootprintPolygon,
  getFootprintBaseCenter,
  isInsideGrid 
} from '../utils/isometric'

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

  // Character Container & Sprites
  public pathTrailGraphics: Graphics
  public characterContainer: Container
  public characterShadow: Graphics
  public characterSprite: Sprite
  public characterMarker: Graphics
  private characterTextures = new Map<string, Texture>()
  public onTick?: (deltaSec: number) => void

  // Tower Defense & Combat Visuals
  public combatGraphics: Graphics
  private towerTextures = new Map<string, Texture>()
  private towerContainerMap = new Map<string, Container>()

  // Sprites pool & Cache per layer: Map<layerId, Map<itemId, Sprite>>
  private layerSpriteMaps = new Map<string, Map<string, Sprite>>()
  private textureCache = new Map<string, Texture>()
  private loadingPromises = new Map<string, Promise<Texture | null>>()

  constructor() {
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

    // Character elements
    this.pathTrailGraphics = new Graphics()
    this.characterContainer = new Container()
    this.characterShadow = new Graphics()
    this.characterSprite = new Sprite()
    this.characterMarker = new Graphics()
  }

  private lastTrailSignature = ''
  private lastSelectedTowerId: string | null = null
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
      antialias: true,
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

    // Path trail under objects
    this.worldContainer.addChild(this.pathTrailGraphics)

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
    this.worldContainer.addChild(this.combatGraphics)

    // Load character sprites and tower structures properly with ImageSource
    await this.loadCharacterTextures()
    await this.loadTowerTextures()

    // Ticker animation loop
    this.app.ticker.add((ticker) => {
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

  centerMap(project: MapProject, viewWidth: number, viewHeight: number): Point2D {
    const midCol = (project.cols - 1) / 2
    const midRow = (project.rows - 1) / 2

    const centerScreen = gridToScreen(midCol, midRow, project.tileWidth, project.tileHeight)

    const panX = viewWidth / 2 - centerScreen.x
    const panY = viewHeight / 2 - centerScreen.y

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
    const centerCol = Math.floor(cols / 2)
    const centerRow = Math.floor(rows / 2)

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

      // Exact Symmetry Axis Lines directly connecting the centers of every cell
      if (showSymmetry) {
        // Col symmetry axis: from exact center of (centerCol, 0) to exact center of (centerCol, rows - 1)
        const colStart = gridToScreen(centerCol, 0, tileWidth, tileHeight)
        const colEnd = gridToScreen(centerCol, rows - 1, tileWidth, tileHeight)

        this.borderGraphics
          .moveTo(colStart.x, colStart.y)
          .lineTo(colEnd.x, colEnd.y)
          .stroke({ width: 2, color: 0x10b981, alpha: 0.65 })

        // Row symmetry axis: from exact center of (0, centerRow) to exact center of (cols - 1, centerRow)
        const rowStart = gridToScreen(0, centerRow, tileWidth, tileHeight)
        const rowEnd = gridToScreen(cols - 1, centerRow, tileWidth, tileHeight)

        this.borderGraphics
          .moveTo(rowStart.x, rowStart.y)
          .lineTo(rowEnd.x, rowEnd.y)
          .stroke({ width: 2, color: 0x10b981, alpha: 0.65 })
      }

      // Center Origin Diamond Highlight & Glowing Center Point
      if (showCenter) {
        const centerPoly = getCellPolygon(centerCol, centerRow, tileWidth, tileHeight)
        const centerPt = gridToScreen(centerCol, centerRow, tileWidth, tileHeight)

        this.borderGraphics
          .poly(centerPoly)
          .fill({ color: 0x10b981, alpha: 0.28 })
          .stroke({ width: 2.5, color: 0x34d399, alpha: 0.95 })

        // Central Bullseye Dot
        this.borderGraphics
          .circle(centerPt.x, centerPt.y, 5)
          .fill({ color: 0x10b981, alpha: 1.0 })
          .stroke({ width: 2, color: 0xffffff, alpha: 0.95 })

        // Center Pin Badge
        const centerBadge = new Text({
          text: `🎯 MARKAZ (${centerCol}, ${centerRow})`,
          style: new TextStyle({
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: Math.max(10, Math.min(12, tileWidth / 9)),
            fontWeight: 'bold',
            fill: 0x34d399,
            stroke: { color: 0x090d16, width: 3 },
            align: 'center',
          })
        })
        centerBadge.anchor.set(0.5, 1.4)
        centerBadge.position.set(centerPt.x, centerPt.y)
        this.coordsContainer.addChild(centerBadge)
      }
    }

    if (showCoords) {
      const textStyle = new TextStyle({
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: Math.max(9, Math.min(12, tileWidth / 10)),
        fill: 0x94a3b8,
        align: 'center',
      })

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (c === centerCol && r === centerRow) continue
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

    if (activeTool === 'eraser') {
      strokeColor = 0xef4444
      fillColor = 0xef4444
    } else if (activeTool === 'bucket') {
      strokeColor = 0x10b981
      fillColor = 0x10b981
    } else if (activeTool === 'picker') {
      strokeColor = 0xf59e0b
      fillColor = 0xf59e0b
    } else if (!activeAsset) {
      strokeColor = 0xa855f7
      fillColor = 0xa855f7
    }

    this.hoverGraphics
      .poly(poly)
      .fill({ color: fillColor, alpha: 0.28 })
      .stroke({ width: 2, color: strokeColor, alpha: 0.95 })

    // Ghost preview fitted to 1 tile width
    if (activeAsset) {
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
    selected: SelectedElementRef | null,
    project: MapProject,
    spanX = 1,
    spanY = 1
  ): void {
    this.selectionGraphics.clear()
    if (!selected) return

    const { tileWidth, tileHeight } = project
    const poly = getFootprintPolygon(selected.col, selected.row, spanX, spanY, tileWidth, tileHeight)

    this.selectionGraphics
      .poly(poly)
      .fill({ color: 0xa855f7, alpha: 0.35 })
      .stroke({ width: 2.5, color: 0xc084fc, alpha: 1.0 })
  }

  renderPreviewCells(
    cells: GridCoord[],
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    if (cells.length === 0) return

    const { tileWidth, tileHeight } = project
    const isEraser = activeTool === 'eraser'
    const color = isEraser ? 0xef4444 : 0x6366f1

    for (const cell of cells) {
      if (!isInsideGrid(cell.col, cell.row, project.cols, project.rows)) continue
      const poly = getCellPolygon(cell.col, cell.row, tileWidth, tileHeight)
      this.hoverGraphics
        .poly(poly)
        .fill({ color, alpha: 0.35 })
        .stroke({ width: 1.5, color, alpha: 0.9 })

      if (!isEraser && activeAsset) {
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

  public async preloadAsset(asset: AssetItem): Promise<Texture | null> {
    if (!asset || !asset.src) return null
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
    if (!asset || !asset.src) return null

    if (this.textureCache.has(asset.id)) {
      return this.textureCache.get(asset.id)!
    }

    this.preloadAsset(asset)

    try {
      const texture = Texture.from(asset.src)
      if (texture) {
        this.textureCache.set(asset.id, texture)
      }
      return texture
    } catch {
      return null
    }
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

      for (const items of Object.values(layer.tiles)) {
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

          const spanX = item.spanX || asset.spanX || 1
          const spanY = item.spanY || asset.spanY || 1

          // Strict 1-tile width auto-fitting: image width always matches tileWidth * spanX
          const baseScale = (project.tileWidth * spanX) / (asset.width || project.tileWidth)
          const scale = baseScale * (item.scale || 1.0) * (asset.scale || 1.0)

          const baseCenter = getFootprintBaseCenter(item.x, item.y, spanX, spanY, project.tileWidth, project.tileHeight)

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

          for (let cx = item.x; cx < item.x + spanX; cx++) {
            for (let cy = item.y; cy < item.y + spanY; cy++) {
              const specificZ = item.cellZIndex?.[`${cx},${cy}`] ?? item.zIndex ?? 0
              const effectiveGridDepth = (cx + cy) + depthOffset
              // Layer priority (100k) + Effective Grid Depth with Relative Offset (1k) + Specific Z (50) + Tie-breaker (0.1)
              const cellScore = layerIdx * 100000 + effectiveGridDepth * 1000 + specificZ * 50 + (cx - cy) * 0.1
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
    try {
      const charModules = import.meta.glob<string>('../assets/characters/male/*.png', { eager: true, import: 'default' })
      const entries = Object.entries(charModules)

      const loadPromises = entries.map(([path, url]) => {
        return new Promise<void>((resolve) => {
          const filename = path.split('/').pop() || ''
          const baseName = filename.replace(/\.[^/.]+$/, '')

          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const source = new ImageSource({ resource: img })
              const texture = new Texture({ source })
              this.characterTextures.set(baseName, texture)
            } catch (e) {
              console.warn('Failed to create ImageSource for char:', baseName, e)
            }
            resolve()
          }
          img.onerror = (e) => {
            console.warn('Failed to load image for char:', baseName, e)
            resolve()
          }
          img.src = url
        })
      })

      await Promise.all(loadPromises)
      console.log(`Loaded ${this.characterTextures.size} character textures successfully.`)
    } catch (e) {
      console.warn('Failed to glob load character textures:', e)
    }
  }

  async loadTowerTextures(): Promise<void> {
    try {
      const towerModules = import.meta.glob<string>('../assets/builds/*.png', { eager: true, import: 'default' })
      const entries = Object.entries(towerModules)

      const loadPromises = entries.map(([path, url]) => {
        return new Promise<void>((resolve) => {
          const filename = path.split('/').pop() || ''
          const baseName = filename.replace(/\.[^/.]+$/, '')

          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const source = new ImageSource({ resource: img })
              const texture = new Texture({ source })
              this.towerTextures.set(filename, texture)
              this.towerTextures.set(baseName, texture)
            } catch (e) {
              console.warn('Failed to create ImageSource for tower:', filename, e)
            }
            resolve()
          }
          img.onerror = (e) => {
            console.warn('Failed to load image for tower:', filename, e)
            resolve()
          }
          img.src = url
        })
      })

      await Promise.all(loadPromises)
      console.log(`Loaded ${this.towerTextures.size} tower textures successfully.`)
    } catch (e) {
      console.warn('Failed to glob load tower textures:', e)
    }
  }

  renderTowersAndCombat(
    towerStore: {
      placedTowers: any[]
      selectedPlacedTowerId: string | null
      activeBuildTowerId: string | null
      activeBlueprint?: any
      projectiles: any[]
      explosionRings: any[]
      damageFloaters: any[]
    },
    project: MapProject,
    characterStore: {
      units: any[]
    },
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

      // Choose texture dynamically from blueprint assetPath, assetId, assetName or general map assets
      const bp = (towerStore as any).blueprints?.find((b: any) => b.id === tower.blueprintId)
      
      let texture: Texture | null = null

      if (bp) {
        const assetName = bp.assetName || ''
        const baseName = assetName.replace(/\.[^/.]+$/, '')
        const assetPath = bp.assetPath || ''
        const assetId = bp.assetId || ''

        // 1. Check in towerTextures
        if (assetName && this.towerTextures.has(assetName)) {
          texture = this.towerTextures.get(assetName)!
        } else if (baseName && this.towerTextures.has(baseName)) {
          texture = this.towerTextures.get(baseName)!
        } else if (assetPath && this.towerTextures.has(assetPath)) {
          texture = this.towerTextures.get(assetPath)!
        }

        // 2. Check in global textureCache (for map assets/structures/columns)
        if (!texture) {
          if (assetId && this.textureCache.has(assetId)) {
            texture = this.textureCache.get(assetId)!
          } else if (this.textureCache.has(`sprite-${baseName}`)) {
            texture = this.textureCache.get(`sprite-${baseName}`)!
          } else if (this.textureCache.has(baseName)) {
            texture = this.textureCache.get(baseName)!
          } else if (this.textureCache.has(assetName)) {
            texture = this.textureCache.get(assetName)!
          } else if (assetPath && this.textureCache.has(assetPath)) {
            texture = this.textureCache.get(assetPath)!
          }
        }

        // 3. Preload texture from assetPath if not loaded yet
        if (!texture && assetPath) {
          try {
            const img = new window.Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              try {
                const source = new ImageSource({ resource: img })
                const tex = new Texture({ source })
                this.towerTextures.set(assetName, tex)
                this.towerTextures.set(baseName, tex)
                this.towerTextures.set(assetPath, tex)
                this.textureCache.set(assetPath, tex)
                if (assetId) this.textureCache.set(assetId, tex)
                sprite.texture = tex
              } catch {}
            }
            img.src = assetPath
          } catch {}
        }
      }

      if (!texture) {
        texture = this.towerTextures.values().next().value || null
      }

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

      // Selection Ring (Only redraw when selection state changes)
      const isSelected = towerStore.selectedPlacedTowerId === tower.id
      const wasSelected = (container as any)._wasSelected
      if (isSelected !== wasSelected) {
        selection.clear()
        if (isSelected) {
          selection
            .ellipse(0, 0, tileWidth * 0.38, tileHeight * 0.38)
            .stroke({ width: 2.5, color: 0x38bdf8, alpha: 0.95 })
        }
        ;(container as any)._wasSelected = isSelected
      }

      container.position.set(tower.screenX, tower.screenY)
      container.zIndex = 100000 + (tower.col + tower.row) * 1000 + 450
    }

    // 2. Combat Overlays in combatGraphics
    const hasProjectiles = towerStore.projectiles && towerStore.projectiles.length > 0
    const hasRings = towerStore.explosionRings && towerStore.explosionRings.length > 0
    const hasFloaters = towerStore.damageFloaters && towerStore.damageFloaters.length > 0
    const towerToHighlight = towerStore.placedTowers.find(t => t.id === towerStore.selectedPlacedTowerId)
    const hasRangePreview = Boolean(towerToHighlight || (towerStore.activeBuildTowerId && hoveredGridCoord))
    const units = characterStore.units || []
    const hasUnits = units.length > 0

    if (!hasProjectiles && !hasRings && !hasFloaters && !hasRangePreview && !hasUnits) {
      this.combatGraphics.clear()
      return
    }

    this.combatGraphics.clear()

    // 2.1 Attack Range Indicator (When inspecting a tower or hovering while placing)
    if (towerToHighlight) {
      const r = towerToHighlight.range
      const rx = r * tileWidth * 0.5
      const ry = r * tileHeight * 0.5

      this.combatGraphics
        .ellipse(towerToHighlight.screenX, towerToHighlight.screenY, rx, ry)
        .fill({ color: 0x38bdf8, alpha: 0.12 })
        .stroke({ width: 2, color: 0x38bdf8, alpha: 0.85 })
    } else if (towerStore.activeBuildTowerId && hoveredGridCoord) {
      const bp = towerStore.activeBlueprint
      const r = bp ? bp.range : 3.5
      const rx = r * tileWidth * 0.5
      const ry = r * tileHeight * 0.5
      const pt = gridToScreen(hoveredGridCoord.col, hoveredGridCoord.row, tileWidth, tileHeight)

      this.combatGraphics
        .ellipse(pt.x, pt.y, rx, ry)
        .fill({ color: 0x10b981, alpha: 0.14 })
        .stroke({ width: 2, color: 0x10b981, alpha: 0.85 })
    }

    // 2.2 Flying Animated Projectiles (Distinguished by projectileType)
    if (hasProjectiles) {
      for (let i = 0; i < towerStore.projectiles.length; i++) {
        const proj = towerStore.projectiles[i]
        const type = proj.projectileType || 'cannonball'
        const angle = Math.atan2(proj.targetY - proj.startY, proj.targetX - proj.startX)

        if (type === 'cannonball') {
          // --- 💣 CANNONBALL: Heavy dark iron sphere + trailing smoke puffs + spark ---
          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(proj.currentX, proj.currentY)
            .stroke({ width: 3.5, color: 0x64748b, alpha: 0.35 })

          // Dark iron ball
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 6.0)
            .fill({ color: 0x1e293b, alpha: 1.0 })
            .stroke({ width: 1.5, color: 0x475569, alpha: 1.0 })

          // Metallic specular shine
          this.combatGraphics
            .circle(proj.currentX - 2, proj.currentY - 2, 1.8)
            .fill({ color: 0x94a3b8, alpha: 0.9 })

          // Fuse spark
          this.combatGraphics
            .circle(proj.currentX + Math.cos(angle + Math.PI) * 5, proj.currentY + Math.sin(angle + Math.PI) * 5, 2.0)
            .fill({ color: 0xf59e0b, alpha: 1.0 })

        } else if (type === 'fireball') {
          // --- 🔥 FIREBALL: Blazing flaming meteor with fiery trailing embers ---
          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(proj.currentX, proj.currentY)
            .stroke({ width: 4.5, color: 0xea580c, alpha: 0.5 })

          // Outer red flame halo
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 8.5)
            .fill({ color: 0xef4444, alpha: 0.65 })

          // Mid orange flame
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 5.5)
            .fill({ color: 0xf97316, alpha: 0.9 })

          // Molten yellow/white core
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 2.8)
            .fill({ color: 0xfef08a, alpha: 1.0 })

        } else if (type === 'arrow') {
          // --- 🏹 ARROW: Oriented wood shaft + sharp steel tip + fletching feathers ---
          const arrowLength = 16
          const tailX = proj.currentX - Math.cos(angle) * arrowLength
          const tailY = proj.currentY - Math.sin(angle) * arrowLength

          // Speed trail
          this.combatGraphics
            .moveTo(tailX - Math.cos(angle) * 8, tailY - Math.sin(angle) * 8)
            .lineTo(tailX, tailY)
            .stroke({ width: 1.2, color: 0xfbbf24, alpha: 0.35 })

          // Wood shaft
          this.combatGraphics
            .moveTo(tailX, tailY)
            .lineTo(proj.currentX, proj.currentY)
            .stroke({ width: 2.2, color: 0x78350f, alpha: 1.0 })

          // Steel arrowhead (triangle tip)
          const tipX = proj.currentX + Math.cos(angle) * 3
          const tipY = proj.currentY + Math.sin(angle) * 3
          const leftWingX = proj.currentX + Math.cos(angle + 2.5) * 4.5
          const leftWingY = proj.currentY + Math.sin(angle + 2.5) * 4.5
          const rightWingX = proj.currentX + Math.cos(angle - 2.5) * 4.5
          const rightWingY = proj.currentY + Math.sin(angle - 2.5) * 4.5

          this.combatGraphics
            .poly([tipX, tipY, leftWingX, leftWingY, rightWingX, rightWingY])
            .fill({ color: 0xe2e8f0, alpha: 1.0 })
            .stroke({ width: 1, color: 0x475569, alpha: 1.0 })

          // Feather fletchings at tail
          const featherLeftX = tailX + Math.cos(angle + 2.4) * 3.5
          const featherLeftY = tailY + Math.sin(angle + 2.4) * 3.5
          const featherRightX = tailX + Math.cos(angle - 2.4) * 3.5
          const featherRightY = tailY + Math.sin(angle - 2.4) * 3.5

          this.combatGraphics
            .moveTo(tailX, tailY).lineTo(featherLeftX, featherLeftY).stroke({ width: 1.5, color: 0xef4444, alpha: 0.9 })
          this.combatGraphics
            .moveTo(tailX, tailY).lineTo(featherRightX, featherRightY).stroke({ width: 1.5, color: 0xef4444, alpha: 0.9 })

        } else {
          // --- ⚡ MAGIC BOLT: Cyan/violet arcane plasma star with laser lightning beam ---
          this.combatGraphics
            .moveTo(proj.startX, proj.startY)
            .lineTo(proj.currentX, proj.currentY)
            .stroke({ width: 2.5, color: 0x38bdf8, alpha: 0.6 })

          // Outer cyan-purple plasma aura
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 7.5)
            .fill({ color: 0x38bdf8, alpha: 0.55 })

          // Inner glowing electric orb
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 4.0)
            .fill({ color: 0x818cf8, alpha: 0.85 })

          // Bright white electric spark
          this.combatGraphics
            .circle(proj.currentX, proj.currentY, 2.2)
            .fill({ color: 0xffffff, alpha: 1.0 })

          // 4-pointed cross star sparkle
          this.combatGraphics
            .moveTo(proj.currentX - 5, proj.currentY).lineTo(proj.currentX + 5, proj.currentY).stroke({ width: 1.2, color: 0xffffff, alpha: 0.8 })
          this.combatGraphics
            .moveTo(proj.currentX, proj.currentY - 5).lineTo(proj.currentX, proj.currentY + 5).stroke({ width: 1.2, color: 0xffffff, alpha: 0.8 })
        }
      }
    }

    // 2.3 Explosion Shockwave Rings
    if (hasRings) {
      for (let i = 0; i < towerStore.explosionRings.length; i++) {
        const ring = towerStore.explosionRings[i]
        const rx = ring.radius
        const ry = ring.radius * 0.5
        this.combatGraphics
          .ellipse(ring.x, ring.y, rx, ry)
          .stroke({ width: 3, color: ring.color, alpha: ring.alpha })
        this.combatGraphics
          .ellipse(ring.x, ring.y, rx * 0.65, ry * 0.65)
          .fill({ color: ring.color, alpha: ring.alpha * 0.25 })
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

        const barW = 32
        const barH = 4
        const barX = unit.screenX - barW / 2
        const barY = unit.screenY - tileHeight * 1.25

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
      for (let i = 0; i < towerStore.damageFloaters.length; i++) {
        const df = towerStore.damageFloaters[i]
        this.combatGraphics
          .roundRect(df.x - 14, df.y - 7, 28, 14, 4)
          .fill({ color: 0x090d16, alpha: df.alpha * 0.85 })
          .stroke({ width: 1.2, color: df.color, alpha: df.alpha })
      }
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
      this.pathTrailGraphics.clear()
      this.lastTrailSignature = ''
      return
    }

    const { tileWidth, tileHeight } = project
    const isDrawing = Boolean(characterStore.isDrawingRoute)
    const drawingPathLen = characterStore.drawingPath?.length || 0
    const showTrail = Boolean(characterStore.showPathTrail)
    const doorsCount = characterStore.detectedDoors?.length || 0
    const selectedDoorIdx = characterStore.selectedDoorIndex || 0
    const spawnMode = characterStore.spawnMode || 'all_doors'
    const currentRouteLen = characterStore.currentActiveRoute?.length || 0

    const trailSignature = `${isDrawing}_${drawingPathLen}_${showTrail}_${doorsCount}_${selectedDoorIdx}_${spawnMode}_${currentRouteLen}`

    // 1. Draw Custom Route / Patrol Trail (Cached unless signature changes or active drawing)
    if (isDrawing || trailSignature !== this.lastTrailSignature) {
      this.lastTrailSignature = trailSignature
      this.pathTrailGraphics.clear()

      if (isDrawing) {
        const activeRoute = characterStore.drawingPath
        if (activeRoute && activeRoute.length > 0) {
          const pts = (activeRoute as GridCoord[]).map((p: GridCoord) => gridToScreen(p.col, p.row, tileWidth, tileHeight))

          if (pts.length > 1) {
            this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) {
              this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
            }
            this.pathTrailGraphics.stroke({ width: 5, color: 0x10b981, alpha: 0.5 })

            this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) {
              this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
            }
            this.pathTrailGraphics.stroke({ width: 2.5, color: 0x6ee7b7, alpha: 1.0 })
          }

          // Draw start door marker & waypoint dots
          for (let i = 0; i < pts.length; i++) {
            const isStart = i === 0
            const isEnd = i === pts.length - 1
            const radius = isStart || isEnd ? 6 : 3.5
            const colr = isStart ? 0xf59e0b : (isEnd ? 0x38bdf8 : 0x10b981)

            this.pathTrailGraphics
              .circle(pts[i].x, pts[i].y, radius)
              .fill({ color: colr, alpha: 1.0 })
              .stroke({ width: 2, color: 0xffffff, alpha: 0.95 })
          }
        }
      } else if (showTrail) {
        // Draw trails for all active doors or single door
        const routesToDraw: GridCoord[][] = (spawnMode === 'all_doors' && characterStore.detectedDoors && characterStore.detectedDoors.length > 1)
          ? characterStore.detectedDoors.map((_: any, idx: number) => characterStore.getRouteForDoor ? characterStore.getRouteForDoor(idx) : characterStore.currentActiveRoute)
          : [characterStore.currentActiveRoute]

        const colors = [0x8b5cf6, 0x38bdf8, 0xf59e0b, 0x10b981]

        routesToDraw.forEach((route, rIdx) => {
          if (!route || route.length <= 1) return
          const pts = route.map(p => gridToScreen(p.col, p.row, tileWidth, tileHeight))
          const c = colors[rIdx % colors.length]

          this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
          }
          this.pathTrailGraphics.stroke({ width: 3.5, color: c, alpha: 0.35 })

          this.pathTrailGraphics.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            this.pathTrailGraphics.lineTo(pts[i].x, pts[i].y)
          }
          this.pathTrailGraphics.stroke({ width: 1.5, color: c, alpha: 0.85 })

          for (let i = 0; i < pts.length; i += 3) {
            this.pathTrailGraphics.circle(pts[i].x, pts[i].y, 2.5).fill({ color: c, alpha: 0.85 })
          }
        })
      }

      // 1.5 Render Glowing Spawn Point Beacons / Portals on Map
      if (characterStore.detectedDoors && characterStore.detectedDoors.length > 0) {
        characterStore.detectedDoors.forEach((door: any, dIdx: number) => {
          const pt = gridToScreen(door.spawnCol ?? door.col, door.spawnRow ?? door.row, tileWidth, tileHeight)
          const isSelected = selectedDoorIdx === dIdx
          const beaconColor = isSelected ? 0xf59e0b : 0xa855f7

          // Outer energy aura
          this.pathTrailGraphics
            .ellipse(pt.x, pt.y, tileWidth * 0.32, tileHeight * 0.32)
            .fill({ color: beaconColor, alpha: isSelected ? 0.35 : 0.2 })
            .stroke({ width: isSelected ? 2.5 : 1.5, color: beaconColor, alpha: 0.9 })

          // Central beacon core
          this.pathTrailGraphics
            .circle(pt.x, pt.y, isSelected ? 5.5 : 4)
            .fill({ color: 0xffffff, alpha: 1.0 })
            .stroke({ width: 2, color: beaconColor, alpha: 1.0 })
        })
      }
    }

    // 2. Render Multiple Character Units
    const units = characterStore.units || []

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

      // Get Texture
      const actionPrefix = unit.action || 'Idle'
      const frame = actionPrefix === 'Idle' ? '0' : (unit.frameIndex || 0)
      const key = `Male_${unit.direction}_${actionPrefix}${frame}`

      let texture = this.characterTextures.get(key)
      if (!texture) {
        texture = this.characterTextures.get(`Male_${unit.direction}_Idle0`) || 
                  this.characterTextures.get('Male_2_Idle0') ||
                  this.characterTextures.values().next().value
      }

      const fadeAlpha = unit.isDead ? Math.max(0, unit.deathFade ?? 1.0) : 1.0

      if (texture) {
        if (sprite.texture !== texture) {
          sprite.texture = texture
        }
        sprite.visible = true
        sprite.alpha = fadeAlpha

        const texW = (texture.width && texture.width > 10) ? texture.width : 256
        const baseScale = (tileWidth * 1.0) / texW
        sprite.scale.set(baseScale * 0.95)
        sprite.anchor.set(0.5, 0.88)
      }

      // Shadow alpha adjustment (shape is static)
      shadow.alpha = 0.4 * fadeAlpha

      // Position
      container.position.set(unit.screenX, unit.screenY)

      // Depth sort tracking
      const charFloorCol = Math.floor(unit.currentCol)
      const charFloorRow = Math.floor(unit.currentRow)
      const charDepth = 100000 + (charFloorCol + charFloorRow) * 1000 + 10 + (i % 10)
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

  destroy(): void {
    if (this.isInitialized) {
      this.app.destroy(true, { children: true, texture: true })
      this.isInitialized = false
    }
  }
}

