import { GridCoord } from '../../../types/map'

export interface EditorToolContext {
  mapStore: any
  toolStore: any
  assetStore: any
  characterStore: any
  routeStore?: any
  gameStore?: any
  notify: any
  t: (key: string, params?: any) => string
  engine: any
}

export interface IEditorTool {
  id: string
  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void
  onPointerMove(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void
  onPointerUp(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void
  onCancel?(ctx: EditorToolContext): void
}
