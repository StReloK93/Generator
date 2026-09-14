import { GridCoord } from '../../../types/map'
import { getRectangleCells } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export class BoxTool implements IEditorTool {
  public id = 'box'
  public boxStartPoint: GridCoord | null = null
  public mode: 'fill' | 'clear' = 'fill'

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { assetStore, mapStore, toolStore, notify, t } = ctx

    if (this.mode === 'fill') {
      if (!assetStore.selectedAssetId) {
        notify.warning(t('editor.selectAssetFirst'))
        this.onCancel(ctx)
        return
      }

      if (!this.boxStartPoint) {
        this.boxStartPoint = { col: coord.col, row: coord.row }
        toolStore.previewCells = [{ col: coord.col, row: coord.row }]
        return
      }

      // 2nd corner clicked: execute Box Fill
      const p0 = this.boxStartPoint
      const p1 = coord
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
      toolStore.previewCells = []
    } else {
      // Clear mode
      if (!this.boxStartPoint) {
        this.boxStartPoint = { col: coord.col, row: coord.row }
        toolStore.previewCells = [{ col: coord.col, row: coord.row }]
        return
      }

      const p0 = this.boxStartPoint
      const p1 = coord
      const summary = mapStore.getBoxElementSummary(p0.col, p0.row, p1.col, p1.row)

      if (summary.totalItems === 0) {
        notify.info(t('editor.boxClearNoItems'))
        this.onCancel(ctx)
        return
      }

      toolStore.openBoxClearModal(summary)
      this.onCancel(ctx)
    }
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

  onPointerUp(): void {}

  onCancel(ctx: EditorToolContext): void {
    this.boxStartPoint = null
    ctx.toolStore.previewCells = []
  }
}
