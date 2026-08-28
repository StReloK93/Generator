export interface TileItem {
  id: string
  x: number // base origin col
  y: number // base origin row
  assetId: string
  zIndex: number // default / base zIndex within same cell
  depthOffset?: number // relative depth offset relative to neighboring grid cells (-5 to +5: e.g. +1 renders on top of cell in front, -1 renders behind cell above)
  cellZIndex?: Record<string, number> // key: `${col},${row}` -> per-cell specific Z-Index for multi-cell objects!
  spanX?: number // width in cells (default: 1)
  spanY?: number // height in cells (default: 1)
  scale?: number // scale multiplier (default: 1.0)
  anchorX?: number // custom instance anchor X (0.0 to 1.0)
  anchorY?: number // custom instance anchor Y (0.0 to 1.0)
  flipX?: boolean
  rotation?: number // in degrees: 0, 90, 180, 270
  offsetX?: number // fine pixel offset
  offsetY?: number // fine pixel offset
  opacity?: number
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  tiles: Record<string, TileItem[]> // key: `${x},${y}` -> array of stacked TileItems
}

export interface MapProject {
  id: string
  name: string
  cols: number
  rows: number
  tileWidth: number
  tileHeight: number
  bgColor: string
  showGrid: boolean
  gridColor: string
  layers: Layer[]
  customRoutes?: Record<string, GridCoord[]>
  characterConfig?: {
    spawnCount?: number
    speed?: number
    spawnMode?: string
    formation?: string
    pairDistance?: number
    followCamera?: boolean
    showPathTrail?: boolean
    autoLoop?: boolean
    selectedDoorIndex?: number
  }
  placedTowers?: any[]
  towerBlueprints?: any[]
  waveConfigs?: any[]
  currentWaveIndex?: number
  createdAt: number
  updatedAt: number
}

export interface AssetItem {
  id: string
  name: string
  src: string // original full data URL or blob URL
  previewSrc?: string // auto-centered thumbnail for clean gallery display
  category: string
  width: number
  height: number
  anchorX: number // default 0.5 (center)
  anchorY: number // default 0.5 or 0.88 or auto-detected base
  contentBounds?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  spanX?: number // default 1
  spanY?: number // default 1
  scale?: number // default 1.0
  isSample?: boolean
  fileRelativePath?: string
}

export type ToolType = 'select' | 'brush' | 'bucket' | 'eraser' | 'picker' | 'line' | 'rect' | 'pan'

export type PlacementMode = 'ask' | 'stack' | 'replace'

export interface GridCoord {
  col: number
  row: number
}

export interface Point2D {
  x: number
  y: number
}

export interface ProjectHistoryItem {
  description: string
  timestamp: number
  layers: Layer[]
}

export interface SelectedElementRef {
  col: number
  row: number
  layerId: string
  itemId: string
}
