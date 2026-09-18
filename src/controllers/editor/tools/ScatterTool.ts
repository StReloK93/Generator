import { GridCoord } from '../../../types/map'
import { getBresenhamLine, getRectangleCells } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class ScatterTool implements IEditorTool {
  public id = 'scatter'
  public boxStartPoint: GridCoord | null = null
  public isDragging = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    if (e && 'button' in e && e.button === 2) {
      this.onCancel(ctx)
      return
    }
    const { toolStore, notify, t } = ctx
    if (!toolStore.scatterSelectedAssetIds || toolStore.scatterSelectedAssetIds.length === 0) {
      toolStore.openScatterModal()
      notify.info(t('editor.scatterSelectPrompt') || 'Avval tasodifiy to\'ldirish uchun assetlarni tanlang')
      return
    }

    if (toolStore.scatterShape === 'box') {
      if (this.boxStartPoint) {
        // 2nd corner clicked in 2-click box mode!
        const p0 = this.boxStartPoint
        const p1 = coord
        const cells = getRectangleCells(p0.col, p0.row, p1.col, p1.row)
        this.executeScatter(cells, ctx)
        this.boxStartPoint = null
        this.isDragging = false
        toolStore.previewCells = []
        toolStore.isMouseDown = false
        toolStore.dragStartCell = null
        return
      }

      // 1st corner clicked or started dragging
      this.boxStartPoint = { col: coord.col, row: coord.row }
      this.isDragging = true
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      toolStore.previewCells = [coord]
      return
    }

    if (toolStore.scatterShape === 'line') {
      this.isDragging = true
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      toolStore.previewCells = [coord]
      return
    }

    // Brush mode
    this.isDragging = true
    toolStore.isMouseDown = true
    toolStore.dragStartCell = coord
    toolStore.previewCells = [coord]
    this.executeScatter([coord], ctx)
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { toolStore } = ctx

    if (toolStore.scatterShape === 'box') {
      const start = this.boxStartPoint || (toolStore.isMouseDown ? toolStore.dragStartCell : null)
      if (start) {
        toolStore.previewCells = getRectangleCells(
          start.col,
          start.row,
          coord.col,
          coord.row
        )
      }
      return
    }

    if (toolStore.scatterShape === 'line') {
      if (toolStore.isMouseDown && toolStore.dragStartCell) {
        toolStore.previewCells = getBresenhamLine(
          toolStore.dragStartCell.col,
          toolStore.dragStartCell.row,
          coord.col,
          coord.row
        )
      }
      return
    }

    if (toolStore.scatterShape === 'brush') {
      if (toolStore.isMouseDown) {
        if (!toolStore.previewCells.some((c: GridCoord) => c.col === coord.col && c.row === coord.row)) {
          toolStore.previewCells.push(coord)
          this.executeScatter([coord], ctx)
        }
      }
    }
  }

  onPointerUp(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    if (e && 'button' in e && e.button === 2) {
      this.onCancel(ctx)
      return
    }
    const { toolStore } = ctx

    if (toolStore.scatterShape === 'box') {
      if (this.boxStartPoint && (this.boxStartPoint.col !== coord.col || this.boxStartPoint.row !== coord.row)) {
        // Drag-and-release on different cell: execute immediately!
        const p0 = this.boxStartPoint
        const p1 = coord
        const cells = getRectangleCells(p0.col, p0.row, p1.col, p1.row)
        this.executeScatter(cells, ctx)
        this.boxStartPoint = null
        this.isDragging = false
        toolStore.previewCells = []
        toolStore.isMouseDown = false
        toolStore.dragStartCell = null
        return
      }

      // If user clicked same cell, keep this.boxStartPoint active so 2nd click finishes box
      this.isDragging = false
      toolStore.isMouseDown = false
      return
    }

    if (toolStore.scatterShape === 'line') {
      if (toolStore.isMouseDown && toolStore.dragStartCell) {
        if (toolStore.previewCells.length > 0) {
          this.executeScatter(toolStore.previewCells, ctx)
        }
      }
      this.isDragging = false
      toolStore.isMouseDown = false
      toolStore.dragStartCell = null
      toolStore.previewCells = []
      return
    }

    if (toolStore.scatterShape === 'brush') {
      this.isDragging = false
      toolStore.isMouseDown = false
      toolStore.dragStartCell = null
      toolStore.previewCells = []
    }
  }

  private executeScatter(cells: GridCoord[], ctx: EditorToolContext): void {
    const { toolStore, mapStore, notify, t } = ctx
    if (toolStore.scatterSelectedAssetIds.length === 0 || cells.length === 0) return

    const count = mapStore.scatterFillTiles(
      cells,
      toolStore.scatterSelectedAssetIds,
      mapStore.activeLayerId,
      {
        density: toolStore.scatterDensity / 100,
        randomFlip: toolStore.scatterRandomFlip,
        placementMode: toolStore.scatterPlacementMode,
        randomScale: toolStore.scatterRandomScale,
        minScale: toolStore.scatterMinScale,
        maxScale: toolStore.scatterMaxScale,
        randomOffset: toolStore.scatterRandomOffset,
        maxOffsetX: toolStore.scatterMaxOffsetX,
        maxOffsetY: toolStore.scatterMaxOffsetY,
        assetWeights: toolStore.scatterAssetWeights,
      }
    )
    if (count > 0) {
      notify.success(t('editor.scatterFilledCount', { count }) || `${count} ta katakka tasodifiy assetlar joylashtirildi`)
    }
  }

  onCancel(ctx: EditorToolContext): void {
    this.boxStartPoint = null
    this.isDragging = false
    ctx.toolStore.isMouseDown = false
    ctx.toolStore.dragStartCell = null
    ctx.toolStore.previewCells = []
  }
}
