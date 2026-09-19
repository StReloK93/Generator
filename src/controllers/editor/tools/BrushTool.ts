import { GridCoord, SelectedElementRef } from '../../../types/map'
import { isInsideGrid, getRectangleCells } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class BrushTool implements IEditorTool {
  public id = 'brush'
  public lastDrawnCell: GridCoord | null = null
  public hasDrawnInDrag = false
  public isMarqueeSelecting = false

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore } = ctx

    // 1. If NO asset is selected -> Selection mode (single-select or start marquee box-select)
    if (!assetStore.selectedAssetId) {
      // If moving selected element
      if (toolStore.isMovingElement && toolStore.selectedElement) {
        mapStore.moveTileItem(
          toolStore.selectedElement.col,
          toolStore.selectedElement.row,
          coord.col,
          coord.row,
          toolStore.selectedElement.itemId,
          toolStore.selectedElement.layerId
        )
        toolStore.selectedElement.col = coord.col
        toolStore.selectedElement.row = coord.row
        toolStore.isMovingElement = false
        return
      }

      const allEls = mapStore.getAllElementsAtOrCoveringCell(coord.col, coord.row)
      const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
      const isShift = !!(e && 'shiftKey' in e && e.shiftKey) || toolStore.isShiftPressed

      if (allEls.length > 0) {
        const activeLayerEntry = allEls.find((item: any) => item.layerId === mapStore.activeLayerId)
        const chosen = activeLayerEntry || allEls[0]
        mapStore.activeLayerId = chosen.layerId

        const newRef: SelectedElementRef = {
          col: coord.col,
          row: coord.row,
          layerId: chosen.layerId,
          itemId: chosen.item.id,
        }

        if (isCtrl || isShift) {
          toolStore.toggleSelectedElement(newRef)
        } else {
          toolStore.setSelectedElement(newRef)
        }
      } else {
        if (!isCtrl && !isShift) {
          toolStore.clearSelection()
        }
      }

      toolStore.isMouseDown = true
      toolStore.dragStartCell = { col: coord.col, row: coord.row }
      toolStore.previewCells = [{ col: coord.col, row: coord.row }]
      this.isMarqueeSelecting = true
      return
    }

    // 2. If Asset IS selected -> Place / Draw mode
    const placedAssetId = assetStore.selectedAssetId
    const existingDirect = mapStore.getCellItems(coord.col, coord.row, mapStore.activeLayerId)

    const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
    const isShift = !!(e && 'shiftKey' in e && e.shiftKey) || toolStore.isShiftPressed

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
    this.isMarqueeSelecting = false
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore } = ctx
    if (!toolStore.isMouseDown || !toolStore.dragStartCell) return

    // Selection Marquee Box dragging
    if (!assetStore.selectedAssetId && this.isMarqueeSelecting) {
      toolStore.previewCells = getRectangleCells(
        toolStore.dragStartCell.col,
        toolStore.dragStartCell.row,
        coord.col,
        coord.row
      )
      return
    }

    // Brush paint stroke dragging
    if (assetStore.selectedAssetId) {
      const isSameAsLast =
        this.lastDrawnCell &&
        this.lastDrawnCell.col === coord.col &&
        this.lastDrawnCell.row === coord.row

      if (
        !isSameAsLast &&
        isInsideGrid(coord.col, coord.row, mapStore.project.cols, mapStore.project.rows)
      ) {
        this.lastDrawnCell = { col: coord.col, row: coord.row }
        const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
        const isShift = !!(e && 'shiftKey' in e && e.shiftKey) || toolStore.isShiftPressed
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
  }

  onPointerUp(coord: GridCoord, ctx: EditorToolContext, e?: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore } = ctx

    if (!assetStore.selectedAssetId && this.isMarqueeSelecting && toolStore.dragStartCell) {
      // If user dragged across cells -> select all elements enclosed in the rectangle
      if (
        coord.col !== toolStore.dragStartCell.col ||
        coord.row !== toolStore.dragStartCell.row
      ) {
        const elements = mapStore.getElementsInBox(
          toolStore.dragStartCell.col,
          toolStore.dragStartCell.row,
          coord.col,
          coord.row
        )
        const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
        const isShift = !!(e && 'shiftKey' in e && e.shiftKey) || toolStore.isShiftPressed

        if (elements.length > 0) {
          if (isCtrl || isShift) {
            toolStore.addSelectedElements(elements)
          } else {
            toolStore.setSelectedElements(elements)
          }
        }
      }
      this.isMarqueeSelecting = false
      toolStore.previewCells = []
    }

    if (this.hasDrawnInDrag) {
      mapStore.pushHistory('Brush stroke')
      this.hasDrawnInDrag = false
    }
    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
    this.lastDrawnCell = null
    toolStore.previewCells = []
  }

  onCancel(ctx: EditorToolContext): void {
    this.isMarqueeSelecting = false
    this.onPointerUp({ col: 0, row: 0 }, ctx)
  }
}
