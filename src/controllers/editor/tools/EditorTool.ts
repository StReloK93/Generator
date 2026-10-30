import { GridCoord } from '../../../types/map'
import type { IsoEngine } from '../../../engine/IsoEngine'
import type { useMapStore } from '../../../stores/mapStore'
import type { useToolStore } from '../../../stores/toolStore'
import type { useAssetStore } from '../../../stores/assetStore'
import type { useCharacterStore } from '../../../stores/characterStore'
import type { useRouteStore } from '../../../stores/routeStore'
import type { useGameStore } from '../../../stores/gameStore'
import type { useNotificationStore } from '../../../stores/notificationStore'
import type { useI18n } from '../../../stores/i18nStore'

export interface EditorToolContext {
  mapStore: ReturnType<typeof useMapStore>
  toolStore: ReturnType<typeof useToolStore>
  assetStore: ReturnType<typeof useAssetStore>
  characterStore: ReturnType<typeof useCharacterStore>
  routeStore: ReturnType<typeof useRouteStore>
  gameStore: ReturnType<typeof useGameStore>
  notify: ReturnType<typeof useNotificationStore>
  t: ReturnType<typeof useI18n>['t']
  engine: IsoEngine
  /** Keyboard modifier state held outside pointer events (kept by EditorCanvas key handlers). */
  modifiers: { ctrl: boolean; shift: boolean }
}

export interface IEditorTool {
  id: string
  onPointerDown(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void
  onPointerMove(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void
  onPointerUp(coord: GridCoord, ctx: EditorToolContext, e: MouseEvent | TouchEvent): void
  onCancel?(ctx: EditorToolContext): void
}
