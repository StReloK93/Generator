import { GridCoord, SelectedElementRef } from '../../../types/map'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class SelectTool implements IEditorTool {
  public id = 'select'

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { mapStore, toolStore } = ctx

    // Moving selected element
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
    const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey))
    const isShift = !!(e && 'shiftKey' in e && e.shiftKey)

    if (allEls.length > 0) {
      const activeLayerEntry = allEls.find((item: any) => item.layerId === mapStore.activeLayerId)
      const chosen = activeLayerEntry || allEls[0]
      mapStore.activeLayerId = chosen.layerId

      const newRef: SelectedElementRef = {
        col: chosen.originCol !== undefined ? chosen.originCol : coord.col,
        row: chosen.originRow !== undefined ? chosen.originRow : coord.row,
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
  }

  onPointerMove(): void {}
  onPointerUp(): void {}

  onCancel(ctx: EditorToolContext): void {
    ctx.toolStore.isMovingElement = false
    ctx.toolStore.clearSelection()
  }
}
