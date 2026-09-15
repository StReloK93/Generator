import { GridCoord } from '../../../types/map'
import { isInsideGrid, getRectangleCells, getBresenhamLine } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class WaterTool implements IEditorTool {
  public id = 'water'
  public subTool: 'brush' | 'line' | 'box' = 'brush'
  public action: 'water' | 'dry' = 'water'
  public boxStartPoint: GridCoord | null = null
  public lastDrawnCell: GridCoord | null = null
  public hasDrawnInDrag = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore, engine } = ctx
    const isWater = this.action === 'water'

    if (this.subTool === 'box') {
      if (!this.boxStartPoint) {
        this.boxStartPoint = { col: coord.col, row: coord.row }
        toolStore.previewCells = [{ col: coord.col, row: coord.row }]
        return
      }

      // 2nd corner clicked: execute Box Area
      const p0 = this.boxStartPoint
      const p1 = coord
      const cells = getRectangleCells(p0.col, p0.row, p1.col, p1.row)
      mapStore.batchSetWaterCells(cells, isWater)
      engine.syncWater(mapStore.project)
      this.boxStartPoint = null
      toolStore.previewCells = []
      return
    }

    if (this.subTool === 'line') {
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      toolStore.previewCells = [{ col: coord.col, row: coord.row }]
      return
    }

    // Default 'brush' mode
    const targetState = isWater ? !mapStore.isCellWater(coord.col, coord.row) : false
    mapStore.setCellWater(coord.col, coord.row, targetState)
    engine.syncWater(mapStore.project)
    this.hasDrawnInDrag = true
    toolStore.isMouseDown = true
    toolStore.dragStartCell = coord
    this.lastDrawnCell = { col: coord.col, row: coord.row }
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore, engine } = ctx

    if (this.subTool === 'box') {
      if (this.boxStartPoint) {
        toolStore.previewCells = getRectangleCells(
          this.boxStartPoint.col,
          this.boxStartPoint.row,
          coord.col,
          coord.row
        )
      } else if (toolStore.isMouseDown && toolStore.dragStartCell) {
        toolStore.previewCells = getRectangleCells(
          toolStore.dragStartCell.col,
          toolStore.dragStartCell.row,
          coord.col,
          coord.row
        )
      } else {
        toolStore.previewCells = []
      }
      return
    }

    if (this.subTool === 'line') {
      if (toolStore.isMouseDown && toolStore.dragStartCell) {
        toolStore.previewCells = getBresenhamLine(
          toolStore.dragStartCell.col,
          toolStore.dragStartCell.row,
          coord.col,
          coord.row
        )
      } else {
        toolStore.previewCells = []
      }
      return
    }

    // Brush drag
    if (toolStore.isMouseDown && toolStore.dragStartCell) {
      const isSameAsLast =
        this.lastDrawnCell &&
        this.lastDrawnCell.col === coord.col &&
        this.lastDrawnCell.row === coord.row

      if (
        !isSameAsLast &&
        isInsideGrid(coord.col, coord.row, mapStore.project.cols, mapStore.project.rows)
      ) {
        this.lastDrawnCell = { col: coord.col, row: coord.row }
        mapStore.setCellWater(coord.col, coord.row, this.action === 'water')
        engine.syncWater(mapStore.project)
        this.hasDrawnInDrag = true
      }
    }
  }

  onPointerUp(_coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore, engine } = ctx
    const isWater = this.action === 'water'

    if (this.subTool === 'line' && toolStore.previewCells.length > 0) {
      mapStore.batchSetWaterCells(toolStore.previewCells, isWater)
      engine.syncWater(mapStore.project)
      toolStore.previewCells = []
    } else if (
      this.subTool === 'box' &&
      toolStore.isMouseDown &&
      toolStore.dragStartCell &&
      toolStore.previewCells.length > 1
    ) {
      mapStore.batchSetWaterCells(toolStore.previewCells, isWater)
      engine.syncWater(mapStore.project)
      toolStore.previewCells = []
      this.boxStartPoint = null
    } else if (this.hasDrawnInDrag) {
      mapStore.pushHistory(isWater ? 'Added water cells' : 'Removed water cells')
      this.hasDrawnInDrag = false
    }

    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
    this.lastDrawnCell = null
  }

  onCancel(ctx: EditorToolContext): void {
    this.boxStartPoint = null
    ctx.toolStore.previewCells = []
    ctx.toolStore.isMouseDown = false
    ctx.toolStore.dragStartCell = null
    this.lastDrawnCell = null
  }
}
