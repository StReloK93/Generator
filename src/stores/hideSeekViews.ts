import type { GridCoord, HideSeekSettings } from '../types/map'
import type { HideSeekFootprintView, HideSeekMinimapView, HideSeekRenderView, HideSeekRippleView, HideSeekStoneView } from '../rendering/types'
import {
  CollisionGrid,
  HideSeekMatch,
  HideSeekRole,
  LootProgress,
  canSee,
  hasLineOfSight,
  sightReach,
  directionForFacing,
  sightAround,
  seatOf,
  HideSeekMaze,
  edgePlacement,
  torchLightAt,
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
  myLoot: LootProgress
  heldLid: number
  lidTimers: number[]
  seenEmpty: Set<number>
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
  const iAmHider = !over && me?.role === 'hider'
  const around = sightAround(settings, ctx.flare)
  const litTorches = ctx.maze?.torches.filter((_, i) => match.torches[i]) ?? []
  const torchLight = (p: GridCoord) => (litTorches.length > 0 ? torchLightAt(grid, p, litTorches, settings) : 0)
  const farSight = { ...settings, visionRange: settings.visionRange * TORCH_SIGHT_FACTOR }
  /** In the own sight cone, or standing in a candle's light within the (longer) sight range */
  const inSight = (p: GridCoord) =>
    !!me && !blind && (canSee(grid, me, ctx.visionFacing, p, settings, around) || (torchLight(p) > 0 && canSee(grid, me, ctx.visionFacing, p, farSight)))
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
    chests: match.chests.map((ch, i) => {
      // Hidden in the dark until the player has seen its spot once; then it stays on their screen
      const visible = over || inSight(ch) || isExplored(ctx, ch)
      return {
        col: ch.col,
        row: ch.row,
        lidOpen: !over && (ctx.heldLid === i || (ctx.lidTimers[i] ?? 0) > 0 || (iAmHider && ctx.myLoot.index === i)),
        hasLoot: !ch.looted,
        lootProgress: iAmHider && ctx.myLoot.index === i ? Math.min(1, ctx.myLoot.time / settings.lootTime) : 0,
        // Hiders know where the treasure is left (the beam shows through the dark); the seeker only knows the chests they found and did not see empty
        glow: over || me?.role !== 'seeker' ? !ch.looted : visible && !ctx.seenEmpty.has(i),
        visible,
      }
    }),
    spots: match.spots.map((s, i) => ({ col: s.col, row: s.row, kind: s.kind, facing: s.facing, occupied: me?.hidden === i })),
    doors: (ctx.maze?.doors ?? []).flatMap((door, i) =>
      door.edges.map(edge => ({ ...edgePlacement(edge, ctx.cols), open: !!match.doors[i] }))
    ),
    exits: (ctx.maze?.exits ?? []).flatMap(exit => exit.edges.map(edge => ({ ...edgePlacement(edge, ctx.cols), open: match.exitsOpen }))),
    exitBeacons: match.exitsOpen && !over ? match.exits : [],
    torches: (ctx.maze?.torches ?? []).map((t, i) => ({ col: t.col, row: t.row, lit: !!match.torches[i], glow: match.torches[i] && !blind ? (ctx.torchGlows[i] ?? null) : null })),
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
      const teammate = me?.role === 'hider' && p.role === 'hider'
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
        // Inside a barrel nobody sees you; teammates and the jailed are always shown
        visible: p === me || over || jailed || (p.hidden === -1 && (teammate || inSight(p))),
      }
    }),
  }
}

function isExplored(ctx: HideSeekViewContext, p: GridCoord): boolean {
  const col = Math.round(p.col)
  const row = Math.round(p.row)
  return col >= 0 && row >= 0 && col < ctx.cols && row < ctx.rows && ctx.explored[row * ctx.cols + col] === 1
}

export function buildMinimapView(ctx: HideSeekViewContext): HideSeekMinimapView {
  const { match, me, cols, rows, explored } = ctx
  return {
    cols,
    rows,
    explored,
    walls: ctx.grid.blocked,
    me: me ? { col: me.col, row: me.row } : null,
    // Hiders know every chest still holding treasure; the seeker only the ones they came across
    chests: match.chests.filter((ch, i) => (me?.role === 'seeker' ? isExplored(ctx, ch) && !ctx.seenEmpty.has(i) : !ch.looted)),
    traps: me?.role === 'seeker' ? match.traps : [],
    exits: match.exitsOpen ? match.exits : [],
    mates: me?.role === 'hider'
      ? ctx.bodies.filter(p => p !== me && p.role === 'hider').map(p => ({ col: p.col, row: p.row, jailed: !!seatOf(match, p.id)?.jailed }))
      : [],
  }
}
