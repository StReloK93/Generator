import { GridCoord, SelectedElementRef } from '../types/map'

export interface ViewportTransform {
  zoom: number
  pan: { x: number; y: number }
}

export interface RenderGridOptions {
  showOriginAxis?: boolean
  gridAlpha?: number
  showOriginCoords?: boolean
  showSymmetry?: boolean
  showTileCoords?: boolean
}

export interface RenderTowersOptions {
  hoveredCell?: GridCoord | null
  activeBuildTowerId?: string | null
  selectedPlacedTowerId?: string | null
}

export interface RenderOverlayOptions {
  hoverCell?: GridCoord | null
  selection?: SelectedElementRef | null
  previewCells?: { col: number; row: number; valid?: boolean; color?: number }[]
  previewColor?: number
  isDrawingRoute?: boolean
  isSettingRouteStart?: boolean
  isSettingPlayerStartPoint?: boolean
}

/** One hide & seek character as the renderer draws it (positions in grid space). */
export interface HideSeekAvatarView {
  id: string
  col: number
  row: number
  direction: number
  action: 'Idle' | 'Run'
  frame: number
  model: string
  color: string
  isMe: boolean
  visible: boolean
}

export interface HideSeekRenderView {
  avatars: HideSeekAvatarView[]
  chests: { col: number; row: number; opened: boolean }[]
  /** Own click-to-move route: current position first, destination last (empty when not walking one) */
  route: GridCoord[]
  /** Local player's sight cone, starting at the player (grid space); null = no fog (match over). */
  vision: GridCoord[] | null
  /** Full sight distance in tiles (the cone's soft far edge is drawn relative to it) */
  visionRange: number
  /** Eyes closed: everything is covered (seeker while the hider hides). */
  blind: boolean
}
