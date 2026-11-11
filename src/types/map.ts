import type { ProjectileDefinition } from './projectile'

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
  TowerTraitParams,
  TowerLevel,
  TowerEffect,
  TowerBlueprint,
  PlacedTower,
} from './tower'

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

export type MapGameMode = 'td' | 'hero' | 'hideseek'

/** Hide & seek PvP rules stored per map (distances in tiles, times in seconds, angle in degrees). */
export interface HideSeekSettings {
  roundTime: number
  /** Seconds the seekers wait with closed eyes at the start of a round (0 = they set off right away) */
  hideTime: number
  runSpeed: number
  sneakSpeed: number
  visionRange: number
  visionAngle: number
  hearingRange: number
  catchDistance: number
  /** Players in a room */
  maxPlayers: number
  /** The first lobby slots seek, the rest hide; the roles stay for the whole match */
  seekerSlots: number
  /** Rounds in a match (the side that wins most of them wins the match) */
  roundCount: number
  /** Altars spread over the labyrinth: one per hider plus this many; the hiders need all but one of them lit */
  altarExtra: number
  /** Seconds one hider stands at an altar to light it (two together take half as long) */
  altarLightTime: number
  /** Seconds a seeker standing at a half-lit altar (nobody lighting it) needs to put it out completely */
  altarKickTime: number
  /** An altar lights in this many stages: a seeker only puts it out down to the last stage reached */
  altarStages: number
  /** Share of the altars the hiders have to light (rounded up) */
  altarsNeededShare: number
  /** Altars stand at least this many tiles away from both bases (they have to be searched for) */
  altarBaseDistance: number
  /** Room game: seconds everyone has to pick a hero at the start (then a random one is picked for them) */
  heroPickTime: number
  /** Seconds a free hider stands at the jail to set everybody in it free */
  rescueTime: number
  /** Chain: a hider who lit an altar can hold a seeker this close (tiles) for chainTime seconds; both stand still.
   * When it runs out the seeker is dazed for chainDaze seconds; another seeker touching the held one frees them.
   * The hider can chain again after chainCooldown seconds */
  chainRange: number
  chainTime: number
  chainCooldown: number
  chainDaze: number
  /** Seconds of running before a player is out of breath */
  staminaSeconds: number
  /** Running seconds regained per second while walking quietly or standing */
  staminaRegen: number
  /** Every player sees this far all around them (their lantern's glow), even behind; 0 = only the sight cone */
  lanternRadius: number
  /** Speed while out of breath */
  tiredSpeed: number
  /** The seeker runs this much faster (short bursts, then tires like everyone) */
  seekerSpeedBonus: number
  /** Barrels / crates a hider can hide inside */
  hideSpotCount: number
  /** How far a bell / door is heard */
  noiseRange: number
  /** Bell traps the seeker can place per round */
  trapCount: number
  /** Points: per altar lit, per hider caught / freed, for winning a round, per second a hider stays free */
  scoreAltar: number
  scoreCatch: number
  scoreRescue: number
  scoreWin: number
  scorePerSecond: number
  /** A new random labyrinth every round (the map's own layout is only the preview) */
  randomMaze: boolean
  /** Labyrinth size with one seeker; every further seeker makes it this many cells bigger each way */
  mazeCols: number
  mazeRows: number
  mazeGrowPerSeeker: number
  /** Rooms carved into the random labyrinth, doors on their entrances, crawl holes only the crawler gets through, candle stands */
  roomCount: number
  doorCount: number
  holeCount: number
  torchCount: number
  /** How far a candle stand lights the floor; anything in its light is seen from afar */
  torchRadius: number
  /** Exit gates on the labyrinth's edge: they open once the hiders lit enough altars, and a hider who gets out wins
   * (0 = enough altars win right away) */
  exitCount: number
  /** Running leaves footprints on the floor for this long (sneaking leaves none) */
  footprintSeconds: number
  /** The last seconds of a round are the hunt: the seeker sees further and gets a hint where the nearest hider is */
  huntTime: number
  huntPingInterval: number
  /** Extra sight range during the hunt (0.3 = 30% further) */
  huntVisionBonus: number
  /** Candles the seeker can set down per round (they light the floor around them, hiders can blow them out) */
  seekerCandleCount: number
  /** Per hider caught this round the seeker runs this much faster (0.08 = 8%) and keeps running this much longer */
  catchSpeedBonus: number
  catchStaminaBonus: number
  /** Character traits (each character has one, in both roles): swift runs faster, enduring keeps breath longer
   * (and gets it back faster), keen-eyed sees further; only the crawler fits through the crawl holes */
  traitSpeedBonus: number
  traitStaminaBonus: number
  traitVisionBonus: number
  /** Rescuer: frees jailed teammates from this many times the catch distance; as the seeker catches from this much further */
  traitRescueReach: number
  traitCatchReach: number
  /** Shadow: others spot them only this close (share of their sight range); their steps are this loud */
  traitStealthSight: number
  traitStealthNoise: number
  /** Firekeeper: lights altars this much faster (0.5 = 50%) */
  traitLightBonus: number
  /** Trickster: this many extra of each own gadget per round */
  traitExtraGadgets: number
  /** Hero abilities (Q / F, in both roles): how far a dash / blink goes (tiles), how long a timed one lasts and
   * the cooldowns (seconds); watch shows opponents within watchRange through walls */
  dashDistance: number
  dashCooldown: number
  windTime: number
  windCooldown: number
  secondWindCooldown: number
  shieldTime: number
  shieldCooldown: number
  vanishTime: number
  vanishCooldown: number
  blinkDistance: number
  blinkCooldown: number
  watchRange: number
  watchTime: number
  watchCooldown: number
  trackTime: number
  trackCooldown: number
  /** slowFactor: share of the speed while slowed (a roar, a fire wall); snareLife: how long a snare waits for prey */
  hookRange: number
  hookCooldown: number
  roarRange: number
  roarTime: number
  roarCooldown: number
  slowFactor: number
  burrowTime: number
  burrowCooldown: number
  senseTime: number
  senseCooldown: number
  scoutDistance: number
  scoutRadius: number
  scoutTime: number
  scoutCooldown: number
  fireWallLength: number
  fireWallTime: number
  fireWallSlowTime: number
  fireWallCooldown: number
  decoyTime: number
  decoyCooldown: number
  snareTime: number
  snareLife: number
  snareCooldown: number
}

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
  hideSeekSettings?: Partial<HideSeekSettings>
  clans?: TowerClan[]
  placedTowers?: any[]
  towerBlueprints?: any[]
  /** Player-made projectiles the towers of this map use (built-in ones are referenced by id only) */
  customProjectiles?: ProjectileDefinition[]
  waveConfigs?: WaveConfig[]
  currentWaveIndex?: number
  buildableCells?: string[] // list of `${col},${row}` cells where towers can be built. If empty/undefined, all valid cells are buildable
  waterCells?: string[] // list of `${col},${row}` cells designated as animated water
  collisionSubcells?: string[] // list of `${subCol},${subRow}` 2x2 subgrid obstacle cells for hero & unit collision
  buildMode?: 'all' | 'custom'
  /** Picture the map picker shows for this map (image data URL); without it the picker draws the map small */
  previewImage?: string
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
