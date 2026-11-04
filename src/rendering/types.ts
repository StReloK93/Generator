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
  /** Crouched, tiptoeing walk (Shift) */
  sneaking: boolean
  model: string
  color: string
  isMe: boolean
  visible: boolean
  /** Caught: stands in the jail (or where they were caught) until a teammate frees them */
  jailed: boolean
  /** Own character sitting inside a barrel (drawn faint) */
  hidden: boolean
  /** Carries a treasure home (a gem over their head) */
  carrying: boolean
}

/** One treasure chest as this player perceives it. */
export interface HideSeekChestView {
  col: number
  row: number
  lidOpen: boolean
  /** Treasure inside (only visible while the lid is open) */
  hasLoot: boolean
  /** The hider taking the treasure: 0..1 */
  lootProgress: number
  /** Light beam: the chest may still hold treasure as far as this player knows (hiders see it through the dark) */
  glow: boolean
  /** Seen by the player (in sight now or found before); undiscovered chests are hidden in the dark */
  visible: boolean
}

/** A barrel / crate a hider can hide in. */
export interface HideSeekSpotView {
  col: number
  row: number
  kind: 'barrel' | 'cabinet'
  /** Sprite suffix: the way the cabinet's front faces */
  facing: 'E' | 'N' | 'S' | 'W'
  /** The local player sits inside it */
  occupied: boolean
}

/** One door piece on a cell edge (a double door is two pieces). */
export interface HideSeekDoorView {
  col: number
  row: number
  /** Wall sprite suffix and depth like the map's wall pieces */
  suffix: 'E' | 'N' | 'S' | 'W'
  depthOffset: number
  open: boolean
}

/** A candle stand; a burning one lights the floor around it (glow = its light polygon, origin first). */
export interface HideSeekTorchView {
  col: number
  row: number
  lit: boolean
  glow: GridCoord[] | null
}

/** A footprint left by a running player, fading out (age 0..1). */
export interface HideSeekFootprintView {
  col: number
  row: number
  facing: number
  /** Left or right foot (slightly to the side of the path) */
  left: boolean
  age: number
}

/** A bell trap (the seeker sees their own; others only when it rings or is in sight). */
export interface HideSeekTrapView {
  col: number
  row: number
  ringing: boolean
}

/** A thrown stone in flight: t = 0..1 of its arc. */
export interface HideSeekStoneView {
  from: GridCoord
  to: GridCoord
  t: number
}

/** An expanding ring where a noise happened: age = 0..1. */
export interface HideSeekRippleView {
  col: number
  row: number
  age: number
  kind: 'stone' | 'bell'
}

/** A rectangle of map cells (the seekers' base). */
export interface HideSeekAreaView {
  col: number
  row: number
  cols: number
  rows: number
}

export interface HideSeekRenderView {
  avatars: HideSeekAvatarView[]
  chests: HideSeekChestView[]
  spots: HideSeekSpotView[]
  traps: HideSeekTrapView[]
  doors: HideSeekDoorView[]
  /** Exit gate pieces (open once the hiders took enough treasure) and, when open, the spots to run to */
  exits: HideSeekDoorView[]
  exitBeacons: GridCoord[]
  /** Treasures dropped by caught hiders (hiders always know where; seekers when they see one) */
  treasures: GridCoord[]
  torches: HideSeekTorchView[]
  /** How far a burning candle lights the floor */
  torchRadius: number
  /** Footprints of the other players (only those in light are drawn) */
  footprints: HideSeekFootprintView[]
  /** The hunt (last seconds of a round): the seeker's hint towards the nearest hider, 0..1 strength (null = none) */
  huntHint: { from: GridCoord; angle: number; strength: number } | null
  stones: HideSeekStoneView[]
  ripples: HideSeekRippleView[]
  /** Stone aiming: dotted throw line to where it would land */
  aim: { from: GridCoord; to: GridCoord } | null
  /** A flare burns: the sight polygon is lit brighter (it already includes the circle around the seeker) */
  flareLit: boolean
  /** Own click-to-move route: current position first, destination last (empty when not walking one) */
  route: GridCoord[]
  /** Local player's sight cone, starting at the player (grid space); null = no fog (match over). */
  vision: GridCoord[] | null
  /** Nominal reach of each sight ray (vision[i + 1]): the cone's range or the glow around; the soft edge is drawn relative to it */
  sightReaches: number[]
  /** Light keeps full strength up to this many tiles before a ray's reach, then fades */
  lightFadeWidth: number
  /** 0 = dark .. 1 = fully lit at a grid point (walls and props are lit with it) */
  lightAt: (p: GridCoord) => number
  /** Eyes closed: everything is covered (seeker while the hider hides). */
  blind: boolean
}

/** Hide & seek minimap: the maze as far as this player has explored it. */
export interface HideSeekMinimapView {
  cols: number
  rows: number
  /** 1 = cell seen at least once (index row * cols + col) */
  explored: Uint8Array
  /** Collision sub-cells (index sr * cols * 2 + sc) */
  walls: Uint8Array
  me: GridCoord | null
  /** Chests this player believes still hold treasure */
  chests: GridCoord[]
  traps: GridCoord[]
  /** Open exit gates */
  exits: GridCoord[]
  /** Both bases (always shown: everyone knows where they are) */
  seekerBase: HideSeekAreaView | null
  hiderBase: HideSeekAreaView | null
  /** Dropped treasures (hiders only) */
  treasures: GridCoord[]
  /** Teammates (same role) and whether they wait in jail */
  mates: (GridCoord & { jailed: boolean })[]
}
