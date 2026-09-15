import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { MapProject, AssetItem, GridCoord, Point2D, SelectedElementRef } from '../types/map'
import { PixiRenderer } from '../rendering/pixi/PixiRenderer'
import { assetManager } from '../services/assetManager'

/**
 * IsoEngine - Isometric Map & Game Engine Facade
 *
 * Coordinates rendering across modular sub-renderers (GridRenderer, MapRenderer,
 * OverlayRenderer, TowerRenderer, CombatRenderer, UnitRenderer) using PixiRenderer.
 * Retains 100% backward compatibility with all existing game & editor callers.
 */
export class IsoEngine {
  public static instance: IsoEngine | null = null
  public renderer: PixiRenderer

  // Legacy character element references
  public characterContainer: Container
  public characterShadow: Graphics
  public characterSprite: Sprite
  public characterMarker: Graphics

  constructor() {
    IsoEngine.instance = this
    this.renderer = new PixiRenderer()

    this.characterContainer = new Container()
    this.characterShadow = new Graphics()
    this.characterSprite = new Sprite()
    this.characterMarker = new Graphics()
  }

  // Lifecycle & Context Getters
  public get app(): Application {
    return this.renderer.context.app
  }

  public get isInitialized(): boolean {
    return this.renderer.isInitialized
  }

  public get currentFps(): number {
    return this.renderer.context.currentFps
  }

  public get onTick(): ((deltaSec: number) => void) | undefined {
    return this.renderer.context.onTick
  }

  public set onTick(fn: ((deltaSec: number) => void) | undefined) {
    this.renderer.context.onTick = fn
  }

  public get onTextureLoaded(): ((assetId: string, texture: Texture) => void) | undefined {
    return this.renderer.map.onTextureLoaded
  }

  public set onTextureLoaded(fn: ((assetId: string, texture: Texture) => void) | undefined) {
    this.renderer.map.onTextureLoaded = fn
  }

  // Scene Container Getters
  public get stageContainer(): Container {
    return this.renderer.context.stageContainer
  }

  public get worldContainer(): Container {
    return this.renderer.context.worldContainer
  }

  public get gridContainer(): Container {
    return this.renderer.grid.container
  }

  public get layersContainer(): Container {
    return this.renderer.map.layersContainer
  }

  public get overlayContainer(): Container {
    return this.renderer.overlay.overlayContainer
  }

  // Visual Node Getters
  public get gridGraphics(): Graphics {
    return this.renderer.grid.gridGraphics
  }

  public get borderGraphics(): Graphics {
    return this.renderer.grid.borderGraphics
  }

  public get coordsContainer(): Container {
    return this.renderer.grid.coordsContainer
  }

  public get hoverGraphics(): Graphics {
    return this.renderer.overlay.hoverGraphics
  }

  public get selectionGraphics(): Graphics {
    return this.renderer.overlay.selectionGraphics
  }

  public get previewContainer(): Container {
    return this.renderer.overlay.previewContainer
  }

  public get buildGhostSprite(): Sprite {
    return this.renderer.overlay.buildGhostSprite
  }

  public get buildableOverlayGraphics(): Graphics {
    return this.renderer.overlay.buildableOverlayGraphics
  }

  public get pathTrailGraphics(): Graphics {
    return this.renderer.overlay.pathTrailGraphics
  }

  public get spawnOverlayGraphics(): Graphics {
    return this.renderer.overlay.spawnOverlayGraphics
  }

  public get spawnMarkersContainer(): Container {
    return this.renderer.overlay.spawnMarkersContainer
  }

  public get combatGraphics(): Graphics {
    return this.renderer.combat.combatGraphics
  }

  public get combatSparks() {
    return this.renderer.combat.combatSparks
  }

  // Initialization & Viewport
  async init(containerEl: HTMLElement, width: number, height: number): Promise<void> {
    await this.renderer.init(containerEl, width, height)

    // Load terrain textures and preload remaining assets in background
    await assetManager.loadCore()
    assetManager.preloadRemainingInBackground()
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height)
  }

  setTransform(zoom: number, pan: Point2D): void {
    this.renderer.setTransform(zoom, pan)
  }

  setPan(panX: number, panY: number): void {
    this.renderer.setPan(panX, panY)
  }

  centerMap(project: MapProject, viewWidth: number, viewHeight: number, zoom = 1.0): Point2D {
    return this.renderer.centerMap(project, viewWidth, viewHeight, zoom)
  }

  // Grid & Layers
  renderGrid(
    project: MapProject,
    showGrid: boolean,
    gridOpacity: number,
    showCoords: boolean,
    showCenter = true,
    showSymmetry = true
  ): void {
    this.renderer.renderGrid(project, showGrid, gridOpacity, showCoords, showCenter, showSymmetry)
  }

  syncLayers(project: MapProject, assetMap: Map<string, AssetItem>): void {
    this.renderer.syncLayers(project, assetMap)
  }

  public async preloadAssetsBatch(
    assets: AssetItem[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    await this.renderer.map.preloadAssetsBatch(assets, onProgress)
  }

  public async preloadAsset(asset: AssetItem): Promise<Texture | null> {
    return await this.renderer.map.preloadAsset(asset)
  }

  public getTexture(asset: AssetItem): Texture | null {
    return this.renderer.map.getTexture(asset)
  }

  async loadCharacterTextures(): Promise<void> {
    await assetManager.loadGame()
  }

  async loadTowerTextures(): Promise<void> {
    await assetManager.loadEditor()
  }

  public getBlueprintTexture(bp: any): Texture | null {
    return this.renderer.towers.getBlueprintTexture(bp)
  }

  // Overlays & Editing
  public syncWater(project: MapProject): void {
    this.renderer.syncWater(project)
  }

  renderBuildableOverlay(project: MapProject, isVisible: boolean, activeTool?: string): void {
    this.renderer.renderBuildableOverlay(project, isVisible, activeTool)
  }

  renderHoverCell(
    hovered: GridCoord | null,
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.renderer.renderHoverCell(hovered, project, activeAsset, activeTool)
  }

  renderSelection(
    selected: SelectedElementRef | SelectedElementRef[] | null,
    project: MapProject,
    spanX = 1,
    spanY = 1
  ): void {
    this.renderer.renderSelection(selected, project, spanX, spanY)
  }

  renderPreviewCells(
    cells: GridCoord[],
    project: MapProject,
    activeAsset: AssetItem | null,
    activeTool: string
  ): void {
    this.renderer.renderPreviewCells(cells, project, activeAsset, activeTool)
  }

  renderTeammateHovers(teammateHovers: Map<string, any>, project: any): void {
    this.renderer.renderTeammateHovers(teammateHovers, project)
  }

  // Combat & Characters
  renderTowersAndCombat(
    towerStore: any,
    project: MapProject,
    characterStore: any,
    hoveredGridCoord: GridCoord | null = null
  ): void {
    this.renderer.renderTowersAndCombat(towerStore, project, characterStore, hoveredGridCoord)
  }

  renderCharacter(characterStore: any, project: MapProject): void {
    this.renderer.renderCharacters(characterStore, project)
  }

  screenPointToGrid(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
    project: MapProject
  ): { worldX: number; worldY: number; gridCoord: GridCoord } {
    return this.renderer.screenPointToGrid(clientX, clientY, canvasRect, project)
  }

  async exportImage(options: {
    includeGrid?: boolean
    transparentBg?: boolean
    project: MapProject
    assetMap: Map<string, AssetItem>
  }): Promise<string> {
    return await this.renderer.exportImage(options)
  }

  stopTicker(): void {
    this.renderer.context.stopTicker()
  }

  clearCombatVisuals(): void {
    this.renderer.combat.clear()
  }

  clearCharacterVisuals(): void {
    this.renderer.overlay.pathTrailGraphics.clear()
    this.renderer.units.clear(this.renderer.map.layersContainer)
    this.characterContainer.visible = false
  }

  clearOverlayVisuals(): void {
    this.renderer.overlay.clear()
  }

  destroy(): void {
    if (IsoEngine.instance === this) {
      IsoEngine.instance = null
    }
    this.renderer.destroy()
  }
}
