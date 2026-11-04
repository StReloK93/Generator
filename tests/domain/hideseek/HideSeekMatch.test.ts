import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  normalizeHideSeekSettings,
  createMatch,
  startRound,
  tickMatch,
  searchSpot,
  placeTrap,
  placeCandle,
  torchSpots,
  spawnForSeat,
  roleForSlot,
  teamForSlot,
  splitSpawns,
  seatOf,
  lootProgress,
  jailSpot,
  ROUND_BREAK_SEC,
  MatchArena,
  MatchBody,
  HideSeekMatch,
  HideSeekTeam,
  SpawnSets,
} from '@/domain/hideseek'
import { GridCoord } from '@/types/map'

// 3 chests per hider, each hider needs 2 of them
const settings = normalizeHideSeekSettings({ hideTime: 5, roundTime: 60, chestCount: 3, chestsToWin: 2, lootTime: 2, hideSpotCount: 0 })
const grid = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: [] })
const spawns: SpawnSets = { seekers: [{ col: 15, row: 15 }, { col: 15, row: 13 }], hiders: [{ col: 16, row: 16 }, { col: 14, row: 16 }] }
const random = () => 0.42
/** The seekers' jail at (3, 3), the hiders' home in the corner 24..29 */
const arena: MatchArena = { jail: { col: 3, row: 3 }, home: { col: 24, row: 24, cols: 6, rows: 6 } }
const HOME = { col: 26, row: 26 }

function body(id: string, at: GridCoord, extra: Partial<MatchBody> = {}): MatchBody {
  return { id, col: at.col, row: at.row, moving: false, hidden: -1, ...extra }
}

/** Seekers (team 0) and hiders (team 1) */
function teams(seekers: string[], hiders: string[]): { id: string; team: HideSeekTeam }[] {
  return [...seekers.map(id => ({ id, team: 0 as const })), ...hiders.map(id => ({ id, team: 1 as const }))]
}

/** A match already in its seeking phase: `s*` seek, `h*` hide. */
function seekingMatch(ids: string[], rounds = 1): HideSeekMatch {
  const match = createMatch(teams(ids.filter(id => id.startsWith('s')), ids.filter(id => id.startsWith('h'))), rounds)
  startRound(match, 0, grid, spawns, settings, random)
  tickMatch(match, ids.map(id => body(id, spawnForSeat(match, id, spawns))), grid, settings, settings.hideTime + 0.01, arena)
  return match
}

const tick = (match: HideSeekMatch, bodies: MatchBody[], dt = 0.1, where: MatchArena = arena) => tickMatch(match, bodies, grid, settings, dt, where)

/** A hider takes the treasure out of chest `chest` (standing there for the loot time). */
function loot(match: HideSeekMatch, hider: string, chest: number, others: MatchBody[], where: MatchArena = arena) {
  return tick(match, [...others, body(hider, match.chests[chest])], settings.lootTime + 0.01, where)
}

describe('HideSeekMatch', () => {
  it('seats the first lobby slots as seekers and the rest as hiders', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(slot => teamForSlot(slot, 2))).toEqual([0, 0, 1, 1, 1, 1, 1, 1])
    expect(roleForSlot(1, 2)).toBe('seeker')
    expect(roleForSlot(2, 2)).toBe('hider')
  })

  it('keeps the roles for the whole match: the same side seeks every round', () => {
    const match = createMatch(teams(['a', 'b'], ['c', 'd']), 3)
    expect(match.rounds).toBe(3)
    for (let round = 0; round < 3; round++) {
      startRound(match, round, grid, spawns, settings, random)
      expect(match.seats.filter(s => s.role === 'seeker').map(s => s.id)).toEqual(['a', 'b'])
    }
  })

  it('puts out chests for every hider: their share each', () => {
    const match = createMatch(teams(['a'], ['b', 'c']))
    startRound(match, 0, grid, spawns, settings, random)
    expect(match.chests).toHaveLength(settings.chestCount * 2)
  })

  it('starts each side on its own start points', () => {
    const match = createMatch(teams(['s1', 's2'], ['h1', 'h2']))
    startRound(match, 0, grid, spawns, settings, random)
    expect(spawnForSeat(match, 's1', spawns)).toEqual(spawns.seekers[0])
    expect(spawnForSeat(match, 's2', spawns)).toEqual(spawns.seekers[1])
    expect(spawnForSeat(match, 'h1', spawns)).toEqual(spawns.hiders[0])
    expect(spawnForSeat(match, 'h2', spawns)).toEqual(spawns.hiders[1])
    // A map's own layout: the first start point is the seekers'
    expect(splitSpawns([{ col: 1, row: 1 }, { col: 2, row: 2 }])).toEqual({ seekers: [{ col: 1, row: 1 }], hiders: [{ col: 2, row: 2 }] })
  })

  it('counts round wins and ends the match once a side won most rounds', () => {
    const match = seekingMatch(['s', 'h'], 3)
    const bodies = [body('s', { col: 2, row: 2 }), body('h', { col: 20, row: 2 })]
    tick(match, bodies, settings.roundTime + 0.01)
    expect(match.clock).toMatchObject({ phase: 'roundOver', winner: 'seeker', reason: 'time' })
    expect(match.wins).toEqual({ seeker: 1, hider: 0 })
    expect(seatOf(match, 's')!.score).toBeGreaterThanOrEqual(settings.scoreWin)
    expect(tick(match, bodies, ROUND_BREAK_SEC + 0.01)).toEqual([{ kind: 'roundDue' }])

    startRound(match, 1, grid, spawns, settings, random)
    tick(match, bodies, settings.hideTime + 0.01)
    tick(match, bodies, settings.roundTime + 0.01)
    // 2 of 3: the seekers already won the match
    expect(match.clock.phase).toBe('ended')
    expect(match.matchWinner).toBe('seeker')
  })

  it('makes a hider carry the treasure home: it counts only when they get there', () => {
    const match = seekingMatch(['s', 'h'])
    const away = [body('s', { col: 1, row: 20 })]
    const events = loot(match, 'h', 0, away)
    expect(events).toContainEqual({ kind: 'loot', chest: 0, by: 'h' })
    expect(match.chests[0].looted).toBe(true)
    expect(seatOf(match, 'h')!).toMatchObject({ carrying: true, delivered: 0 })
    // Carrying, a hider does not open another chest
    loot(match, 'h', 1, away)
    expect(match.chests[1].looted).toBe(false)

    expect(tick(match, [...away, body('h', HOME)])).toContainEqual({ kind: 'delivered', by: 'h' })
    expect(seatOf(match, 'h')!).toMatchObject({ carrying: false, delivered: 1 })
    expect(seatOf(match, 'h')!.score).toBeGreaterThanOrEqual(settings.scoreChest)
  })

  it('without a home (a map without bases) a looted chest counts right away', () => {
    const match = seekingMatch(['s', 'h'])
    loot(match, 'h', 0, [body('s', { col: 1, row: 20 })], { jail: null, home: null })
    expect(seatOf(match, 'h')!).toMatchObject({ carrying: false, delivered: 1 })
  })

  it('needs every hider to bring their own share home: one with all of it does not win, nor takes more', () => {
    const match = seekingMatch(['s', 'h1', 'h2'])
    const away = (other: string) => [body('s', { col: 1, row: 20 }), body(other, { col: 20, row: 2 })]
    for (const chest of [0, 1]) {
      loot(match, 'h1', chest, away('h2'))
      tick(match, [...away('h2'), body('h1', HOME)])
    }
    expect(seatOf(match, 'h1')!.delivered).toBe(2)
    expect(match.clock.phase).toBe('seeking')
    expect(lootProgress(match, settings)).toEqual({ done: 1, total: 2 })
    // h1 has their share: the next chest stays for the others
    loot(match, 'h1', 2, away('h2'))
    expect(match.chests[2].looted).toBe(false)

    for (const chest of [3, 4]) {
      loot(match, 'h2', chest, away('h1'))
      tick(match, [...away('h1'), body('h2', HOME)])
    }
    expect(match.clock).toMatchObject({ winner: 'hider', reason: 'chests' })
  })

  it('drops the treasure of a caught hider on the floor; a teammate can pick it up', () => {
    const match = seekingMatch(['s', 'h1', 'h2'])
    loot(match, 'h1', 0, [body('s', { col: 1, row: 20 }), body('h2', { col: 20, row: 2 })])
    const at = { col: 10, row: 10 }
    const events = tick(match, [body('s', { col: 10.5, row: 10 }), body('h1', at), body('h2', { col: 20, row: 2 })])
    expect(events).toContainEqual({ kind: 'drop', col: 10, row: 10 })
    expect(events).toContainEqual({ kind: 'caught', id: 'h1' })
    expect(match.drops).toEqual([at])
    expect(seatOf(match, 'h1')!.carrying).toBe(false)

    expect(tick(match, [body('s', { col: 1, row: 20 }), body('h1', arena.jail!), body('h2', at)])).toContainEqual({ kind: 'pickup', by: 'h2' })
    expect(match.drops).toEqual([])
    expect(seatOf(match, 'h2')!.carrying).toBe(true)
  })

  it('sends the caught to jail; a free teammate reaching the jail frees everybody there', () => {
    const match = seekingMatch(['s', 'h1', 'h2', 'h3'])
    const far = { col: 20, row: 2 }
    tick(match, [body('s', { col: 10, row: 10 }), body('h1', { col: 10.5, row: 10 }), body('h2', { col: 9.6, row: 10 }), body('h3', far)])
    expect(['h1', 'h2'].map(id => seatOf(match, id)!.jailed)).toEqual([true, true])
    expect(match.clock.phase).toBe('seeking')

    // Touching where they were caught does nothing: they are in the jail
    tick(match, [body('s', { col: 1, row: 20 }), body('h1', jailSpot(arena.jail!, 0)), body('h2', jailSpot(arena.jail!, 1)), body('h3', { col: 10, row: 10 })])
    expect(seatOf(match, 'h1')!.jailed).toBe(true)

    const events = tick(match, [body('s', { col: 1, row: 20 }), body('h1', jailSpot(arena.jail!, 0)), body('h2', jailSpot(arena.jail!, 1)), body('h3', { col: 3.5, row: 3.5 })])
    expect(events).toContainEqual({ kind: 'freed', id: 'h1', by: 'h3' })
    expect(events).toContainEqual({ kind: 'freed', id: 'h2', by: 'h3' })
    expect(match.seats.filter(s => s.role === 'hider').every(s => !s.jailed)).toBe(true)
  })

  it('jailing every hider wins the round for the seekers', () => {
    const match = seekingMatch(['s', 'h1', 'h2'])
    tick(match, [body('s', { col: 10, row: 10 }), body('h1', { col: 10.4, row: 10 }), body('h2', { col: 10, row: 10.4 })])
    expect(match.clock).toMatchObject({ winner: 'seeker', reason: 'caught' })
  })

  it('never catches a hider at home', () => {
    const match = seekingMatch(['s', 'h'])
    tick(match, [body('s', { col: 26.4, row: 26 }), body('h', HOME)])
    expect(seatOf(match, 'h')!.jailed).toBe(false)
  })

  it('lets any seeker catch, and credits the one who did', () => {
    const match = seekingMatch(['s1', 's2', 'h1', 'h2'])
    tick(match, [body('s1', { col: 2, row: 20 }), body('s2', { col: 20, row: 20 }), body('h1', { col: 20.5, row: 20 }), body('h2', { col: 20, row: 2 })])
    expect(seatOf(match, 'h1')!.jailed).toBe(true)
    expect(seatOf(match, 's2')!.catches).toBe(1)
    expect(seatOf(match, 's1')!.catches).toBe(0)
    startRound(match, 1, grid, spawns, settings, random)
    expect(match.seats.every(s => s.catches === 0 && s.delivered === 0 && !s.carrying && !s.jailed)).toBe(true)
  })

  it('lets a rescuer free the jail from further away', () => {
    const jailedMatch = () => {
      const match = seekingMatch(['s', 'h1', 'h2'])
      tick(match, [body('s', { col: 10, row: 10 }), body('h1', { col: 10.5, row: 10 }), body('h2', { col: 20, row: 2 })])
      return match
    }
    const nearJail = { col: arena.jail!.col + 2.5, row: arena.jail!.row }
    const plain = jailedMatch()
    tick(plain, [body('s', { col: 1, row: 20 }), body('h1', arena.jail!), body('h2', nearJail)])
    expect(seatOf(plain, 'h1')!.jailed).toBe(true)
    const rescued = jailedMatch()
    tick(rescued, [body('s', { col: 1, row: 20 }), body('h1', arena.jail!), body('h2', nearJail, { trait: 'rescuer' })])
    expect(seatOf(rescued, 'h1')!.jailed).toBe(false)
  })

  it('lets a rescuer seeker catch from a little further away', () => {
    const reach = settings.catchDistance * 1.15
    const plain = seekingMatch(['s', 'h'])
    tick(plain, [body('s', { col: 10, row: 10 }), body('h', { col: 10 + reach, row: 10 })])
    expect(seatOf(plain, 'h')!.jailed).toBe(false)
    const strong = seekingMatch(['s', 'h'])
    tick(strong, [body('s', { col: 10, row: 10 }, { trait: 'rescuer' }), body('h', { col: 10 + reach, row: 10 })])
    expect(seatOf(strong, 'h')!.jailed).toBe(true)
  })

  it('cannot touch a hider inside a barrel: only a seeker opening the barrel catches them', () => {
    const match = seekingMatch(['s', 'h'])
    match.spots = [{ col: 10, row: 10, kind: 'barrel', facing: 'E' }]
    const bodies = [body('s', { col: 10.3, row: 10 }), body('h', { col: 10, row: 10 }, { hidden: 0 })]
    tick(match, bodies)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    expect(searchSpot(match, 0, bodies, settings, 'h')).toEqual([])
    const events = searchSpot(match, 0, bodies, settings, 's')
    expect(events[0]).toEqual({ kind: 'caught', id: 'h' })
    expect(match.clock.reason).toBe('caught')
  })

  it('lets the seekers set burning candles down while seeking, a few per round and not on top of each other', () => {
    const match = createMatch(teams(['s'], ['h']))
    startRound(match, 0, grid, spawns, settings, random)
    expect(placeCandle(match, { col: 5, row: 5 }, 2, null)).toBe(false) // still hiding
    tick(match, [body('s', spawns.seekers[0]), body('h', spawns.hiders[0])], settings.hideTime + 0.01)
    expect(placeCandle(match, { col: 5, row: 5 }, 2, null)).toBe(true)
    expect(placeCandle(match, { col: 5.5, row: 5 }, 2, null)).toBe(false) // too close
    expect(placeCandle(match, { col: 9, row: 5 }, 2, null)).toBe(true)
    expect(placeCandle(match, { col: 13, row: 5 }, 2, null)).toBe(false) // limit
    expect(torchSpots(match, null)).toEqual([{ col: 5, row: 5 }, { col: 9, row: 5 }])
    expect(match.torches).toEqual([true, true])
    startRound(match, 1, grid, spawns, settings, random)
    expect(match.candles).toEqual([])
  })

  it('rings a bell trap when a hider walks by, and limits traps per round', () => {
    const match = seekingMatch(['s', 'h'])
    expect(placeTrap(match, { col: 20, row: 20 }, 2)).toBe(true)
    expect(placeTrap(match, { col: 21, row: 20 }, 2)).toBe(true)
    expect(placeTrap(match, { col: 22, row: 20 }, 2)).toBe(false)
    const events = tick(match, [body('s', { col: 2, row: 20 }), body('h', { col: 20.3, row: 20 })])
    expect(events).toContainEqual({ kind: 'bell', col: 20, row: 20 })
    expect(match.traps[0].ringing).toBeGreaterThan(0)
  })

  it('with exit gates: everyone having their share opens them, and the hiders win only by getting out', () => {
    const match = seekingMatch(['s', 'h'])
    match.exits = [{ col: 0, row: 10.5 }, { col: 29, row: 20.5 }]
    const away = [body('s', { col: 1, row: 20 })]
    loot(match, 'h', 0, away)
    tick(match, [...away, body('h', HOME)])
    loot(match, 'h', 1, away)
    const events = tick(match, [...away, body('h', HOME)])
    expect(events.map(e => e.kind)).toContain('exitsOpen')
    expect(match.exitsOpen).toBe(true)
    expect(match.clock.phase).toBe('seeking')
    // Hiding in a barrel next to the gate is not getting out
    tick(match, [...away, body('h', { col: 28.8, row: 20.5 }, { hidden: 0 })])
    expect(match.clock.phase).toBe('seeking')
    tick(match, [...away, body('h', { col: 28.8, row: 20.5 })])
    expect(match.clock).toMatchObject({ winner: 'hider', reason: 'escaped' })
  })
})
