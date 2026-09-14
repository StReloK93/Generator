import { GridCoord } from '../../../types/map'
import { isInsideGrid } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class BrushTool implements IEditorTool {
  public id = 'brush'
  public lastDrawnCell: GridCoord | null = null
  public hasDrawnInDrag = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore } = ctx
    if (!assetStore.selectedAssetId) return

    const placedAssetId = assetStore.selectedAssetId
    const existingDirect = mapStore.getCellItems(coord.col, coord.row, mapStore.activeLayerId)

    const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey))
    const isShift = !!(e && 'shiftKey' in e && e.shiftKey)

    let effectiveMode: 'replace' | 'stack' | 'ask' = toolStore.placementMode
    if (isCtrl) {
      effectiveMode = 'replace'
    } else if (isShift) {
      effectiveMode = 'stack'
    }

    if (existingDirect.length > 0) {
      if (
        effectiveMode === 'replace' &&
        existingDirect.length === 1 &&
        existingDirect[0].assetId === placedAssetId
      ) {
        toolStore.isMouseDown = true
        toolStore.dragStartCell = coord
        this.lastDrawnCell = { col: coord.col, row: coord.row }
        return
      }

      if (effectiveMode === 'ask') {
        toolStore.placementConflict = {
          col: coord.col,
          row: coord.row,
          assetId: placedAssetId,
        }
        return
      } else {
        mapStore.setTile(
          coord.col,
          coord.row,
          placedAssetId,
          effectiveMode === 'replace' ? 'replace' : 'stack',
          mapStore.activeLayerId,
          false
        )
        this.hasDrawnInDrag = true
      }
    } else {
      mapStore.setTile(coord.col, coord.row, placedAssetId, 'stack', mapStore.activeLayerId, false)
      this.hasDrawnInDrag = true
    }

    toolStore.isMouseDown = true
    toolStore.dragStartCell = coord
    this.lastDrawnCell = { col: coord.col, row: coord.row }
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore } = ctx
    if (!toolStore.isMouseDown || !toolStore.dragStartCell || !assetStore.selectedAssetId) return

    const isSameAsLast =
      this.lastDrawnCell &&
      this.lastDrawnCell.col === coord.col &&
      this.lastDrawnCell.row === coord.row

    if (
      !isSameAsLast &&
      isInsideGrid(coord.col, coord.row, mapStore.project.cols, mapStore.project.rows)
    ) {
      this.lastDrawnCell = { col: coord.col, row: coord.row }
      const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey))
      const isShift = !!(e && 'shiftKey' in e && e.shiftKey)
      const mode = isCtrl
        ? 'replace'
        : isShift
          ? 'stack'
          : toolStore.placementMode === 'replace'
            ? 'replace'
            : 'stack'

      mapStore.setTile(
        coord.col,
        coord.row,
        assetStore.selectedAssetId,
        mode,
        mapStore.activeLayerId,
        false
      )
      this.hasDrawnInDrag = true
    }
  }

  onPointerUp(_coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    if (this.hasDrawnInDrag) {
      mapStore.pushHistory('Brush stroke')
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
