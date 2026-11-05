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
 */
export type AbilityId = 'dash' | 'wind' | 'secondWind' | 'shield' | 'vanish' | 'blink' | 'watch' | 'track'

/** Abilities that last a while (seconds left are kept per player) */
export type TimedAbility = 'wind' | 'shield' | 'vanish' | 'watch' | 'track'
export type AbilityEffects = Record<TimedAbility, number>

const HERO_ABILITIES: Record<string, AbilityId[]> = {
  female: ['dash', 'wind'],
  warrior: ['secondWind', 'shield'],
  demon: ['vanish', 'blink'],
  male: ['watch', 'track'],
}

/** A hero's abilities in button order (none for a hero without any yet). */
export function abilitiesOf(model: string | null | undefined): AbilityId[] {
  return (model && HERO_ABILITIES[model]) || []
}

export function noEffects(): AbilityEffects {
  return { wind: 0, shield: 0, vanish: 0, watch: 0, track: 0 }
}

export function abilityCooldown(ability: AbilityId, settings: HideSeekSettings): number {
  return settings[`${ability}Cooldown`]
}

/** Seconds a timed ability lasts (null = it acts at once) */
function timedEffect(ability: AbilityId, settings: HideSeekSettings): { effect: TimedAbility; seconds: number } | null {
  switch (ability) {
    case 'wind':
    case 'shield':
    case 'vanish':
    case 'watch':
    case 'track':
      return { effect: ability, seconds: settings[`${ability}Time`] }
    default:
      return null
  }
}

/** A timed ability still running */
export function abilityActive(effects: AbilityEffects, ability: AbilityId): boolean {
  return ability in effects && effects[ability as TimedAbility] > 0
}

/** The ability's lasting part starts (cooldown and timer); instant ones (dash, blink, second wind) only cool down. */
export function startAbility(cooldowns: number[], effects: AbilityEffects, slot: number, ability: AbilityId, settings: HideSeekSettings): void {
  cooldowns[slot] = abilityCooldown(ability, settings)
  const timed = timedEffect(ability, settings)
  if (timed) effects[timed.effect] = timed.seconds
}

export function tickAbilities(cooldowns: number[], effects: AbilityEffects, deltaSec: number): void {
  for (let i = 0; i < cooldowns.length; i++) cooldowns[i] = Math.max(0, cooldowns[i] - deltaSec)
  for (const key of Object.keys(effects) as TimedAbility[]) effects[key] = Math.max(0, effects[key] - deltaSec)
}

const STEP = 0.25
/** Keeps this far from a wall after a leap */
const WALL_MARGIN = 0.3

/** Dash: along the facing up to dashDistance, stopping short of the first wall. */
export function dashTarget(grid: CollisionGrid, from: GridCoord, facing: number, settings: HideSeekSettings): GridCoord {
  const dx = Math.cos(facing)
  const dy = Math.sin(facing)
  let landing = { col: from.col, row: from.row }
  for (let d = STEP; d <= settings.dashDistance; d += STEP) {
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
