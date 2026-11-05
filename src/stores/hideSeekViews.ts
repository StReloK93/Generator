import type { GridCoord, HideSeekSettings } from '../types/map'
import type { HideSeekFootprintView, HideSeekMinimapView, HideSeekRenderView, HideSeekRippleView, HideSeekStoneView } from '../rendering/types'
import {
  CollisionGrid,
  HideSeekMatch,
  HideSeekRole,
  canSee,
  hasLineOfSight,
  sightReach,
  directionForFacing,
  sightAround,
  seatOf,
  HideSeekMaze,
  edgePlacement,
  torchLightAt,
  torchSpots,
  traitOf,
  spottedWithin,
  TORCH_SIGHT_FACTOR,
} from '../domain/hideseek'

/** A character as the hide & seek session tracks it. */
export interface HideSeekBody extends GridCoord {
  id: string
  name: string
  color: string
  model: string
  role: HideSeekRole
  /** Last network position of a remote player (rendered position eases towards it) */
  targetCol: number
  targetRow: number
  facing: number
  moving: boolean
  sneaking: boolean
  /** Hiding spot the player sits in (-1 = none) */
  hidden: number
  frame: number
  animTimer: number
  stepTimer: number
}

/** Everything the per-frame views are built from (the session's current state). */
export interface HideSeekViewContext {
  match: HideSeekMatch
  bodies: HideSeekBody[]
  me: HideSeekBody | undefined
  /** The local player's rules (the seeker's sight reaches further during the hunt) */
  settings: HideSeekSettings
  grid: CollisionGrid
  /** This round's random labyrinth (doors, candle stands) */
  maze: HideSeekMaze | null
  torchGlows: GridCoord[][]
  footprints: HideSeekFootprintView[]
  huntHint: { from: GridCoord; angle: number; strength: number } | null
  tileWidth: number
  tileHeight: number
  visionFacing: number
  vision: GridCoord[] | null
  /** Own flare burning (vision already includes the lit circle) */
  flare: boolean
  route: GridCoord[]
  stones: HideSeekStoneView[]
  ripples: HideSeekRippleView[]
  aim: { from: GridCoord; to: GridCoord } | null
  /** Cells this player has seen this round (1 = seen) */
  explored: Uint8Array
  cols: number
  rows: number
}

/** Everything in sight is evenly lit; only the last stretch (tiles) of each direction fades into the dark */
const LIGHT_FADE_WIDTH = 3.5

/** Between rounds and after the match nothing is hidden any more. */
export function isRoundOver(match: HideSeekMatch): boolean {
  return match.clock.phase === 'roundOver' || match.clock.phase === 'ended'
}

export function buildRenderView(ctx: HideSeekViewContext): HideSeekRenderView {
  const { match, me, settings, grid } = ctx
  const over = isRoundOver(match)
  const blind = !over && me?.role === 'seeker' && match.clock.phase === 'hiding'
  const around = sightAround(settings, ctx.flare)
  const candles = torchSpots(match, ctx.maze)
  const litTorches = candles.filter((_, i) => match.torches[i])
  const torchLight = (p: GridCoord) => (litTorches.length > 0 ? torchLightAt(grid, p, litTorches, settings) : 0)
  /** In the own sight cone, or standing in a candle's light within the (longer) sight range. `within` shortens the
   * range for a shadow (spotted only from close by). */
  const inSight = (p: GridCoord, within = 1) => {
    if (!me || blind) return false
    const near = within === 1 ? settings : { ...settings, visionRange: settings.visionRange * within }
    const far = { ...near, visionRange: near.visionRange * TORCH_SIGHT_FACTOR }
    return canSee(grid, me, ctx.visionFacing, p, near, around * within) || (torchLight(p) > 0 && canSee(grid, me, ctx.visionFacing, p, far))
  }
  /** 0 = dark .. 1 = fully lit by the player's lantern / sight or by a candle */
  const lightAt = (p: GridCoord): number => {
    if (over) return 1
    if (!me || blind) return 0
    const reach = sightReach(me, ctx.visionFacing, p, settings, around)
    const d = Math.hypot(p.col - me.col, p.row - me.row)
    let own = 0
    if (d <= reach && hasLineOfSight(grid, me, p)) {
      const fadeFrom = Math.max(0, reach - LIGHT_FADE_WIDTH)
      own = d <= fadeFrom ? 1 : 1 - (d - fadeFrom) / (reach - fadeFrom)
    }
    return Math.max(own, torchLight(p))
  }

  return {
    blind,
    // Everyone knows where the altars are and sees one being lit from afar
    altars: match.altars.map(a => ({ col: a.col, row: a.row, progress: a.progress, lit: a.lit })),
    chains: over ? [] : match.chains.flatMap(chain => {
      const hider = ctx.bodies.find(p => p.id === chain.hider)
      const seeker = ctx.bodies.find(p => p.id === chain.seeker)
      return hider && seeker
        ? [{ from: { col: hider.col, row: hider.row }, to: { col: seeker.col, row: seeker.row }, left: Math.max(0, chain.timeLeft / settings.chainTime) }]
        : []
    }),
    spots: match.spots.map((s, i) => ({ col: s.col, row: s.row, kind: s.kind, facing: s.facing, occupied: me?.hidden === i })),
    doors: (ctx.maze?.doors ?? []).flatMap((door, i) =>
      door.edges.map(edge => ({ ...edgePlacement(edge, ctx.cols), open: !!match.doors[i] }))
    ),
    exits: (ctx.maze?.exits ?? []).flatMap(exit => exit.edges.map(edge => ({ ...edgePlacement(edge, ctx.cols), open: match.exitsOpen }))),
    exitBeacons: match.exitsOpen && !over ? match.exits : [],
    torches: candles.map((t, i) => ({ col: t.col, row: t.row, lit: !!match.torches[i], glow: match.torches[i] && !blind ? (ctx.torchGlows[i] ?? null) : null })),
    torchRadius: settings.torchRadius,
    footprints: over ? [] : ctx.footprints,
    huntHint: over ? null : ctx.huntHint,
    // The seeker knows their bells; anyone hears / sees one ring; hiders spot an armed one only in sight
    traps: match.traps
      .filter(t => over || me?.role === 'seeker' || t.ringing > 0 || inSight(t))
      .map(t => ({ col: t.col, row: t.row, ringing: t.ringing > 0 })),
    stones: ctx.stones,
    ripples: ctx.ripples,
    aim: ctx.aim,
    flareLit: !over && ctx.flare,
    route: me && ctx.route.length > 0 ? [{ col: me.col, row: me.row }, ...ctx.route] : [],
    vision: over ? null : ctx.vision,
    sightReaches: !over && me && ctx.vision ? ctx.vision.slice(1).map(p => sightReach(me, ctx.visionFacing, p, settings, around)) : [],
    lightFadeWidth: LIGHT_FADE_WIDTH,
    lightAt,
    avatars: ctx.bodies.map(p => {
      const seat = seatOf(match, p.id)
      const jailed = !!seat?.jailed
      // Both teams know where their own players are
      const teammate = !!me && p.role === me.role
      return {
        id: p.id,
        col: p.col,
        row: p.row,
        direction: directionForFacing(p.facing, ctx.tileWidth, ctx.tileHeight),
        action: p.moving ? 'Run' : 'Idle',
        frame: p.frame,
        sneaking: p.moving && p.sneaking,
        model: p.model,
        color: p.color,
        isMe: p === me,
        jailed,
        hidden: p === me && p.hidden !== -1,
        dazed: !over && (seat?.dazed ?? 0) > 0,
        // Inside a barrel nobody sees you; teammates and the jailed are always shown
        visible: p === me || over || jailed || (p.hidden === -1 && (teammate || inSight(p, spottedWithin(settings, traitOf(p.model))))),
      }
    }),
  }
}

export function buildMinimapView(ctx: HideSeekViewContext): HideSeekMinimapView {
  const { match, me, cols, rows, explored } = ctx
  return {
    cols,
    rows,
    explored,
    walls: ctx.grid.blocked,
    me: me ? { col: me.col, row: me.row } : null,
    altars: match.altars.map(a => ({ col: a.col, row: a.row, lit: a.lit })),
    traps: me?.role === 'seeker' ? match.traps : [],
    exits: match.exitsOpen ? match.exits : [],
    seekerBase: ctx.maze?.seekerBase ?? null,
    hiderBase: ctx.maze?.hiderBase ?? null,
    mates: me ? ctx.bodies.filter(p => p !== me && p.role === me.role).map(p => ({ col: p.col, row: p.row, jailed: !!seatOf(match, p.id)?.jailed })) : [],
  }
}
