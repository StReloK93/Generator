import { GridCoord } from '../../../types/map'
import { floodFill } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class BucketTool implements IEditorTool {
  public id = 'bucket'

  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void {
    const { assetStore, mapStore, toolStore, notify, t } = ctx

    if (!assetStore.selectedAssetId) {
      notify.warning(t('editor.selectAssetFirst'))
      return
    }

    const activeTilesRecord: Record<string, { assetId: string }> = {}
    for (const [key, items] of Object.entries(mapStore.activeLayer.tiles)) {
      const itemArr = Array.isArray(items) ? items : [items]
      if (itemArr.length > 0) {
        activeTilesRecord[key] = { assetId: itemArr[itemArr.length - 1].assetId }
      }
    }

    const targetCells = floodFill(
      coord.col,
      coord.row,
      assetStore.selectedAssetId,
      activeTilesRecord,
      mapStore.project.cols,
      mapStore.project.rows
    )

    const isCtrl = !!(e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey))
    const isShift = !!(e && 'shiftKey' in e && e.shiftKey)
    const mode = isCtrl
      ? 'replace'
      : isShift
        ? 'stack'
        : toolStore.placementMode === 'replace'
          ? 'replace'
          : 'stack'

    if (targetCells.length > 0) {
      mapStore.fillTiles(targetCells, assetStore.selectedAssetId, mapStore.activeLayerId, mode)
    }
  }

  onPointerMove(): void {}
  onPointerUp(): void {}
}
