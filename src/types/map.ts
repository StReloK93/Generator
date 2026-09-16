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

export type TowerTraitType = 
  | 'fire' 
  | 'frost' 
  | 'poison' 
  | 'stacking' 
  | 'blood' 
  | 'electric' 
  | 'void'

export interface TowerTraitsConfig {
  traits?: TowerTraitType[]
  // Fire trait
  fireBonusDamage?: number
  burnDps?: number
  burnDuration?: number
  // Frost trait
  slowPercent?: number
  slowDuration?: number
  frostBonusDamage?: number
  // Poison trait
  poisonDps?: number
  poisonDuration?: number
  poisonSlowPercent?: number
  // Stacking (Ramping) damage on consecutive hits
  stackBonusDamage?: number
  maxStacks?: number
  // Blood / Bleed trait
  bleedDps?: number
  bleedDuration?: number
  // Electric trait
  electricBonusDamage?: number
  chainTargets?: number
  stunDuration?: number
  // Void trait
  voidVulnPercent?: number
  voidDuration?: number
}

export type ProjectileType =
  // 1. Fire / Inferno (10 types)
  | 'fireball'
  | 'fire_laser'
  | 'fire_splash'
  | 'fire_ember'
  | 'fire_flamethrower'
  | 'fire_magma_orb'
  | 'fire_dragon_breath'
  | 'fire_hellfire_skull'
  | 'fire_phoenix_feather'
  | 'fire_solar_flare'
  // 2. Frost / Ice (10 types)
  | 'frost_bolt'
  | 'frost_shard'
  | 'frost_orb'
  | 'frost_laser'
  | 'frost_nova'
  | 'frost_spear'
  | 'frost_snowflake'
  | 'frost_comet'
  | 'frost_hailstone'
  | 'frost_absolute_zero'
  // 3. Electro / Storm (10 types)
  | 'electro_spark'
  | 'electro_ball'
  | 'electro_laser'
  | 'electro_chain'
  | 'electro_disc'
  | 'electro_overload'
  | 'electro_bolt'
  | 'electro_plasma_wave'
  | 'electro_storm_cloud'
  | 'electro_blue_laser'
  // 4. Poison / Nature (10 types)
  | 'poison_glob'
  | 'poison_dart'
  | 'poison_cloud'
  | 'poison_acid_spray'
  | 'poison_spore'
  | 'poison_thorn'
  | 'poison_spider_web'
  | 'poison_slug'
  | 'poison_vial'
  | 'poison_skull_cloud'
  // 5. Arcane / Cosmic (10 types)
  | 'magic_bolt'
  | 'arcane_orb'
  | 'arcane_star'
  | 'arcane_laser'
  | 'arcane_spiral'
  | 'arcane_rune'
  | 'arcane_crystal'
  | 'arcane_black_hole'
  | 'arcane_meteor'
  | 'arcane_butterfly'
  // 6. Void / Shadow / Blood (10 types)
  | 'void_orb'
  | 'void_tendril'
  | 'void_laser'
  | 'void_skull'
  | 'void_scythe'
  | 'blood_bolt'
  | 'blood_orb'
  | 'blood_slash'
  | 'dark_portal'
  | 'shadow_dagger'
  // 7. Siege / Physical / Tech (10 types)
  | 'arrow'
  | 'cannonball'
  | 'missile'
  | 'laser'
  | 'boulder'
  | 'shrapnel_bomb'
  | 'plasma_grenade'
  | 'crossbow_bolt'
  | 'sawblade'
  | 'cluster_rocket'
  // 8. Holy / Radiant (10 types)
  | 'holy_ray'
  | 'holy_cross'
  | 'holy_hammer'
  | 'holy_orb'
  | 'holy_spear'
  | 'holy_feather'
  | 'holy_ring'
  | 'holy_chalice_splash'
  | 'holy_sword'
  | 'holy_supernova'
  | 'fire_meteor'
  | 'arcane_singularity'
  | 'void_bolt'
  | 'holy_bolt'
  | (string & {})

export interface TowerLevelConfig extends TowerTraitsConfig {
  level: number // 1, 2, 3, etc.
  name?: string // Custom level label (e.g. "Flame Guard II")
  cost: number // Gold upgrade cost to reach this level (0 or base price for level 1)
  damage: number
  attackSpeed: number // seconds per attack
  range: number // attack range in tiles
  projectileType?: ProjectileType
  projectileSpeed?: number
  projectileColor?: number
  isSplash?: boolean
  splashRadius?: number
  splashType?: 'constant' | 'falloff'
}

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
  scoreMultiplier?: number
}

export interface SpawnPointData {
  id: string
  col: number
  row: number
  spawnCol?: number
  spawnRow?: number
  name?: string
  quadrant?: number
  isCorner?: boolean
  cornerName?: string
  layerId?: string
  assetId?: string
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
  spawnPoints?: SpawnPointData[]
  customRoutes?: Record<string, GridCoord[]>
  customWaypoints?: Record<string, GridCoord[]>
  characterConfig?: {
    spawnCount?: number
    speed?: number
    spawnMode?: string
    formation?: string
    pairDistance?: number
    followCamera?: boolean
    showPathTrail?: boolean
    autoLoop?: boolean
    selectedDoorIndex?: number | null
    unitElevation?: number
    unitScaleMultiplier?: number
  }
  gameSettings?: MapGameSettings
  clans?: TowerClan[]
  placedTowers?: any[]
  towerBlueprints?: any[]
  waveConfigs?: WaveConfig[]
  currentWaveIndex?: number
  buildableCells?: string[] // list of `${col},${row}` cells where towers can be built. If empty/undefined, all valid cells are buildable
  waterCells?: string[] // list of `${col},${row}` cells designated as animated water
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
  isSample?: boolean
  fileRelativePath?: string
}

export type ToolType = 'select' | 'brush' | 'bucket' | 'eraser' | 'picker' | 'line' | 'rect' | 'box-fill' | 'box-clear' | 'buildable' | 'water' | 'pan'

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
}
