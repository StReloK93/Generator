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

export class PixiRenderer {
  public context: PixiContext
  public grid: GridRenderer
  public map: MapRenderer
  public overlay: OverlayRenderer
  public towers: TowerRenderer
  public combat: CombatRenderer
  public units: UnitRenderer

  public isInitialized = false

  constructor() {
    this.context = new PixiContext()
    this.grid = new GridRenderer()
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

    // Mount layer hierarchy in world container
    this.context.worldContainer.addChild(this.grid.container)
    this.context.worldContainer.addChild(this.map.layersContainer)
    this.context.worldContainer.addChild(this.overlay.overlayContainer)
    this.context.worldContainer.addChild(this.combat.combatGraphics)

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

  renderBuildableOverlay(project: MapProject, isVisible: boolean, activeTool?: string): void {
    this.overlay.renderBuildableOverlay(project, isVisible, activeTool)
  }

  renderTeammateHovers(teammateHovers: Map<string, any>, project: any): void {
    this.overlay.renderTeammateHovers(teammateHovers, project)
  }

  screenPointToGrid(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    project: MapProject
  ): { worldX: number; worldY: number; gridCoord: GridCoord } {
    const rawX = clientX - canvasRect.left
    const rawY = clientY - canvasRect.top

    const worldContainer = this.context.worldContainer
    const worldX = (rawX - worldContainer.position.x) / worldContainer.scale.x
    const worldY = (rawY - worldContainer.position.y) / worldContainer.scale.y

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
    this.grid.clear()
    this.combat.clear()
    this.overlay.clear()
    this.units.clear(this.map.layersContainer)
    this.towers.clear(this.map.layersContainer)
  }

  destroy(): void {
    this.clearVisuals()
    this.grid.destroy()
    this.map.destroy()
    this.overlay.destroy()
    this.towers.destroy(this.map.layersContainer)
    this.combat.destroy()
    this.units.destroy(this.map.layersContainer)
    this.context.destroy()
    this.isInitialized = false
  }
}
