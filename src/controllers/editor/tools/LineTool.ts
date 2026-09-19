import { GridCoord, SelectedElementRef } from '../../../types/map'
import { getBresenhamLine } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class LineTool implements IEditorTool {
  public id = 'line'
  public lineStartPoint: GridCoord | null = null
  public isDragging = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    const { toolStore } = ctx

    if (!this.lineStartPoint) {
      this.lineStartPoint = { col: coord.col, row: coord.row }
      this.isDragging = true
      toolStore.isMouseDown = true
      toolStore.dragStartCell = coord
      toolStore.previewCells = [{ col: coord.col, row: coord.row }]
      return
    }

    // 2nd point clicked directly
    this.executeLine(this.lineStartPoint, coord, ctx, e)
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { toolStore } = ctx
    const start = this.lineStartPoint || (toolStore.isMouseDown ? toolStore.dragStartCell : null)
    if (start) {
      toolStore.previewCells = getBresenhamLine(
        start.col,
        start.row,
        coord.col,
        coord.row
      )
    } else {
      toolStore.previewCells = []
    }
  }

  onPointerUp(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    const { toolStore } = ctx

    if (this.isDragging && this.lineStartPoint) {
      if (coord.col !== this.lineStartPoint.col || coord.row !== this.lineStartPoint.row) {
        // Drag completed across multiple cells -> execute immediately
        this.executeLine(this.lineStartPoint, coord, ctx, e)
        return
      } else {
        // Single click without dragging -> keep lineStartPoint for 2-click workflow
        this.isDragging = false
      }
    }

    toolStore.isMouseDown = false
  }

  private executeLine(
    p0: GridCoord,
    p1: GridCoord,
    ctx: EditorToolContext,
    e?: MouseEvent | TouchEvent
  ): void {
    const { assetStore, mapStore, toolStore, notify, t } = ctx
    const cells = getBresenhamLine(p0.col, p0.row, p1.col, p1.row)

    if (assetStore.selectedAssetId) {
      const assetId = assetStore.selectedAssetId
      const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
      const isShift = !!(e && 'shiftKey' in e && e.shiftKey) || toolStore.isShiftPressed
      const mode: 'replace' | 'stack' = (isCtrl || toolStore.placementMode === 'replace') ? 'replace' : 'stack'
      
      const count = mapStore.fillTiles(cells, assetId, mapStore.activeLayerId, mode)
      if (count > 0) {
        notify.success(t('editor.lineDrawnCount', { count }) || `${count} tiles placed`)
      }
    } else {
      // Selection mode: Select all elements touching line cells
      const selectedRefs: SelectedElementRef[] = []
      for (const cell of cells) {
        const els = mapStore.getAllElementsAtOrCoveringCell(cell.col, cell.row)
        for (const el of els) {
          selectedRefs.push({
            col: cell.col,
            row: cell.row,
            layerId: el.layerId,
            itemId: el.item.id,
          })
        }
      }

      const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
      const isShift = !!(e && 'shiftKey' in e && e.shiftKey) || toolStore.isShiftPressed

      if (selectedRefs.length > 0) {
        if (isCtrl || isShift) {
          toolStore.addSelectedElements(selectedRefs)
        } else {
          toolStore.setSelectedElements(selectedRefs)
        }
      } else {
        if (!isCtrl && !isShift) {
          toolStore.clearSelection()
        }
      }
    }

    this.lineStartPoint = null
    this.isDragging = false
    toolStore.previewCells = []
    toolStore.isMouseDown = false
  }

  onCancel(ctx: EditorToolContext): void {
    this.lineStartPoint = null
    this.isDragging = false
    ctx.toolStore.previewCells = []
    ctx.toolStore.isMouseDown = false
  }
}
