import { GridCoord, MapProject, AssetItem, SelectedElementRef } from '../types/map'

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
  isSettingSpawnPoint?: boolean
  isSettingPlayerStartPoint?: boolean
}
