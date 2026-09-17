import { GridCoord } from '../../../types/map'
import { getRectangleCells } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class BoxTool implements IEditorTool {
  public id = 'box'
  public boxStartPoint: GridCoord | null = null
  public isDragging = false
  public mode: 'fill' | 'clear' = 'fill'

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    const { toolStore } = ctx

    if (!this.boxStartPoint) {
      this.boxStartPoint = { col: coord.col, row: coord.row }
      this.isDragging = true
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      toolStore.previewCells = [{ col: coord.col, row: coord.row }]
      return
    }

    // 2nd corner clicked directly
    this.executeAction(this.boxStartPoint, coord, ctx, e)
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { toolStore } = ctx
    if (this.boxStartPoint) {
      toolStore.previewCells = getRectangleCells(
        this.boxStartPoint.col,
        this.boxStartPoint.row,
        coord.col,
        coord.row
      )
    } else {
      toolStore.previewCells = []
    }
  }

  onPointerUp(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    const { toolStore } = ctx

    if (this.isDragging && this.boxStartPoint) {
      if (coord.col !== this.boxStartPoint.col || coord.row !== this.boxStartPoint.row) {
        // Drag completed across multiple cells -> execute immediately
        this.executeAction(this.boxStartPoint, coord, ctx, e)
        return
      } else {
        // Single click without dragging -> keep boxStartPoint for 2-click workflow
        this.isDragging = false
      }
    }

    toolStore.isMouseDown = false
  }

  private executeAction(
    p0: GridCoord,
    p1: GridCoord,
    ctx: EditorToolContext,
    e?: MouseEvent | TouchEvent
  ): void {
    if (this.mode === 'clear') {
      this.executeBoxClear(p0, p1, ctx)
    } else if (ctx.assetStore.selectedAssetId) {
      this.executeBoxFill(p0, p1, ctx)
    } else {
      this.executeBoxSelect(p0, p1, ctx, e)
    }
  }

  private executeBoxFill(p0: GridCoord, p1: GridCoord, ctx: EditorToolContext): void {
    const { assetStore, mapStore, notify, t, toolStore } = ctx
    if (!assetStore.selectedAssetId) return

    const count = mapStore.fillEmptyCellsInBox(
      p0.col,
      p0.row,
      p1.col,
      p1.row,
      assetStore.selectedAssetId,
      mapStore.activeLayerId
    )

    if (count > 0) {
      notify.success(t('editor.boxFilledEmptyCount', { count }))
    } else {
      notify.info(t('editor.occupiedCellsCount'))
    }

    this.boxStartPoint = null
    this.isDragging = false
    toolStore.previewCells = []
    toolStore.isMouseDown = false
  }

  private executeBoxSelect(
    p0: GridCoord,
    p1: GridCoord,
    ctx: EditorToolContext,
    e?: MouseEvent | TouchEvent
  ): void {
    const { mapStore, toolStore, notify, t } = ctx
    const elements = mapStore.getElementsInBox(p0.col, p0.row, p1.col, p1.row)

    const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey))
    const isShift = !!(e && 'shiftKey' in e && e.shiftKey)

    if (elements.length > 0) {
      if (isCtrl || isShift) {
        toolStore.addSelectedElements(elements)
      } else {
        toolStore.setSelectedElements(elements)
      }
      notify.info(t('editor.boxSelectSuccess', { count: elements.length }) || `${elements.length} elements selected`)
    } else {
      if (!isCtrl && !isShift) {
        toolStore.clearSelection()
      }
      notify.info(t('editor.boxSelectNoItems') || 'No elements found in selected area')
    }

    this.boxStartPoint = null
    this.isDragging = false
    toolStore.previewCells = []
    toolStore.isMouseDown = false
  }

  private executeBoxClear(p0: GridCoord, p1: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore, notify, t } = ctx
    const summary = mapStore.getBoxElementSummary(p0.col, p0.row, p1.col, p1.row)

    if (summary.totalItems === 0) {
      notify.info(t('editor.boxClearNoItems'))
      this.onCancel(ctx)
      return
    }

    toolStore.openBoxClearModal(summary)
    this.onCancel(ctx)
  }

  onCancel(ctx: EditorToolContext): void {
    this.boxStartPoint = null
    this.isDragging = false
    ctx.toolStore.previewCells = []
    ctx.toolStore.isMouseDown = false
  }
}
