import { GridCoord } from '../../../types/map'
import { isInsideGrid, getRectangleCells, getBresenhamLine } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class BuildableTool implements IEditorTool {
  public id = 'buildable'
  public subTool: 'brush' | 'line' | 'box' = 'brush'
  public action: 'allow' | 'block' = 'allow'
  public boxStartPoint: GridCoord | null = null
  public lastDrawnCell: GridCoord | null = null
  public hasDrawnInDrag = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    const isAllow = this.action === 'allow'

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
      mapStore.batchSetBuildableCells(cells, isAllow)
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
    const targetState = isAllow ? !mapStore.isCellBuildable(coord.col, coord.row) : false
    mapStore.setCellBuildable(coord.col, coord.row, targetState)
    this.hasDrawnInDrag = true
    toolStore.isMouseDown = true
    toolStore.dragStartCell = coord
    this.lastDrawnCell = { col: coord.col, row: coord.row }
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx

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
        mapStore.setCellBuildable(coord.col, coord.row, this.action === 'allow')
        this.hasDrawnInDrag = true
      }
    }
  }

  onPointerUp(_coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    const isAllow = this.action === 'allow'

    if (this.subTool === 'line' && toolStore.previewCells.length > 0) {
      mapStore.batchSetBuildableCells(toolStore.previewCells, isAllow)
      toolStore.previewCells = []
    } else if (
      this.subTool === 'box' &&
      toolStore.isMouseDown &&
      toolStore.dragStartCell &&
      toolStore.previewCells.length > 1
    ) {
      mapStore.batchSetBuildableCells(toolStore.previewCells, isAllow)
      toolStore.previewCells = []
      this.boxStartPoint = null
    } else if (this.hasDrawnInDrag) {
      mapStore.pushHistory('Buildable zones edit')
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
