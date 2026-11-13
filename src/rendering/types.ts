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
  /** On my side (me, my teammates, our decoys): a green ring under the feet; anyone else a red one */
  friendly: boolean
  isMe: boolean
  visible: boolean
  /** Caught: stands in the jail (or where they were caught) until a teammate frees them */
  jailed: boolean
  /** Own character sitting inside a barrel (drawn faint) */
  hidden: boolean
  /** Dazed after a chain ran out (stars over the head) */
  dazed: boolean
  /** Curse genre: carries the curse (a pulsing violet flame ring) */
  cursed: boolean
  /** Curse genre: turned to stone (grey, no chain ring) */
  stone: boolean
  /** Caught: a beam of light takes them to the jail (out: fading away, in: appearing there; t 0..1) */
  teleport?: { phase: 'out' | 'in'; t: number } | null
}

/** An altar as this player knows it: found by seeing it (a lit one is known to all). */
export interface HideSeekAltarView {
  col: number
  row: number
  /** 0..1 lit */
  progress: number
  lit: boolean
  /** Found by this player (in sight now or seen before), or lit */
  visible: boolean
  /** Its progress (beam and ring) shows: in sight, or a hider whose teammates are lighting it */
  progressShown: boolean
}

/** A chain: the hider holding a seeker (both stand still). */
export interface HideSeekChainView {
  from: GridCoord
  to: GridCoord
  /** 0..1 of the chain time left */
  left: number
}

/** A barrel / crate a hider can hide in. */
export interface HideSeekSpotView {
  col: number
  row: number
  kind: 'barrel' | 'cabinet'
  /** Sprite suffix: the way the cabinet's front faces */
  facing: 'E' | 'N' | 'S' | 'W'
  /** The map's own sprite for it (a hand-made labyrinth) */
  asset?: string
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
/** Something an ability left on the map: a scout bird (radius), a fire wall (ends), a snare */
export interface HideSeekMarkView {
  kind: 'scout' | 'fireWall' | 'decoy' | 'snare' | 'nest' | 'trail'
  col: number
  row: number
  radius: number
  ends: [GridCoord, GridCoord] | null
}

export interface HideSeekTrapView {
  col: number
  row: number
  ringing: boolean
}

/** An expanding ring where a bell rang: age = 0..1. */
export interface HideSeekRippleView {
  col: number
  row: number
  age: number
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
  altars: HideSeekAltarView[]
  chains: HideSeekChainView[]
  spots: HideSeekSpotView[]
  traps: HideSeekTrapView[]
  doors: HideSeekDoorView[]
  /** Exit gate pieces (open once the hiders lit enough altars) and, when open, the spots to run to */
  exits: HideSeekDoorView[]
  exitBeacons: GridCoord[]
  torches: HideSeekTorchView[]
  /** How far a burning candle lights the floor */
  torchRadius: number
  /** Footprints of the other players (only those in light are drawn) */
  footprints: HideSeekFootprintView[]
  /** Tracking: footprints are drawn even where it is dark */
  trackAll: boolean
  marks: HideSeekMarkView[]
  /** Aiming a blink: the reach around the player */
  aim: { col: number; row: number; radius: number } | null
  /** The hunt (last seconds of a round): the seeker's hint towards the nearest hider, 0..1 strength (null = none) */
  huntHint: { from: GridCoord; angle: number; strength: number } | null
  ripples: HideSeekRippleView[]
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
  /** The altars this player has found (lit ones are known to all) */
  altars: (GridCoord & { lit: boolean })[]
  traps: GridCoord[]
  /** Open exit gates */
  exits: GridCoord[]
  /** Both bases (always shown: everyone knows where they are) */
  seekerBase: HideSeekAreaView | null
  hiderBase: HideSeekAreaView | null
  /** Teammates (same role) and whether they wait in jail */
  mates: (GridCoord & { jailed: boolean })[]
}
