import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  normalizeHideSeekSettings,
  createMatch,
  startRound,
  tickMatch,
  searchSpot,
  placeTrap,
  spawnForSeat,
  roleForSlot,
  seatOf,
  ROUND_BREAK_SEC,
  MatchBody,
  HideSeekMatch,
} from '@/domain/hideseek'
import { GridCoord } from '@/types/map'

const settings = normalizeHideSeekSettings({ hideTime: 5, roundTime: 60, chestCount: 3, chestsToWin: 2, lootTime: 2, hideSpotCount: 0 })
const grid = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: [] })
const spawns: GridCoord[] = [{ col: 15, row: 15 }, { col: 16, row: 16 }, { col: 14, row: 16 }]
const random = () => 0.42

function body(id: string, at: GridCoord, extra: Partial<MatchBody> = {}): MatchBody {
  return { id, col: at.col, row: at.row, moving: false, hidden: -1, ...extra }
}

/** A match already in its seeking phase. */
function seekingMatch(order: string[]): HideSeekMatch {
  const match = createMatch(order)
  startRound(match, 0, grid, spawns, settings, random)
  tickMatch(match, order.map(id => body(id, spawnForSeat(match, id, spawns))), grid, spawns, settings, settings.hideTime + 0.01, random)
  return match
}

describe('HideSeekMatch', () => {
  it('gives the first lobby slot the seeker role', () => {
    expect(roleForSlot(0)).toBe('seeker')
    expect(roleForSlot(1)).toBe('hider')
  })

  it('lets everyone seek once: the seeker rotates every round', () => {
    const match = createMatch(['a', 'b', 'c'])
    expect(match.rounds).toBe(3)
    for (let round = 0; round < 3; round++) {
      startRound(match, round, grid, spawns, settings, random)
      expect(match.seats.filter(s => s.role === 'seeker').map(s => s.id)).toEqual([['a', 'b', 'c'][round]])
      expect(match.chests).toHaveLength(3)
    }
  })

  it('spawns the seeker on the first spawn and spreads the hiders over the others', () => {
    const match = createMatch(['a', 'b', 'c'])
    startRound(match, 0, grid, spawns, settings, random)
    expect(spawnForSeat(match, 'a', spawns)).toEqual(spawns[0])
    expect(spawnForSeat(match, 'b', spawns)).toEqual(spawns[1])
    expect(spawnForSeat(match, 'c', spawns)).toEqual(spawns[2])
  })

  it('goes hiding -> seeking -> round over (seeker wins on time) -> next round -> ended', () => {
    const match = seekingMatch(['a', 'b'])
    expect(match.clock.phase).toBe('seeking')
    const bodies = [body('a', { col: 2, row: 2 }), body('b', { col: 28, row: 28 })]
    tickMatch(match, bodies, grid, spawns, settings, settings.roundTime + 0.01, random)
    expect(match.clock).toMatchObject({ phase: 'roundOver', winner: 'seeker', reason: 'time' })
    expect(seatOf(match, 'a')!.score).toBeGreaterThanOrEqual(settings.scoreWin)

    const events = tickMatch(match, bodies, grid, spawns, settings, ROUND_BREAK_SEC + 0.01, random)
    // The session builds the next round (a new labyrinth first) when the break is over
    expect(events).toEqual([{ kind: 'roundDue' }])
    startRound(match, match.round + 1, grid, spawns, settings, random)
    expect(match.round).toBe(1)
    expect(seatOf(match, 'b')!.role).toBe('seeker')

    tickMatch(match, bodies, grid, spawns, settings, settings.hideTime + 0.01, random)
    tickMatch(match, bodies, grid, spawns, settings, settings.roundTime + 0.01, random)
    expect(match.clock.phase).toBe('ended')
    expect(match.champion).not.toBeUndefined()
  })

  it('loots a chest after standing at it for the loot time, and scores it', () => {
    const match = seekingMatch(['a', 'b'])
    const chest = match.chests[0]
    const bodies = [body('a', { col: 1, row: 1 }), body('b', chest)]
    expect(tickMatch(match, bodies, grid, spawns, settings, 1, random)).toEqual([])
    const events = tickMatch(match, bodies, grid, spawns, settings, 1.01, random)
    expect(events).toContainEqual({ kind: 'loot', chest: 0, by: 'b' })
    expect(match.chests[0].looted).toBe(true)
    expect(seatOf(match, 'b')!.score).toBeGreaterThanOrEqual(settings.scoreChest)
  })

  it('jails a touched hider; a free teammate sets them free; jailing everyone wins the round', () => {
    const match = seekingMatch(['s', 'h1', 'h2'])
    const at = { col: 10, row: 10 }
    let events = tickMatch(match, [body('s', at), body('h1', { col: 10.5, row: 10 }), body('h2', { col: 25, row: 25 })], grid, spawns, settings, 0.1, random)
    expect(events).toContainEqual({ kind: 'caught', id: 'h1' })
    expect(seatOf(match, 'h1')!.jailed).toBe(true)
    expect(match.clock.phase).toBe('seeking')

    // h2 touches the jailed h1 while the seeker is away
    events = tickMatch(match, [body('s', { col: 2, row: 2 }), body('h1', { col: 10.5, row: 10 }), body('h2', { col: 11, row: 10 })], grid, spawns, settings, 0.1, random)
    expect(events).toContainEqual({ kind: 'freed', id: 'h1', by: 'h2' })
    expect(seatOf(match, 'h1')!.jailed).toBe(false)

    // Both caught at once: the seeker wins the round
    events = tickMatch(match, [body('s', at), body('h1', { col: 10.4, row: 10 }), body('h2', { col: 10, row: 10.4 })], grid, spawns, settings, 0.1, random)
    expect(match.clock).toMatchObject({ phase: 'roundOver', winner: 'seeker', reason: 'caught' })
  })

  it('cannot touch a hider inside a barrel: only opening the barrel catches them', () => {
    const match = seekingMatch(['s', 'h'])
    match.spots = [{ col: 10, row: 10, kind: 'barrel', facing: 'E' }]
    const bodies = [body('s', { col: 10.3, row: 10 }), body('h', { col: 10, row: 10 }, { hidden: 0 })]
    tickMatch(match, bodies, grid, spawns, settings, 0.1, random)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    const events = searchSpot(match, 0, bodies, settings)
    expect(events[0]).toEqual({ kind: 'caught', id: 'h' })
    expect(match.clock.reason).toBe('caught')
  })

  it('rings a bell trap when a hider walks by, and limits traps per round', () => {
    const match = seekingMatch(['s', 'h'])
    expect(placeTrap(match, { col: 20, row: 20 }, settings)).toBe(true)
    expect(placeTrap(match, { col: 21, row: 20 }, settings)).toBe(true)
    expect(placeTrap(match, { col: 22, row: 20 }, settings)).toBe(false)
    const events = tickMatch(match, [body('s', { col: 2, row: 2 }), body('h', { col: 20.3, row: 20 })], grid, spawns, settings, 0.1, random)
    expect(events).toContainEqual({ kind: 'bell', col: 20, row: 20 })
    expect(match.traps[0].ringing).toBeGreaterThan(0)
  })

  it('ends the round for the hiders when enough chests are looted', () => {
    const match = seekingMatch(['s', 'h'])
    match.chests[0].looted = true
    tickMatch(match, [body('s', { col: 1, row: 1 }), body('h', match.chests[1])], grid, spawns, settings, settings.lootTime + 0.01, random)
    expect(match.clock).toMatchObject({ phase: 'roundOver', winner: 'hider', reason: 'chests' })
  })

  it('with exit gates: enough treasure opens them, and the hiders win only by getting out', () => {
    const match = seekingMatch(['s', 'h'])
    match.exits = [{ col: 0, row: 10.5 }, { col: 29, row: 20.5 }]
    match.chests[0].looted = true
    const events = tickMatch(match, [body('s', { col: 1, row: 1 }), body('h', match.chests[1])], grid, spawns, settings, settings.lootTime + 0.01, random)
    expect(events.map(e => e.kind)).toContain('exitsOpen')
    expect(match.exitsOpen).toBe(true)
    expect(match.clock.phase).toBe('seeking')
    // Hiding in a barrel next to the gate is not getting out
    tickMatch(match, [body('s', { col: 1, row: 1 }), body('h', { col: 28.8, row: 20.5 }, { hidden: 0 })], grid, spawns, settings, 0.1, random)
    expect(match.clock.phase).toBe('seeking')
    tickMatch(match, [body('s', { col: 1, row: 1 }), body('h', { col: 28.8, row: 20.5 })], grid, spawns, settings, 0.1, random)
    expect(match.clock).toMatchObject({ phase: 'roundOver', winner: 'hider', reason: 'escaped' })
  })
})
