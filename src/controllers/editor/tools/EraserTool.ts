import { GridCoord } from '../../../types/map'
import { isInsideGrid } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class EraserTool implements IEditorTool {
  public id = 'eraser'
  public lastDrawnCell: GridCoord | null = null
  public hasDrawnInDrag = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    mapStore.removeTile(coord.col, coord.row, mapStore.activeLayerId, false)
    this.hasDrawnInDrag = true
    toolStore.isMouseDown = true
    toolStore.dragStartCell = coord
    this.lastDrawnCell = { col: coord.col, row: coord.row }
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
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
  }

  onPointerUp(_coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    if (this.hasDrawnInDrag) {
      mapStore.pushHistory('Eraser stroke')
      this.hasDrawnInDrag = false
    }
    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
    this.lastDrawnCell = null
  }

  onCancel(ctx: EditorToolContext): void {
    this.onPointerUp({ col: 0, row: 0 }, ctx)
  }
}
