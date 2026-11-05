import { GridCoord, HideSeekSettings } from '../../types/map'
import { CollisionGrid, isBlockedAt } from './HideSeekRules'

/**
 * Hero abilities: besides their passive trait every hero has two active abilities (Q / F) with a cooldown, the same
 * in both roles. All numbers come from the map's hide & seek settings.
 *
 * - dash: a quick leap forward (stops at walls)          - wind: for a while no footprints and silent steps
 * - secondWind: breath full again at once                - shield: for a while nobody can catch / chain them
 * - vanish: for a while the other side cannot see them   - blink: a step through the shadows, even through a wall
 * - watch: for a moment sees every opponent nearby, through walls
 * - track: for a while sees every footprint, even in the dark
 * - hook: a seeker pulls the nearest hider in sight to them; a hider throws it ahead and swings there (a long leap)
 * - roar: opponents nearby are slowed for a while        - burrow: underground for a while (unseen, uncatchable, still)
 * - smoke: a cloud where nobody inside is seen           - scout: a bird shows opponents around a spot ahead to the team
 * - fireWall: a line of fire that slows opponents crossing it
 * - decoy: a copy of the hero stands where they were (the other side sees it, it vanishes when touched)
 * - snare: a hidden trap at their feet: the first opponent stepping on it is rooted for a moment
 */
export type AbilityId =
  | 'dash' | 'wind' | 'secondWind' | 'shield' | 'vanish' | 'blink' | 'watch' | 'track'
  | 'hook' | 'roar' | 'burrow' | 'smoke' | 'scout' | 'fireWall' | 'decoy' | 'snare'

/** Timed effects on a player: their own (wind .. burrow) and the ones others put on them (slowed, rooted) */
export type EffectKind = 'wind' | 'shield' | 'vanish' | 'watch' | 'track' | 'burrow' | 'slowed' | 'rooted'
export type AbilityEffects = Record<EffectKind, number>

/** Something an ability leaves on the map for a while */
export type MarkKind = 'smoke' | 'scout' | 'fireWall' | 'decoy' | 'snare'
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

const HERO_ABILITIES: Record<string, AbilityId[]> = {
  female: ['dash', 'wind'],
  warrior: ['secondWind', 'shield'],
  orc: ['hook', 'roar'],
  demon: ['vanish', 'blink'],
  male: ['watch', 'track'],
  zombi: ['burrow', 'smoke'],
  bird: ['scout', 'fireWall'],
  barry: ['decoy', 'snare'],
}

const MARK_ABILITIES: Record<MarkKind, true> = { smoke: true, scout: true, fireWall: true, decoy: true, snare: true }

/** A hero's abilities in button order (none for an unknown hero). */
export function abilitiesOf(model: string | null | undefined): AbilityId[] {
  return (model && HERO_ABILITIES[model]) || []
}

export function noEffects(): AbilityEffects {
  return { wind: 0, shield: 0, vanish: 0, watch: 0, track: 0, burrow: 0, slowed: 0, rooted: 0 }
}

export function abilityCooldown(ability: AbilityId, settings: HideSeekSettings): number {
  return settings[`${ability}Cooldown`]
}

export function isMarkAbility(ability: AbilityId): ability is MarkKind {
  return ability in MARK_ABILITIES
}

/** How long a mark stays (a snare waits for its prey much longer than it holds them) */
export function markLife(kind: MarkKind, settings: HideSeekSettings): number {
  return kind === 'snare' ? settings.snareLife : settings[`${kind}Time`]
}

/** The user's own timed effect (null = the ability acts at once or leaves a mark) */
function ownEffect(ability: AbilityId, settings: HideSeekSettings): { effect: EffectKind; seconds: number } | null {
  switch (ability) {
    case 'wind':
    case 'shield':
    case 'vanish':
    case 'watch':
    case 'track':
    case 'burrow':
      return { effect: ability, seconds: settings[`${ability}Time`] }
    default:
      return null
  }
}

/** The user's own timed effect still running */
export function abilityActive(effects: AbilityEffects, ability: AbilityId): boolean {
  return ability in effects && effects[ability as EffectKind] > 0
}

/** The ability's cooldown starts, and the user's own timed effect if it has one. */
export function startAbility(cooldowns: number[], effects: AbilityEffects, slot: number, ability: AbilityId, settings: HideSeekSettings): void {
  cooldowns[slot] = abilityCooldown(ability, settings)
  const own = ownEffect(ability, settings)
  if (own) effects[own.effect] = own.seconds
}

export function tickAbilities(cooldowns: number[], effects: AbilityEffects, deltaSec: number): void {
  for (let i = 0; i < cooldowns.length; i++) cooldowns[i] = Math.max(0, cooldowns[i] - deltaSec)
  for (const key of Object.keys(effects) as EffectKind[]) effects[key] = Math.max(0, effects[key] - deltaSec)
}

/** Share of the normal speed: rooted / underground stand still, slowed walk slower. */
export function motionFactor(effects: AbilityEffects, settings: HideSeekSettings): number {
  if (effects.rooted > 0 || effects.burrow > 0) return 0
  return effects.slowed > 0 ? settings.slowFactor : 1
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

/** Blink: the furthest free floor along the facing within blinkDistance, walls in between do not matter. */
export function blinkTarget(grid: CollisionGrid, from: GridCoord, facing: number, settings: HideSeekSettings): GridCoord {
  const dx = Math.cos(facing)
  const dy = Math.sin(facing)
  const cols = grid.subCols / 2
  const rows = grid.subRows / 2
  const free = (c: number, r: number) =>
    c > 0 && r > 0 && c < cols - 1 && r < rows - 1 &&
    [[0, 0], [WALL_MARGIN, 0], [-WALL_MARGIN, 0], [0, WALL_MARGIN], [0, -WALL_MARGIN]].every(([ox, oy]) => !isBlockedAt(grid, c + ox, r + oy))
  for (let d = settings.blinkDistance; d > STEP; d -= STEP) {
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

/** Standing in someone's smoke: nobody sees you there. */
export function inSmoke(marks: AbilityMark[], p: GridCoord, settings: HideSeekSettings): boolean {
  return marks.some(m => m.kind === 'smoke' && Math.hypot(m.col - p.col, m.row - p.row) <= settings.smokeRadius)
}

/** Near a scout bird of `team`: that team sees you. */
export function scoutedBy(marks: AbilityMark[], team: 0 | 1, p: GridCoord, settings: HideSeekSettings): boolean {
  return marks.some(m => m.kind === 'scout' && m.team === team && Math.hypot(m.col - p.col, m.row - p.row) <= settings.scoutRadius)
}
