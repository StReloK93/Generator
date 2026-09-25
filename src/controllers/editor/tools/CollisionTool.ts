import { GridCoord } from '../../../types/map'
import { isInsideGrid, getRectangleCells, getBresenhamLine } from '../../../utils/isometric'
import { IEditorTool, EditorToolContext } from './EditorTool'

export interface SubGridCoord {
  subCol: number
  subRow: number
}

export class CollisionTool implements IEditorTool {
  public id = 'collision'
  public subTool: 'brush' | 'line' | 'box' = 'brush'
  public action: 'block' | 'clear' = 'block'
  public boxStartPoint: SubGridCoord | null = null
  public lastDrawnSubCell: SubGridCoord | null = null
  public hasDrawnInDrag = false
  public isSubgridActive = true

  /**
   * Helper to convert standard isometric grid coord (which may have fractional 0.5 steps) into 2x2 subgrid coords.
   */
  public getSubCoord(coord: GridCoord): SubGridCoord {
    return {
      subCol: Math.round(coord.col * 2),
      subRow: Math.round(coord.row * 2),
    }
  }

  onPointerDown(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    const isBlock = this.action === 'block'
    const sub = this.getSubCoord(coord)

    if (this.subTool === 'box') {
      if (!this.boxStartPoint) {
        this.boxStartPoint = sub
        toolStore.previewCells = [{ col: sub.subCol * 0.5, row: sub.subRow * 0.5 }]
        return
      }

      // 2nd corner clicked: execute Box Area on subgrid
      const p0 = this.boxStartPoint
      const p1 = sub
      const minSC = Math.min(p0.subCol, p1.subCol)
      const maxSC = Math.max(p0.subCol, p1.subCol)
      const minSR = Math.min(p0.subRow, p1.subRow)
      const maxSR = Math.max(p0.subRow, p1.subRow)

      const subCells: SubGridCoord[] = []
      for (let sc = minSC; sc <= maxSC; sc++) {
        for (let sr = minSR; sr <= maxSR; sr++) {
          subCells.push({ subCol: sc, subRow: sr })
        }
      }

      mapStore.batchSetSubCellsBlocked(subCells, isBlock)
      this.boxStartPoint = null
      toolStore.previewCells = []
      return
    }

    if (this.subTool === 'line') {
      toolStore.isMouseDown = true
      toolStore.dragStartCell = { col: sub.subCol * 0.5, row: sub.subRow * 0.5 }
      toolStore.previewCells = [{ col: sub.subCol * 0.5, row: sub.subRow * 0.5 }]
      return
    }

    // Default 'brush' mode
    const targetState = isBlock ? !mapStore.isSubCellBlocked(sub.subCol, sub.subRow) : false
    mapStore.setSubCellBlocked(sub.subCol, sub.subRow, targetState)
    this.hasDrawnInDrag = true
    toolStore.isMouseDown = true
    toolStore.dragStartCell = { col: sub.subCol * 0.5, row: sub.subRow * 0.5 }
    this.lastDrawnSubCell = sub
  }

  onPointerMove(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    const sub = this.getSubCoord(coord)

    if (this.subTool === 'box') {
      if (this.boxStartPoint) {
        const p0 = this.boxStartPoint
        const minSC = Math.min(p0.subCol, sub.subCol)
        const maxSC = Math.max(p0.subCol, sub.subCol)
        const minSR = Math.min(p0.subRow, sub.subRow)
        const maxSR = Math.max(p0.subRow, sub.subRow)
        const previews: GridCoord[] = []
        for (let sc = minSC; sc <= maxSC; sc++) {
          for (let sr = minSR; sr <= maxSR; sr++) {
            previews.push({ col: sc * 0.5, row: sr * 0.5 })
          }
        }
        toolStore.previewCells = previews
      } else {
        toolStore.previewCells = [{ col: sub.subCol * 0.5, row: sub.subRow * 0.5 }]
      }
      return
    }

    if (this.subTool === 'line') {
      if (toolStore.isMouseDown && toolStore.dragStartCell) {
        const startSub = this.getSubCoord(toolStore.dragStartCell)
        const line = getBresenhamLine(startSub.subCol, startSub.subRow, sub.subCol, sub.subRow)
        toolStore.previewCells = line.map(pt => ({ col: pt.col * 0.5, row: pt.row * 0.5 }))
      } else {
        toolStore.previewCells = [{ col: sub.subCol * 0.5, row: sub.subRow * 0.5 }]
      }
      return
    }

    // Continuous brush drag
    if (toolStore.isMouseDown) {
      if (this.lastDrawnSubCell && (this.lastDrawnSubCell.subCol !== sub.subCol || this.lastDrawnSubCell.subRow !== sub.subRow)) {
        const isBlock = this.action === 'block'
        const line = getBresenhamLine(this.lastDrawnSubCell.subCol, this.lastDrawnSubCell.subRow, sub.subCol, sub.subRow)
        mapStore.batchSetSubCellsBlocked(line.map(pt => ({ subCol: pt.col, subRow: pt.row })), isBlock)
        this.lastDrawnSubCell = sub
      }
      toolStore.previewCells = []
    } else {
      toolStore.previewCells = [{ col: sub.subCol * 0.5, row: sub.subRow * 0.5 }]
    }
  }

  onPointerUp(coord: GridCoord, ctx: EditorToolContext): void {
    const { mapStore, toolStore } = ctx
    const sub = this.getSubCoord(coord)
    const isBlock = this.action === 'block'

    if (this.subTool === 'line' && toolStore.isMouseDown && toolStore.dragStartCell) {
      const startSub = this.getSubCoord(toolStore.dragStartCell)
      const line = getBresenhamLine(startSub.subCol, startSub.subRow, sub.subCol, sub.subRow)
      mapStore.batchSetSubCellsBlocked(line.map(pt => ({ subCol: pt.col, subRow: pt.row })), isBlock)
      toolStore.previewCells = []
    }

    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
    this.lastDrawnSubCell = null
    this.hasDrawnInDrag = false
  }

  onCancel(ctx: EditorToolContext): void {
    const { toolStore } = ctx
    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
    toolStore.previewCells = []
    this.boxStartPoint = null
    this.lastDrawnSubCell = null
    this.hasDrawnInDrag = false
  }

  onPointerLeave(ctx: EditorToolContext): void {
    this.onCancel(ctx)
  }
}

