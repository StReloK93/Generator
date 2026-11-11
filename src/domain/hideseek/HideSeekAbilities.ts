import { GridCoord, HideSeekSettings } from '../../types/map'
import { CollisionGrid, isBlockedAt } from './HideSeekRules'

/**
 * Hero abilities: besides their passive trait every hero has three active abilities (Q / F / G) with a cooldown, the
 * same in both roles; the third (G) belongs to that hero alone. They all act for the player themselves (nothing is
 * shared with the team: on a phone nobody follows what the others do). All numbers come from the map's hide & seek
 * settings. Nobody can lay a hand on what they cannot see: a vanished or burrowed player is not caught, pulled,
 * chained or swapped, and no trap or fire touches them.
 *
 * - dash: a quick leap forward (stops at walls)          - wind: for a while no footprints and silent steps
 * - secondWind: breath full again at once                - shield: for a while nobody can catch / chain them
 * - vanish: for a while the other side cannot see them
 * - blink: a step through the shadows to a chosen spot (or straight ahead), even through a wall
 * - watch: for a moment sees every opponent nearby, through walls
 * - track: for a while sees every footprint, even in the dark
 * - hook: a seeker pulls the nearest hider in sight to them; a hider throws it ahead and swings there (a long leap)
 * - roar: opponents nearby are slowed for a while        - burrow: underground for a while (unseen, uncatchable, still)
 * - sense: for a moment sees every opponent on the map, and they all see them too (and know it)
 * - scout: a bird shows them the opponents around a spot ahead
 * - fireWall: a line of fire across their way: opponents cannot get through it, and it slows whoever touches it
 * - decoy: a copy of the hero stands where they were (the other side sees it, it vanishes when touched)
 * - snare: a hidden trap at their feet: the first opponent stepping on it is rooted for a moment
 * - sprint: for a while runs much faster and sees all around, behind too
 * - bash: opponents right beside them are rooted for a moment
 * - berserk: for a while runs faster, and nothing slows or holds them
 * - rewind: back to where they stood a few seconds ago
 * - stalk: for a while runs faster, and the way they ran keeps watch for them: an opponent near it shows to them
 * - tunnel: for a while walks under any wall
 * - nest: a nest where they stand; pressed again while it lasts, they fly back to it
 * - swap: trades places with the nearest opponent in sight
 */
export type AbilityId =
  | 'dash' | 'wind' | 'secondWind' | 'shield' | 'vanish' | 'blink' | 'watch' | 'track'
  | 'hook' | 'roar' | 'burrow' | 'sense' | 'scout' | 'fireWall' | 'decoy' | 'snare'
  | 'sprint' | 'bash' | 'berserk' | 'rewind' | 'stalk' | 'tunnel' | 'nest' | 'swap'

/** Timed effects on a player: their own (named after the ability) and the ones others put on them (slowed, rooted) */
export type EffectKind =
  | 'wind' | 'shield' | 'vanish' | 'watch' | 'track' | 'burrow' | 'sense'
  | 'sprint' | 'berserk' | 'stalk' | 'tunnel'
  | 'slowed' | 'rooted'
export type AbilityEffects = Record<EffectKind, number>

/** Something an ability leaves on the map for a while (a trail: the way a stalking runner went) */
export type MarkKind = 'scout' | 'fireWall' | 'decoy' | 'snare' | 'nest' | 'trail'
export interface AbilityMark extends GridCoord {
  kind: MarkKind
  /** Who left it and their team (0 = seekers) */
  by: string
  team: 0 | 1
  /** Their facing when they left it (a fire wall runs across it, a decoy looks that way) */
  facing: number
  timeLeft: number
  /** Decoy: the hero it copies */
  model: string
}

/** How many abilities every hero has (Q / F / G) */
export const ABILITY_SLOTS = 3

const HERO_ABILITIES: Record<string, AbilityId[]> = {
  female: ['dash', 'wind', 'sprint'],
  warrior: ['secondWind', 'shield', 'bash'],
  orc: ['hook', 'roar', 'berserk'],
  demon: ['vanish', 'blink', 'rewind'],
  male: ['watch', 'track', 'stalk'],
  zombi: ['burrow', 'sense', 'tunnel'],
  bird: ['scout', 'fireWall', 'nest'],
  barry: ['decoy', 'snare', 'swap'],
}

/** Abilities that leave a mark on the map */
type MarkAbility = Extract<AbilityId, MarkKind>
const MARK_ABILITIES = new Set<AbilityId>(['scout', 'fireWall', 'decoy', 'snare', 'nest'])

/** Abilities that start a timed effect on the user, named like the ability */
type TimedAbility = Extract<AbilityId, EffectKind>
const TIMED_ABILITIES = new Set<AbilityId>(['wind', 'shield', 'vanish', 'watch', 'track', 'burrow', 'sense', 'sprint', 'berserk', 'stalk', 'tunnel'])
const isTimed = (ability: AbilityId): ability is TimedAbility => TIMED_ABILITIES.has(ability)

/** A nest just set down can be flown back to right away (only a short guard against a double tap) */
const NEST_REARM_SEC = 0.5

/** A hero's abilities in button order (none for an unknown hero). */
export function abilitiesOf(model: string | null | undefined): AbilityId[] {
  return (model && HERO_ABILITIES[model]) || []
}

export function noEffects(): AbilityEffects {
  return { wind: 0, shield: 0, vanish: 0, watch: 0, track: 0, burrow: 0, sense: 0, sprint: 0, berserk: 0, stalk: 0, tunnel: 0, slowed: 0, rooted: 0 }
}

/** Can be touched by the other side: not vanished, not underground (nobody lays a hand on what they cannot see) */
export function touchable(effects: AbilityEffects): boolean {
  return effects.vanish <= 0 && effects.burrow <= 0
}

export function abilityCooldown(ability: AbilityId, settings: HideSeekSettings): number {
  return settings[`${ability}Cooldown`]
}

export function isMarkAbility(ability: AbilityId): ability is MarkAbility {
  return MARK_ABILITIES.has(ability)
}

/** How long a mark stays (a snare waits for its prey much longer than it holds them) */
export function markLife(kind: MarkKind, settings: HideSeekSettings): number {
  if (kind === 'snare') return settings.snareLife
  if (kind === 'trail') return settings.stalkTrailLife
  return settings[`${kind}Time`]
}

/** The user's own timed effect (null = the ability acts at once or leaves a mark) */
function ownEffect(ability: AbilityId, settings: HideSeekSettings): { effect: EffectKind; seconds: number } | null {
  return isTimed(ability) ? { effect: ability, seconds: settings[`${ability}Time`] } : null
}

/** What an ability started that still runs on the user: seconds left out of how long it lasts (null when it has no
 * own effect; what a mark ability left is timed by the mark) */
export function abilityTimeLeft(effects: AbilityEffects, ability: AbilityId, settings: HideSeekSettings): { left: number; total: number } | null {
  const own = ownEffect(ability, settings)
  return own ? { left: effects[own.effect], total: own.seconds } : null
}

/** The ability's cooldown starts, and the user's own timed effect if it has one. A nest only cools down once it is
 * flown back to or runs out (the referee sets that). */
export function startAbility(cooldowns: number[], effects: AbilityEffects, slot: number, ability: AbilityId, settings: HideSeekSettings): void {
  cooldowns[slot] = ability === 'nest' ? NEST_REARM_SEC : abilityCooldown(ability, settings)
  const own = ownEffect(ability, settings)
  if (own) effects[own.effect] = own.seconds
}

export function tickAbilities(cooldowns: number[], effects: AbilityEffects, deltaSec: number): void {
  for (let i = 0; i < cooldowns.length; i++) cooldowns[i] = Math.max(0, cooldowns[i] - deltaSec)
  for (const key of Object.keys(effects) as EffectKind[]) effects[key] = Math.max(0, effects[key] - deltaSec)
}

/**
 * Share of the normal speed: underground stand still, rooted stand still and slowed walk slower (unless berserk),
 * sprinting / stalking / berserk run faster.
 */
export function motionFactor(effects: AbilityEffects, settings: HideSeekSettings): number {
  if (effects.burrow > 0) return 0
  const fast = effects.sprint > 0 || effects.stalk > 0 || effects.berserk > 0 ? settings.hasteFactor : 1
  if (effects.berserk > 0) return fast
  if (effects.rooted > 0) return 0
  return (effects.slowed > 0 ? settings.slowFactor : 1) * fast
}

/** Sprinting: sees all around, behind too */
export function sprintSight(settings: HideSeekSettings): HideSeekSettings {
  return { ...settings, visionAngle: 360 }
}

/** An opponent of the walker shows near this trail point of theirs (the stalker's own eyes left on the way) */
export function trailSees(trail: AbilityMark, p: GridCoord, settings: HideSeekSettings): boolean {
  return Math.hypot(trail.col - p.col, trail.row - p.row) <= settings.stalkTrailRadius
}

/** A step from \`from\` to \`to\` would go through an opponent's fire wall (the walker is on \`team\`) */
export function fireWallCrossed(marks: AbilityMark[], team: 0 | 1, from: GridCoord, to: GridCoord, settings: HideSeekSettings): boolean {
  return marks.some(mark => {
    if (mark.kind !== 'fireWall' || mark.team === team) return false
    const [a, b] = fireWallEnds(mark, settings)
    return segmentsCross(from, to, a, b)
  })
}

function segmentsCross(p: GridCoord, q: GridCoord, a: GridCoord, b: GridCoord): boolean {
  const side = (o: GridCoord, x: GridCoord, y: GridCoord) => (x.col - o.col) * (y.row - o.row) - (x.row - o.row) * (y.col - o.col)
  const d1 = side(a, b, p)
  const d2 = side(a, b, q)
  const d3 = side(p, q, a)
  const d4 = side(p, q, b)
  return d1 * d2 < 0 && d3 * d4 < 0
}

const STEP = 0.25
/** Keeps this far from a wall after a leap */
const WALL_MARGIN = 0.3

/** Dash: along the facing up to `distance`, stopping short of the first wall. */
export function dashTarget(grid: CollisionGrid, from: GridCoord, facing: number, distance: number): GridCoord {
  const dx = Math.cos(facing)
  const dy = Math.sin(facing)
  let landing = { col: from.col, row: from.row }
  for (let d = STEP; d <= distance; d += STEP) {
    const p = { col: from.col + dx * (d + WALL_MARGIN), row: from.row + dy * (d + WALL_MARGIN) }
    if (isBlockedAt(grid, p.col, p.row)) break
    landing = { col: from.col + dx * d, row: from.row + dy * d }
  }
  return landing
}

/** Blink: the furthest free floor along the facing within `distance` (at most blinkDistance), walls in between do not
 * matter. */
export function blinkTarget(grid: CollisionGrid, from: GridCoord, facing: number, distance: number): GridCoord {
  const dx = Math.cos(facing)
  const dy = Math.sin(facing)
  const cols = grid.subCols / 2
  const rows = grid.subRows / 2
  const free = (c: number, r: number) =>
    c > 0 && r > 0 && c < cols - 1 && r < rows - 1 &&
    [[0, 0], [WALL_MARGIN, 0], [-WALL_MARGIN, 0], [0, WALL_MARGIN], [0, -WALL_MARGIN]].every(([ox, oy]) => !isBlockedAt(grid, c + ox, r + oy))
  for (let d = distance; d > STEP; d -= STEP) {
    const p = { col: from.col + dx * d, row: from.row + dy * d }
    if (free(p.col, p.row)) return p
  }
  return { col: from.col, row: from.row }
}

/** Where a scout bird flies: scoutDistance ahead (over the walls), kept inside the map. */
export function scoutSpot(grid: CollisionGrid, from: GridCoord, facing: number, settings: HideSeekSettings): GridCoord {
  const clamp = (v: number, max: number) => Math.max(1, Math.min(max - 1, v))
  return {
    col: clamp(from.col + Math.cos(facing) * settings.scoutDistance, grid.subCols / 2),
    row: clamp(from.row + Math.sin(facing) * settings.scoutDistance, grid.subRows / 2),
  }
}

/** The two ends of a fire wall: fireWallLength long, across the facing of whoever lit it. */
export function fireWallEnds(mark: AbilityMark, settings: HideSeekSettings): [GridCoord, GridCoord] {
  const half = settings.fireWallLength / 2
  const ax = -Math.sin(mark.facing)
  const ay = Math.cos(mark.facing)
  return [
    { col: mark.col + ax * half, row: mark.row + ay * half },
    { col: mark.col - ax * half, row: mark.row - ay * half },
  ]
}

/** Distance from `p` to the segment a..b */
export function distanceToSegment(p: GridCoord, a: GridCoord, b: GridCoord): number {
  const dx = b.col - a.col
  const dy = b.row - a.row
  const length = dx * dx + dy * dy
  const t = length > 0 ? Math.max(0, Math.min(1, ((p.col - a.col) * dx + (p.row - a.row) * dy) / length)) : 0
  return Math.hypot(p.col - (a.col + dx * t), p.row - (a.row + dy * t))
}

/** Near a scout bird of player `by`: they see you. */
export function scoutedBy(marks: AbilityMark[], by: string, p: GridCoord, settings: HideSeekSettings): boolean {
  return marks.some(m => m.kind === 'scout' && m.by === by && Math.hypot(m.col - p.col, m.row - p.row) <= settings.scoutRadius)
}
