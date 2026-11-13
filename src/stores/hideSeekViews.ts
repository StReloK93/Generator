import type { GridCoord, HideSeekSettings } from '../types/map'
import type { HideSeekFootprintView, HideSeekMinimapView, HideSeekRenderView, HideSeekRippleView } from '../rendering/types'
import {
  CollisionGrid,
  HideSeekMatch,
  HideSeekRole,
  canSee,
  hasLineOfSight,
  sightReach,
  directionForFacing,
  seatOf,
  HideSeekMaze,
  edgePlacement,
  torchLightAt,
  torchSpots,
  traitOf,
  spottedWithin,
  TORCH_SIGHT_FACTOR,
  scoutedBy,
  trailSees,
  fireWallEnds,
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
  route: GridCoord[]
  /** Aiming a blink: its reach around me (0 = not aiming) */
  aimRadius: number
  ripples: HideSeekRippleView[]
  /** Cells this player has seen this round (1 = seen) */
  explored: Uint8Array
  cols: number
  rows: number
  /** Curse genre: the seeker role is the curse carrier, the jailed have turned to stone */
  curse: boolean
  /** A caught player's teleport to the jail (out: leaving, in: arriving; t 0..1) */
  teleportOf: (id: string) => { phase: 'out' | 'in'; t: number } | null
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
  const around = settings.lanternRadius
  const mySeat = me ? seatOf(match, me.id) : undefined
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
  /** An opponent shows: while I sense the map, in sight, within my watch (through walls) or near my team's scout bird */
  const spotted = (p: GridCoord, within = 1) =>
    !!me &&
    ((mySeat?.effects.sense ?? 0) > 0 ||
      inSight(p, within) ||
      ((mySeat?.effects.watch ?? 0) > 0 && Math.hypot(p.col - me.col, p.row - me.row) <= settings.watchRange) ||
      scoutedBy(match.marks, me.id, p, settings) ||
      match.marks.some(m => m.kind === 'trail' && m.by === me.id && trailSees(m, p, settings) && hasLineOfSight(grid, m, p)))
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
    // Altars have to be found: a player knows the ones they have seen, hiders also the ones their team is lighting,
    // and everyone the lit ones (each flares up across the labyrinth)
    altars: match.altars.map(a => {
      const teamLighting = me?.role === 'hider' && a.progress > 0
      const seenNow = inSight(a)
      return {
        col: a.col,
        row: a.row,
        progress: a.progress,
        lit: a.lit,
        visible: over || a.lit || seenNow || isExplored(ctx, a) || teamLighting,
        progressShown: !a.lit && a.progress > 0 && (over || seenNow || teamLighting),
      }
    }),
    chains: over ? [] : match.chains.flatMap(chain => {
      const hider = ctx.bodies.find(p => p.id === chain.hider)
      const seeker = ctx.bodies.find(p => p.id === chain.seeker)
      return hider && seeker
        ? [{ from: { col: hider.col, row: hider.row }, to: { col: seeker.col, row: seeker.row }, left: Math.max(0, chain.timeLeft / settings.chainTime) }]
        : []
    }),
    spots: match.spots.map((s, i) => ({ col: s.col, row: s.row, kind: s.kind, facing: s.facing, asset: s.asset, occupied: me?.hidden === i })),
    doors: (ctx.maze?.doors ?? []).flatMap((door, i) =>
      door.edges.map(edge => ({ ...edgePlacement(edge, ctx.cols), open: !!match.doors[i] }))
    ),
    exits: (ctx.maze?.exits ?? []).flatMap(exit => exit.edges.map(edge => ({ ...edgePlacement(edge, ctx.cols), open: match.exitsOpen }))),
    exitBeacons: match.exitsOpen && !over ? match.exits : [],
    torches: candles.map((t, i) => ({ col: t.col, row: t.row, lit: !!match.torches[i], glow: match.torches[i] && !blind ? (ctx.torchGlows[i] ?? null) : null })),
    torchRadius: settings.torchRadius,
    footprints: over ? [] : ctx.footprints,
    // Tracking: every footprint shows, even in the dark
    trackAll: !over && (mySeat?.effects.track ?? 0) > 0,
    huntHint: over ? null : ctx.huntHint,
    // The seeker knows their bells; anyone hears / sees one ring; hiders spot an armed one only in sight
    traps: match.traps
      .filter(t => over || me?.role === 'seeker' || t.ringing > 0 || inSight(t))
      .map(t => ({ col: t.col, row: t.row, ringing: t.ringing > 0 })),
    ripples: ctx.ripples,
    route: me && ctx.route.length > 0 ? [{ col: me.col, row: me.row }, ...ctx.route] : [],
    vision: over ? null : ctx.vision,
    sightReaches: !over && me && ctx.vision ? ctx.vision.slice(1).map(p => sightReach(me, ctx.visionFacing, p, settings, around)) : [],
    lightFadeWidth: LIGHT_FADE_WIDTH,
    lightAt,
    aim: !over && me && ctx.aimRadius > 0 ? { col: me.col, row: me.row, radius: ctx.aimRadius } : null,
    // Fire is seen by all; a team's own snares by that team; a scout bird, a nest and a stalker's trail only by their owner
    marks: over
      ? []
      : match.marks
          .filter(m => m.kind === 'fireWall' || (m.kind === 'snare' && m.team === mySeat?.team) || ((m.kind === 'scout' || m.kind === 'nest' || m.kind === 'trail') && m.by === me?.id))
          .map(m => ({
            kind: m.kind,
            col: m.col,
            row: m.row,
            radius: m.kind === 'scout' ? settings.scoutRadius : 0,
            ends: m.kind === 'fireWall' ? fireWallEnds(m, settings) : null,
          })),
    avatars: [
      ...ctx.bodies.map(p => {
      const seat = seatOf(match, p.id)
      const jailed = !!seat?.jailed
      // Both teams know where their own players are
      const teammate = !!me && p.role === me.role
      // Vanished or underground: the other side does not see them; sensing the map: everyone sees them
      const sensing = !!seat && seat.effects.sense > 0
      const unseen = !!seat && (seat.effects.vanish > 0 || seat.effects.burrow > 0) && !sensing
      return {
        id: p.id,
        col: p.col,
        row: p.row,
        direction: directionForFacing(p.facing, ctx.tileWidth, ctx.tileHeight),
        action: p.moving ? ('Run' as const) : ('Idle' as const),
        frame: p.frame,
        sneaking: p.moving && p.sneaking,
        model: p.model,
        // My side: me and my teammates (the curse is everyone for themselves: only me)
        friendly: p === me || (teammate && !ctx.curse),
        isMe: p === me,
        teleport: ctx.teleportOf(p.id),
        jailed,
        cursed: ctx.curse && !over && !jailed && seat?.role === 'seeker',
        stone: ctx.curse && jailed,
        hidden: p === me && (p.hidden !== -1 || unseen),
        dazed: !over && (seat?.dazed ?? 0) > 0,
        // Inside a barrel nobody sees you; teammates and the jailed are always shown
        visible: p === me || over || jailed || (p.hidden === -1 && (teammate || sensing || (!unseen && spotted(p, spottedWithin(settings, traitOf(p.model)))))),
      }
      }),
      // Decoys: a still copy of the hero; their own team sees it faint
      ...match.marks
        .filter(m => m.kind === 'decoy' && !over)
        .map(m => {
          const own = m.team === mySeat?.team
          return {
            id: `decoy-${m.by}`,
            col: m.col,
            row: m.row,
            direction: directionForFacing(m.facing, ctx.tileWidth, ctx.tileHeight),
            action: 'Idle' as const,
            frame: 0,
            sneaking: false,
            model: m.model,
            friendly: own,
            isMe: false,
            jailed: false,
            cursed: false,
            stone: false,
            hidden: own,
            dazed: false,
            visible: own || spotted(m),
          }
        }),
    ],
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
    // The altars this player has found (and the lit ones, and for hiders those their team is lighting)
    altars: match.altars
      .filter(a => a.lit || isExplored(ctx, a) || (me?.role === 'hider' && a.progress > 0))
      .map(a => ({ col: a.col, row: a.row, lit: a.lit })),
    traps: me?.role === 'seeker' ? match.traps : [],
    exits: match.exitsOpen ? match.exits : [],
    seekerBase: ctx.maze?.seekerBase ?? null,
    hiderBase: ctx.maze?.hiderBase ?? null,
    mates: me ? ctx.bodies.filter(p => p !== me && p.role === me.role).map(p => ({ col: p.col, row: p.row, jailed: !!seatOf(match, p.id)?.jailed })) : [],
  }
}
