import { GridCoord } from '../../types/map'
import { cellKey, isInsideGrid } from '../../utils/isometric'
import { EditorToolContext, IEditorTool } from './tools/EditorTool'
import { BrushTool } from './tools/BrushTool'
import { EraserTool } from './tools/EraserTool'
import { BucketTool } from './tools/BucketTool'
import { LineTool } from './tools/LineTool'
import { BoxTool } from './tools/BoxTool'
import { SelectTool } from './tools/SelectTool'
import { BuildableTool } from './tools/BuildableTool'
import { WaterTool } from './tools/WaterTool'

export class EditorController {
  public ctx: EditorToolContext

  // Tool instances
  public brushTool = new BrushTool()
  public eraserTool = new EraserTool()
  public bucketTool = new BucketTool()
  public lineTool = new LineTool()
  public boxTool = new BoxTool()
  public selectTool = new SelectTool()
  public buildableTool = new BuildableTool()
  public waterTool = new WaterTool()

  // Route & Waypoint dragging state
  public isDraggingWaypoint = false
  public draggedWaypointIndex: number | null = null

  // Keyboard modifiers
  public isCtrlPressed = false
  public isShiftPressed = false

  constructor(ctx: EditorToolContext) {
    this.ctx = ctx
  }

  public getActiveTool(): IEditorTool {
    const active = this.ctx.toolStore.activeTool
    if (active === 'eraser') return this.eraserTool
    if (active === 'bucket') return this.bucketTool
    if (active === 'line') return this.lineTool
    if (active === 'box-fill') {
      this.boxTool.mode = 'fill'
      return this.boxTool
    }
    if (active === 'box-clear') {
      this.boxTool.mode = 'clear'
      return this.boxTool
    }
    if (active === 'buildable') return this.buildableTool
    if (active === 'water') return this.waterTool
    if (active === 'select' || !this.ctx.assetStore.selectedAssetId) return this.selectTool
    return this.brushTool
  }

  public handlePointerDown(coord: GridCoord, e: MouseEvent | TouchEvent): void {
    const { characterStore, mapStore, engine, toolStore, assetStore } = this.ctx

    if (mapStore.activeLayer?.locked) return
    if (!isInsideGrid(coord.col, coord.row, mapStore.project.cols, mapStore.project.rows)) return

    // 1. Spawn Point Setting
    if (characterStore.isSettingSpawnPoint) {
      if (characterStore.spawnPointPlacementMode === 'add') {
        characterStore.addSpawnPoint(coord.col, coord.row)
      } else {
        characterStore.relocateCurrentSpawnPoint(coord.col, coord.row)
      }
      characterStore.isSettingSpawnPoint = false
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    // 2. Custom Route Drawing & Point Selection/Relocation Dragging
    if (characterStore.isDrawingRoute) {
      const wpList = characterStore.drawingWaypoints || []
      const clickedWpIdx = wpList.findIndex(
        (p: GridCoord) => p.col === coord.col && p.row === coord.row
      )

      if (clickedWpIdx !== -1) {
        this.isDraggingWaypoint = true
        this.draggedWaypointIndex = clickedWpIdx
        characterStore.selectWaypoint(clickedWpIdx)
        engine.renderCharacter(characterStore, mapStore.project)
        return
      }

      if (characterStore.selectedWaypointIndex !== null) {
        characterStore.moveSelectedWaypoint(coord)
        engine.renderCharacter(characterStore, mapStore.project)
        return
      }

      characterStore.addWaypoint(coord)
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    // 3. Eyedropper / Picker Tool
    if (toolStore.activeTool === 'picker') {
      const key = cellKey(coord.col, coord.row)
      let foundAssetId: string | null = null
      const layer = mapStore.activeLayer
      if (layer && layer.tiles[key]) {
        const items = mapStore.getCellItems(coord.col, coord.row, layer.id)
        if (items.length > 0) foundAssetId = items[items.length - 1].assetId
      }
      if (!foundAssetId) {
        for (let i = mapStore.project.layers.length - 1; i >= 0; i--) {
          const l = mapStore.project.layers[i]
          if (!l.visible || l.locked) continue
          const items = mapStore.getCellItems(coord.col, coord.row, l.id)
          if (items.length > 0) {
            foundAssetId = items[items.length - 1].assetId
            mapStore.activeLayerId = l.id
            break
          }
        }
      }
      if (foundAssetId) {
        assetStore.selectAsset(foundAssetId)
        toolStore.setTool(toolStore.lastDrawingTool || 'brush')
      }
      return
    }

    // 4. Delegate to active tool
    const tool = this.getActiveTool()
    tool.onPointerDown(coord, this.ctx, e)
  }

  public handlePointerMove(coord: GridCoord, e: MouseEvent | TouchEvent): void {
    const { characterStore, mapStore, engine, toolStore } = this.ctx

    toolStore.setHoveredCell(coord)

    // Waypoint dragging during route drawing
    if (
      characterStore.isDrawingRoute &&
      this.isDraggingWaypoint &&
      this.draggedWaypointIndex !== null
    ) {
      const idx = this.draggedWaypointIndex
      if (idx >= 0 && idx < characterStore.drawingWaypoints.length) {
        const current = characterStore.drawingWaypoints[idx]
        if (current.col !== coord.col || current.row !== coord.row) {
          characterStore.setWaypointPosition(idx, coord)
          engine.renderCharacter(characterStore, mapStore.project)
        }
      }
      return
    }

    const tool = this.getActiveTool()
    tool.onPointerMove(coord, this.ctx, e)
  }

  public handlePointerUp(coord: GridCoord, e: MouseEvent | TouchEvent): void {
    const { characterStore, mapStore, engine } = this.ctx

    if (this.isDraggingWaypoint) {
      this.isDraggingWaypoint = false
      this.draggedWaypointIndex = null
      characterStore.commitRouteState()
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    const tool = this.getActiveTool()
    tool.onPointerUp(coord, this.ctx, e)
  }

  public handleContextMenu(): void {
    const { characterStore, mapStore, engine, toolStore, assetStore } = this.ctx

    if (toolStore.activeTool === 'box-fill' || toolStore.activeTool === 'box-clear') {
      this.boxTool.onCancel(this.ctx)
      toolStore.setTool('brush')
      return
    }
    if (characterStore.isDrawingRoute) {
      if (characterStore.selectedWaypointIndex !== null) {
        characterStore.selectedWaypointIndex = null
        engine.renderCharacter(characterStore, mapStore.project)
        return
      }
    }
    if (characterStore.selectedDoorIndex !== null) {
      characterStore.selectedDoorIndex = null
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
    if (characterStore.isSettingSpawnPoint) {
      characterStore.isSettingSpawnPoint = false
      return
    }
    if (toolStore.isMovingElement) {
      toolStore.isMovingElement = false
      return
    }
    if (assetStore.selectedAssetId) {
      assetStore.selectAsset(null)
      return
    }
    if (toolStore.selectedElement) {
      toolStore.setSelectedElement(null)
      return
    }
    toolStore.previewCells = []
    toolStore.isMouseDown = false
  }

  public destroy(): void {
    this.brushTool.onCancel(this.ctx)
    this.eraserTool.onCancel(this.ctx)
    this.lineTool.onCancel(this.ctx)
    this.boxTool.onCancel(this.ctx)
    this.selectTool.onCancel(this.ctx)
    this.buildableTool.onCancel(this.ctx)
  }
}
