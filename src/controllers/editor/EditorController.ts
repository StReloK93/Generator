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
import { ScatterTool } from './tools/ScatterTool'

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
  public scatterTool = new ScatterTool()

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
    if (active === 'box-fill' || active === 'box' || active === 'rect') {
      this.boxTool.mode = 'fill'
      return this.boxTool
    }
    if (active === 'box-clear') {
      this.boxTool.mode = 'clear'
      return this.boxTool
    }
    if (active === 'buildable') return this.buildableTool
    if (active === 'water') return this.waterTool
    if (active === 'scatter') return this.scatterTool
    if (active === 'select' || active === 'brush') {
      if (this.ctx.toolStore.drawSubTool === 'line') return this.lineTool
      if (this.ctx.toolStore.drawSubTool === 'box') {
        this.boxTool.mode = 'fill'
        return this.boxTool
      }
      return this.brushTool
    }
    return this.brushTool
  }

  public handlePointerDown(coord: GridCoord, e: MouseEvent | TouchEvent): void {
    const { routeStore, characterStore, mapStore, engine, toolStore, assetStore } = this.ctx

    if (mapStore.activeLayer?.locked) return
    if (!isInsideGrid(coord.col, coord.row, mapStore.project.cols, mapStore.project.rows)) return

    // 1. Route Start Setting
    if (routeStore?.isSettingRouteStart) {
      if (routeStore.routeStartPlacementMode === 'add') {
        routeStore.addRoute(coord.col, coord.row)
      } else {
        routeStore.relocateCurrentRouteStart(coord.col, coord.row)
      }
      routeStore.isSettingRouteStart = false
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    // 1.1 Player Base / Start Point Setting
    if (routeStore?.isSettingPlayerStartPoint) {
      routeStore.relocateCurrentPlayerStartPoint(coord.col, coord.row)
      routeStore.isSettingPlayerStartPoint = false
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    // 2. Custom Route Drawing & Point Selection/Relocation Dragging
    if (routeStore?.isDrawingRoute) {
      const wpList = routeStore.drawingWaypoints || []
      const clickedWpIdx = wpList.findIndex(
        (p: GridCoord) => p.col === coord.col && p.row === coord.row
      )

      if (clickedWpIdx !== -1) {
        this.isDraggingWaypoint = true
        this.draggedWaypointIndex = clickedWpIdx
        routeStore.selectWaypoint(clickedWpIdx)
        engine.renderCharacter(characterStore, mapStore.project)
        return
      }

      if (routeStore.selectedWaypointIndex !== null) {
        routeStore.moveSelectedWaypoint(coord)
        engine.renderCharacter(characterStore, mapStore.project)
        return
      }

      routeStore.addWaypoint(coord)
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
    const { routeStore, characterStore, mapStore, engine, toolStore } = this.ctx

    toolStore.setHoveredCell(coord)

    // Waypoint dragging during route drawing
    if (
      routeStore?.isDrawingRoute &&
      this.isDraggingWaypoint &&
      this.draggedWaypointIndex !== null
    ) {
      const idx = this.draggedWaypointIndex
      if (idx >= 0 && idx < routeStore.drawingWaypoints.length) {
        const current = routeStore.drawingWaypoints[idx]
        if (current.col !== coord.col || current.row !== coord.row) {
          routeStore.setWaypointPosition(idx, coord)
          engine.renderCharacter(characterStore, mapStore.project)
        }
      }
      return
    }

    const tool = this.getActiveTool()
    tool.onPointerMove(coord, this.ctx, e)
  }

  public handlePointerUp(coord: GridCoord, e: MouseEvent | TouchEvent): void {
    const { routeStore, characterStore, mapStore, engine } = this.ctx

    if (this.isDraggingWaypoint) {
      this.isDraggingWaypoint = false
      this.draggedWaypointIndex = null
      routeStore?.commitRouteState()
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    const tool = this.getActiveTool()
    tool.onPointerUp(coord, this.ctx, e)
  }

  public handleContextMenu(): void {
    const { routeStore, characterStore, mapStore, engine, toolStore, assetStore } = this.ctx

    // 1. Cancel active multi-point operations first (Line, Box, Eraser, etc.)
    if (this.lineTool.lineStartPoint) {
      this.lineTool.onCancel(this.ctx)
      return
    }
    if (this.boxTool.boxStartPoint) {
      this.boxTool.onCancel(this.ctx)
      return
    }
    if (this.eraserTool.startPoint) {
      this.eraserTool.onCancel(this.ctx)
      return
    }
    if (this.buildableTool.boxStartPoint) {
      this.buildableTool.onCancel(this.ctx)
      return
    }
    if (this.waterTool.boxStartPoint) {
      this.waterTool.onCancel(this.ctx)
      return
    }
    if (this.scatterTool.boxStartPoint) {
      this.scatterTool.onCancel(this.ctx)
      return
    }

    if (toolStore.activeTool === 'scatter') {
      this.scatterTool.onCancel(this.ctx)
      return
    }
    if (toolStore.activeTool === 'box-fill' || toolStore.activeTool === 'box-clear') {
      this.boxTool.onCancel(this.ctx)
      toolStore.setTool('brush')
      return
    }
    if (routeStore?.isDrawingRoute) {
      if (routeStore.selectedWaypointIndex !== null) {
        routeStore.selectedWaypointIndex = null
        engine.renderCharacter(characterStore, mapStore.project)
        return
      }
    }
    if (routeStore?.selectedRouteIndex !== null && routeStore?.selectedRouteIndex !== undefined) {
      routeStore.selectedRouteIndex = null
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
    if (routeStore?.isSettingRouteStart) {
      routeStore.isSettingRouteStart = false
      return
    }
    if (routeStore?.isSettingPlayerStartPoint) {
      routeStore.isSettingPlayerStartPoint = false
      return
    }
    if (toolStore.isMovingElement) {
      toolStore.isMovingElement = false
      return
    }
    if (toolStore.selectedElements.length > 0 || toolStore.selectedElement) {
      toolStore.clearSelection()
      return
    }
    if (assetStore.selectedAssetId) {
      assetStore.selectAsset(null)
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
    this.waterTool.onCancel(this.ctx)
    this.scatterTool.onCancel(this.ctx)
  }
}
