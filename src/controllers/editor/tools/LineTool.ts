import { GridCoord } from '../../../types/map'
import { getBresenhamLine } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class LineTool implements IEditorTool {
  public id = 'line'

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { assetStore, toolStore, notify, t } = ctx
    if (!assetStore.selectedAssetId) {
      notify.warning(t('editor.selectAssetFirst'))
      return
    }
    toolStore.isMouseDown = true
    toolStore.dragStartCell = coord
    toolStore.previewCells = [coord]
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { toolStore } = ctx
    if (toolStore.isMouseDown && toolStore.dragStartCell) {
      toolStore.previewCells = getBresenhamLine(
        toolStore.dragStartCell.col,
        toolStore.dragStartCell.row,
        coord.col,
        coord.row
      )
    }
  }

  onPointerUp(_coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore } = ctx
    if (toolStore.isMouseDown && toolStore.dragStartCell && assetStore.selectedAssetId) {
      if (toolStore.previewCells.length > 0) {
        const assetId = assetStore.selectedAssetId
        const cells = [...toolStore.previewCells]

        const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || toolStore.isCtrlPressed
        const mode: 'replace' | 'stack' = (isCtrl || toolStore.placementMode === 'replace') ? 'replace' : 'stack'
        mapStore.fillTiles(cells, assetId, mapStore.activeLayerId, mode)
        toolStore.previewCells = []
      }
    }
    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
  }

  onCancel(ctx: EditorToolContext): void {
    ctx.toolStore.isMouseDown = false
    ctx.toolStore.dragStartCell = null
    ctx.toolStore.previewCells = []
  }
}
