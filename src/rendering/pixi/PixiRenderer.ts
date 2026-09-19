import { Container, Sprite, Texture } from 'pixi.js'
import { AssetItem, GridCoord, MapProject, Point2D, SelectedElementRef } from '../../types/map'
import { screenToGrid } from '../../utils/isometric'
import { PixiContext } from './PixiContext'
import { GridRenderer } from './GridRenderer'
import { MapRenderer } from './MapRenderer'
import { OverlayRenderer } from './OverlayRenderer'
import { TowerRenderer } from './TowerRenderer'
import { CombatRenderer } from './CombatRenderer'
import { UnitRenderer } from './UnitRenderer'
import { WaterRenderer } from './WaterRenderer'

export class PixiRenderer {
  public context: PixiContext
  public grid: GridRenderer
  public water: WaterRenderer
  public map: MapRenderer
  public overlay: OverlayRenderer
  public towers: TowerRenderer
  public combat: CombatRenderer
  public units: UnitRenderer

  public isInitialized = false

  constructor() {
    this.context = new PixiContext()
    this.grid = new GridRenderer()
    this.water = new WaterRenderer()
    this.map = new MapRenderer()
    this.overlay = new OverlayRenderer()
    this.towers = new TowerRenderer()
    this.combat = new CombatRenderer()
    this.units = new UnitRenderer()

    // Connect sub-renderers
    this.overlay.getTexture = (asset: AssetItem) => this.map.getTexture(asset)
    this.towers.fallbackTextureCache = this.map.getRawTextureCache()
  }

  async init(containerEl: HTMLElement, width: number, height: number): Promise<void> {
    await this.context.init(containerEl, width, height)

    // Mount layer hierarchy in world container with explicit depth layers
    this.context.worldContainer.sortableChildren = true
    this.grid.container.zIndex = 10
    this.water.container.zIndex = 25
    this.map.layersContainer.zIndex = 100
    this.overlay.overlayContainer.zIndex = 500
    this.combat.combatGraphics.zIndex = 999999

    this.context.worldContainer.addChild(this.grid.container)
    this.context.worldContainer.addChild(this.water.container)
    this.context.worldContainer.addChild(this.map.layersContainer)
    this.context.worldContainer.addChild(this.overlay.overlayContainer)
    this.context.worldContainer.addChild(this.combat.combatGraphics)

    // Continuous visual animations (single common UV scroll & shore foam pulsation)
    this.context.onFrame = (deltaSec: number) => {
      this.water.update(deltaSec)
    }

    this.isInitialized = true
  }

  resize(width: number, height: number): void {
    this.context.resize(width, height)
  }

  setTransform(zoom: number, pan: Point2D): void {
    this.context.setTransform(zoom, pan)
  }

  setPan(panX: number, panY: number): void {
    this.context.setPan(panX, panY)
  }

  centerMap(project: MapProject, viewWidth: number, viewHeight: number, zoom = 1.0): Point2D {
    return this.context.centerMap(project, viewWidth, viewHeight, zoom)
  }

  renderGrid(
    project: MapProject,
    showGrid: boolean,
    gridOpacity: number,
    showCoords: boolean,
    showCenter = true,
    showSymmetry = true
  ): void {
    this.grid.renderGrid(project, showGrid, gridOpacity, showCoords, showCenter, showSymmetry)
  }

  syncLayers(project: MapProject, assetMap: Map<string, AssetItem>): void {
    this.map.syncLayers(project, assetMap)
  }

  syncWater(project: MapProject, force = false): void {
    this.water.syncWater(project, force)
  }

  renderTowersAndCombat(
    towerStore: any,
    project: MapProject,
    characterStore: any,
    hoveredGridCoord: GridCoord | null = null
  ): void {
    this.towers.syncTowers(
      towerStore.placedTowers,
      towerStore.blueprints,
      towerStore.selectedPlacedTowerId,
      this.map.layersContainer,
      project.tileWidth,
      project.tileHeight
    )

    // Ensure combatGraphics container is properly attached into context world
    if (this.combat.combatGraphics) {
      if (!this.context.worldContainer.children.includes(this.combat.combatGraphics)) {
        this.context.worldContainer.addChild(this.combat.combatGraphics)
      }
    }

    this.combat.renderCombat(
      towerStore,
      project,
      characterStore,
      hoveredGridCoord,
      this.overlay.buildGhostSprite,
      (bp: any) => this.towers.getBlueprintTexture(bp)
    )
  }

  renderCharacters(characterStore: any, project: MapProject): void {
    this.overlay.renderRouteAndSpawns(characterStore, project)
    this.units.renderUnits(characterStore, project, this.map.layersContainer)
  }

  renderHoverCell(
    hovered: GridCoord | null,
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.overlay.renderHoverCell(hovered, project, activeAsset, activeTool)
  }

  renderSelection(
    selected: SelectedElementRef | SelectedElementRef[] | null,
    project: MapProject,
    spanX = 1,
    spanY = 1
  ): void {
    this.overlay.renderSelection(selected, project, spanX, spanY)
  }

  renderPreviewCells(
    cells: GridCoord[],
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.overlay.renderPreviewCells(cells, project, activeAsset, activeTool)
  }

  renderBuildableOverlay(project: MapProject, isVisible: boolean, activeTool?: string, force = false): void {
    this.overlay.renderBuildableOverlay(project, isVisible, activeTool, force)
  }

  renderTeammateHovers(teammateHovers: Map<string, any>, project: any): void {
    this.overlay.renderTeammateHovers(teammateHovers, project)
  }

  screenPointToGrid(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect | null | undefined,
    project: MapProject | null | undefined
  ): { worldX: number; worldY: number; gridCoord: GridCoord } {
    if (
      !this.isInitialized ||
      !this.context ||
      !this.context.worldContainer ||
      !canvasRect ||
      !project
    ) {
      return { worldX: 0, worldY: 0, gridCoord: { col: 0, row: 0 } }
    }

    const rawX = clientX - (canvasRect.left ?? 0)
    const rawY = clientY - (canvasRect.top ?? 0)

    const worldContainer = this.context.worldContainer
    const posX = worldContainer.position?.x ?? 0
    const posY = worldContainer.position?.y ?? 0
    const scaleX = worldContainer.scale?.x || 1
    const scaleY = worldContainer.scale?.y || 1

    const worldX = (rawX - posX) / scaleX
    const worldY = (rawY - posY) / scaleY

    const tileW = project.tileWidth || 128
    const tileH = project.tileHeight || 64
    const gridCoord = screenToGrid(worldX, worldY, tileW, tileH)

    return { worldX, worldY, gridCoord }
  }

  async exportImage(options: {
    includeGrid?: boolean
    transparentBg?: boolean
    project: MapProject
    assetMap: Map<string, AssetItem>
  }): Promise<string> {
    if (!this.isInitialized) return ''

    this.overlay.hoverGraphics.visible = false
    this.overlay.selectionGraphics.visible = false
    this.overlay.previewContainer.visible = false
    if (!options.includeGrid) {
      this.grid.container.visible = false
    }

    try {
      const imageUri = await this.context.app.renderer.extract.base64(this.context.worldContainer)
      return imageUri
    } finally {
      this.overlay.hoverGraphics.visible = true
      this.overlay.selectionGraphics.visible = true
      this.overlay.previewContainer.visible = true
      this.grid.container.visible = true
    }
  }

  clearVisuals(): void {
    try {
      this.grid?.clear()
      this.combat?.clear()
      this.overlay?.clear()
      if (this.map?.layersContainer && !this.map.layersContainer.destroyed) {
        this.units?.clear(this.map.layersContainer)
        this.towers?.clear(this.map.layersContainer)
      } else {
        this.units?.clear()
        this.towers?.clear()
      }
    } catch (e) {
      console.warn('[PixiRenderer] clearVisuals caught:', e)
    }
  }

  destroy(): void {
    try {
      this.clearVisuals()

      if (this.context?.worldContainer && !this.context.worldContainer.destroyed) {
        this.context.worldContainer.removeChildren()
      }

      this.grid?.destroy()
      this.water?.destroy()
      this.towers?.destroy()
      this.units?.destroy()
      this.overlay?.destroy()
      this.map?.destroy()
      this.combat?.destroy()
      this.context?.destroy()
    } catch (err) {
      console.warn('[PixiRenderer] destroy caught:', err)
    } finally {
      this.isInitialized = false
    }
  }
}
