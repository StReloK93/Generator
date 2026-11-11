import { HideSeekSettings } from '../../types/map'
import { tickAbilities, touchable } from './HideSeekAbilities'
import { CollisionGrid, isCaught } from './HideSeekRules'
import { catchReach } from './HideSeekTraits'
import { HideSeekMatch, HideSeekSeat, MatchBody, MatchEvent, ROUND_BREAK_SEC, seatOf, tickMarks } from './HideSeekMatch'

/**
 * The curse ("La'nat") genre, refereed on the hide & seek engine (same labyrinth, movement, sight, heroes and network).
 * Everyone plays for themselves. One player carries the curse (the seeker role, team 0); everybody else runs
 * (hiders, team 1). Touching someone — or opening the barrel they hide in — passes the curse on: the new carrier
 * stands stunned for a moment and the old one is briefly protected, so it cannot bounce straight back.
 * The curse burns on a fuse (the round time). Whoever holds it when the fuse burns out turns to stone (out of the
 * round, in the crypt), everyone still standing scores, and a new random carrier gets a fresh fuse after a short
 * scatter (the hiding phase). The last one standing wins the round; the best total over all rounds wins the match.
 */

/** The new carrier stands stunned this long after the curse jumps onto them */
export const CURSE_STUN_SEC = 1.5
/** The one who just passed the curse cannot get it back for this long */
export const CURSE_IMMUNE_SEC = 2.5

/** Who carries the curse now (null between rounds). */
export function curseHolder(match: HideSeekMatch): HideSeekSeat | undefined {
  return match.seats.find(s => s.role === 'seeker' && !s.jailed)
}

function setCursed(seat: HideSeekSeat, cursed: boolean): void {
  seat.role = cursed ? 'seeker' : 'hider'
  seat.team = cursed ? 0 : 1
}

function pickHolder(match: HideSeekMatch, candidates: HideSeekSeat[], random: () => number): HideSeekSeat | undefined {
  for (const seat of match.seats) setCursed(seat, false)
  const holder = candidates[Math.floor(random() * candidates.length)]
  if (holder) setCursed(holder, true)
  return holder
}

/**
 * After `startRound`: no altars, gates or chains in this genre, everyone back in the game, and a random carrier.
 * The round opens with the scatter (hiding phase): the carrier waits blind while the others run off.
 */
export function startCurseRound(match: HideSeekMatch, random: () => number): void {
  match.altars = []
  match.altarsNeeded = 0
  match.exits = []
  match.exitsOpen = false
  match.chains = []
  pickHolder(match, match.seats, random)
}

/** The curse jumps from `from` to `to`. */
function passCurse(from: HideSeekSeat, to: HideSeekSeat, settings: HideSeekSettings, events: MatchEvent[]): void {
  setCursed(from, false)
  setCursed(to, true)
  from.effects.shield = Math.max(from.effects.shield, CURSE_IMMUNE_SEC)
  from.score += settings.scoreCatch
  from.catches++
  to.dazed = CURSE_STUN_SEC
  events.push({ kind: 'cursed', from: from.id, to: to.id })
}

/** The last one standing wins the round; after the last round the best total score wins the match. */
function endCurseRound(match: HideSeekMatch, survivor: HideSeekSeat | undefined, settings: HideSeekSettings): MatchEvent {
  if (survivor) {
    survivor.score += settings.scoreWin
    match.wins.hider++
  }
  const last = match.round + 1 >= match.rounds
  match.clock = { phase: last ? 'ended' : 'roundOver', timeLeft: last ? 0 : ROUND_BREAK_SEC, winner: 'hider', reason: 'survived' }
  if (!last) return { kind: 'roundOver' }
  match.matchWinner = null
  const ranked = [...match.seats].sort((a, b) => b.score - a.score)
  match.champion = ranked.length > 1 && Math.floor(ranked[0].score) === Math.floor(ranked[1].score) ? null : (ranked[0]?.id ?? null)
  return { kind: 'ended' }
}

/** One referee frame of the curse genre. `bodies` are the players still in the match. */
export function tickCurse(
  match: HideSeekMatch,
  bodies: MatchBody[],
  grid: CollisionGrid,
  settings: HideSeekSettings,
  deltaSec: number,
  random: () => number = Math.random
): MatchEvent[] {
  const clock = match.clock
  if (clock.phase === 'ended') return []
  clock.timeLeft -= deltaSec
  if (clock.phase === 'roundOver') return clock.timeLeft > 0 ? [] : [{ kind: 'roundDue' }]

  const events: MatchEvent[] = []
  const byId = new Map(bodies.map(b => [b.id, b]))
  const standing = match.seats.filter(s => byId.has(s.id) && !s.jailed)
  if (standing.length <= 1) return [endCurseRound(match, standing[0], settings)]

  // The carrier left the game: the curse jumps to someone else still standing
  let holder = curseHolder(match)
  if (!holder || !byId.has(holder.id)) {
    holder = pickHolder(match, standing, random)
    if (holder) holder.dazed = CURSE_STUN_SEC
  }

  for (const seat of match.seats) {
    seat.dazed = Math.max(0, seat.dazed - deltaSec)
    tickAbilities(seat.cooldowns, seat.effects, deltaSec)
  }

  if (clock.phase === 'hiding') {
    if (clock.timeLeft <= 0) match.clock = { phase: 'seeking', timeLeft: settings.roundTime, winner: null, reason: null }
    tickMarks(match, bodies, settings, deltaSec, events)
    return events
  }

  const runners = standing.filter(s => s !== holder)
  for (const seat of runners) seat.score += settings.scorePerSecond * deltaSec

  // The fuse burnt out: the carrier turns to stone, the others score, and the curse finds a new carrier
  if (clock.timeLeft <= 0) {
    if (holder) {
      setCursed(holder, false)
      holder.jailed = true
      events.push({ kind: 'caught', id: holder.id })
    }
    for (const seat of runners) seat.score += settings.scoreRescue
    if (runners.length <= 1) return [...events, endCurseRound(match, runners[0], settings)]
    pickHolder(match, runners, random)
    match.clock = { phase: 'hiding', timeLeft: settings.hideTime, winner: null, reason: null }
    return events
  }

  // A touch passes the curse (not to someone still protected, out of reach underground / vanished, or inside a barrel)
  if (holder && holder.dazed <= 0 && holder.effects.burrow <= 0) {
    const holderBody = byId.get(holder.id)!
    const reach = { ...settings, catchDistance: catchReach(settings, holderBody.trait) }
    const victim = runners.find(seat => {
      const body = byId.get(seat.id)!
      return body.hidden === -1 && seat.effects.shield <= 0 && touchable(seat.effects) && isCaught(grid, holderBody, body, reach)
    })
    if (victim) passCurse(holder, victim, settings, events)
  }

  tickMarks(match, bodies, settings, deltaSec, events)
  return events
}

/** The carrier opens a barrel: whoever hides inside gets the curse. */
export function searchSpotCurse(match: HideSeekMatch, spotIndex: number, bodies: MatchBody[], settings: HideSeekSettings, by: string): MatchEvent[] {
  const holder = seatOf(match, by)
  if (match.clock.phase !== 'seeking' || holder?.role !== 'seeker' || holder.jailed || holder.dazed > 0) return []
  const events: MatchEvent[] = []
  const inside = bodies.find(b => b.hidden === spotIndex && seatOf(match, b.id)?.role === 'hider' && !seatOf(match, b.id)?.jailed)
  const victim = inside ? seatOf(match, inside.id) : undefined
  if (victim && victim.effects.shield <= 0) passCurse(holder, victim, settings, events)
  return events
}
