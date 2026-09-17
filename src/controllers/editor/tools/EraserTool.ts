import { GridCoord } from '../../../types/map'
import { isInsideGrid, getBresenhamLine, getRectangleCells } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class EraserTool implements IEditorTool {
  public id = 'eraser'
  public subTool: 'simple' | 'line' | 'box' = 'simple'
  public startPoint: GridCoord | null = null
  public isDragging = false
  public lastDrawnCell: GridCoord | null = null
  public hasDrawnInDrag = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx

    if (this.subTool === 'simple') {
      mapStore.removeTile(coord.col, coord.row, mapStore.activeLayerId, false)
      this.hasDrawnInDrag = true
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      this.lastDrawnCell = { col: coord.col, row: coord.row }
      return
    }

    // Line or Box mode
    if (!this.startPoint) {
      this.startPoint = { col: coord.col, row: coord.row }
      this.isDragging = true
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      toolStore.previewCells = [{ col: coord.col, row: coord.row }]
      return
    }

    // 2nd corner / endpoint clicked
    this.executeAreaEraser(this.startPoint, coord, ctx)
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx

    if (this.subTool === 'simple') {
      if (!toolStore.isMouseDown || !toolStore.dragStartCell) return

      const isSameAsLast =
        this.lastDrawnCell &&
        this.lastDrawnCell.col === coord.col &&
        this.lastDrawnCell.row === coord.row

      if (
        !isSameAsLast &&
        isInsideGrid(coord.col, coord.row, mapStore.project.cols, mapStore.project.rows)
      ) {
        this.lastDrawnCell = { col: coord.col, row: coord.row }
        mapStore.removeTile(coord.col, coord.row, mapStore.activeLayerId, false)
        this.hasDrawnInDrag = true
      }
      return
    }

    // Line or Box preview
    if (this.startPoint) {
      if (this.subTool === 'line') {
        toolStore.previewCells = getBresenhamLine(
          this.startPoint.col,
          this.startPoint.row,
          coord.col,
          coord.row
        )
      } else {
        toolStore.previewCells = getRectangleCells(
          this.startPoint.col,
          this.startPoint.row,
          coord.col,
          coord.row
        )
      }
    } else {
      toolStore.previewCells = []
    }
  }

  onPointerUp(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx

    if (this.subTool === 'simple') {
      if (this.hasDrawnInDrag) {
        mapStore.pushHistory('Eraser stroke')
        this.hasDrawnInDrag = false
      }
      toolStore.isMouseDown = false
      toolStore.dragStartCell = null
      this.lastDrawnCell = null
      return
    }

    // Line or Box mode
    if (this.isDragging && this.startPoint) {
      if (coord.col !== this.startPoint.col || coord.row !== this.startPoint.row) {
        // Dragged across cells -> execute immediately
        this.executeAreaEraser(this.startPoint, coord, ctx)
        return
      } else {
        // Single click without dragging -> keep startPoint waiting for 2nd click
        this.isDragging = false
      }
    }

    toolStore.isMouseDown = false
  }

  private executeAreaEraser(p0: GridCoord, p1: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore, notify, t } = ctx
    const cells =
      this.subTool === 'line'
        ? getBresenhamLine(p0.col, p0.row, p1.col, p1.row)
        : getRectangleCells(p0.col, p0.row, p1.col, p1.row)

    const summary = mapStore.getCellsElementSummary(cells)

    if (summary.totalItems === 0) {
      notify.info(t('editor.boxClearNoItems'))
      this.onCancel(ctx)
      return
    }

    toolStore.openBoxClearModal(summary)
    this.onCancel(ctx)
  }

  onCancel(ctx: EditorToolContext): void {
    this.startPoint = null
    this.isDragging = false
    this.hasDrawnInDrag = false
    this.lastDrawnCell = null
    ctx.toolStore.previewCells = []
    ctx.toolStore.isMouseDown = false
  }
}
