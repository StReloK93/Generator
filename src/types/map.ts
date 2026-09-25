export interface TileItem {
  id: string
  x: number // base origin col
  y: number // base origin row
  assetId: string
  zIndex: number // default / base zIndex within same cell
  depthOffset?: number // relative depth offset relative to neighboring grid cells (-5 to +5: e.g. +1 renders on top of cell in front, -1 renders behind cell above)
  isFrontWall?: boolean // if true, renders in front of characters in this cell (occludes Hero)
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

export type UnitVariantType = 
  | 'normal' 
  | 'fire' 
  | 'frost' 
  | 'poison' 
  | 'void' 
  | 'electric' 
  | 'blood' 
  | 'golden'
  | 'demon'

import type { TowerTraitType } from './combat'

export type { 
  TowerTraitType, 
  CombatEffect, 
  SplashType, 
  TargetStrategy, 
  DamageElement,
  DamageEffect,
  BurnEffect,
  SlowEffect,
  PoisonEffect,
  BleedEffect,
  StunEffect,
  ChainEffect,
  VulnerabilityEffect,
  StackingDamageEffect,
} from './combat'

export type {
  TowerAsset,
  TowerLevel,
  TowerEffect,
  TowerAssetConfig,
  TowerLevelConfig,
  TowerBlueprint,
  PlacedTower,
} from './tower'

export interface TowerTraitsConfig {
  traits?: import('./combat').TowerTraitType[]
  effects?: import('./combat').CombatEffect[]
}

export type ProjectileType =
  | 'fireball'
  | 'middle_flame'
  | 'strong_flame'
  | 'flame_laser'
  | 'flame_rocket'
  | (string & {})

export interface WaveConfig {
  waveNumber: number
  name: string
  unitHp: number
  unitSpeed: number
  unitCount: number
  isBoss: boolean
  goldReward: number
  unitBonus?: number
  endWaveBonus?: number
  characterModel?: string
  animSpeed?: number
  offsetY?: number
  unitScale?: number
  unitVariant?: UnitVariantType
  variantTint?: number | string
  immunities?: TowerTraitType[]
}

export interface TowerClan {
  id: string
  name: string
  description?: string
  iconName?: string // Lucide icon name: Castle, Flame, Snowflake, Skull, Zap, Ghost, Droplet, Shield, Swords, Crown, etc.
  color?: string // Theme hex or CSS color
  bannerColor?: string // Gradient or accent color
  isDefault?: boolean
}

export interface MapGameSettings {
  startingGold: number
  startingLives: number
  wavePrepTime: number
  spawnMode?: 'all_routes' | 'single_route'
  formation?: string
  pairDistance?: number
  unitElevation?: number
  unitScaleMultiplier?: number
  scoreMultiplier?: number
  maxPlayers?: number
  playerCount?: number
}

export interface Route {
  id?: string
  name?: string
  routePoints: GridCoord[]
  playerCameraPoint?: { col: number, row: number }
}

export interface RouteInfo {
  id: string
  name?: string
  routePoints: GridCoord[]
  playerCameraPoint?: { col: number, row: number }
}

export type MapGameMode = 'td' | 'hero'

export interface MapProject {
  id: string
  name: string
  gameMode?: MapGameMode
  cols: number
  rows: number
  tileWidth: number
  tileHeight: number
  bgColor: string
  showGrid: boolean
  gridColor: string
  layers: Layer[]
  routes?: RouteInfo[]
  gameSettings?: MapGameSettings
  clans?: TowerClan[]
  placedTowers?: any[]
  towerBlueprints?: any[]
  waveConfigs?: WaveConfig[]
  currentWaveIndex?: number
  buildableCells?: string[] // list of `${col},${row}` cells where towers can be built. If empty/undefined, all valid cells are buildable
  waterCells?: string[] // list of `${col},${row}` cells designated as animated water
  collisionSubcells?: string[] // list of `${subCol},${subRow}` 2x2 subgrid obstacle cells for hero & unit collision
  buildMode?: 'all' | 'custom'
  createdAt: number
  updatedAt: number
}

export interface AssetItem {
  id: string
  name: string
  baseName?: string
  src: string // original full data URL or blob URL
  previewSrc?: string // preview thumbnail for gallery display
  trimmedSrc?: string // trimmed standalone graphic specifically for Asset Redactor
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
  depthOffset?: number // default depth offset
  isFrontWall?: boolean // if true, placed in front of characters / occludes Hero
  isSample?: boolean
  fileRelativePath?: string
}

export type ToolType = 'select' | 'brush' | 'bucket' | 'eraser' | 'picker' | 'line' | 'rect' | 'box-fill' | 'box-clear' | 'buildable' | 'water' | 'collision' | 'scatter' | 'pan'

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
  buildableCells?: string[]
  buildMode?: 'all' | 'custom'
  waterCells?: string[]
  tilesCount?: number
}

export interface SelectedElementRef {
  col: number
  row: number
  layerId: string
  itemId: string
}

export interface BoxAssetSummary {
  assetId: string
  assetName: string
  category: string
  previewSrc?: string
  totalCount: number
  layerCounts: Record<string, number> // layerId -> count
}

export interface BoxClearModalData {
  col0: number
  row0: number
  col1: number
  row1: number
  totalCells: number
  totalItems: number
  assets: BoxAssetSummary[]
  layerItems: Record<string, { totalItems: number; assets: BoxAssetSummary[] }>
  cells?: GridCoord[]
}
