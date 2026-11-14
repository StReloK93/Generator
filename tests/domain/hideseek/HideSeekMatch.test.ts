import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  normalizeHideSeekSettings,
  createMatch,
  startRound,
  tickMatch,
  startChain,
  searchSpot,
  placeTrap,
  placeCandle,
  torchSpots,
  spawnForSeat,
  roleForSlot,
  teamForSlot,
  splitSpawns,
  seatOf,
  isFrozen,
  altarProgress,
  jailSpot,
  ROUND_BREAK_SEC,
  MatchArena,
  MatchBody,
  HideSeekMatch,
  HideSeekTeam,
  SpawnSets,
} from '@/domain/hideseek'
import { GridCoord } from '@/types/map'

const settings = normalizeHideSeekSettings({
  hideTime: 5,
  roundTime: 60,
  hideSpotCount: 0,
  // Small numbers keep the tests short: one hider lights 2, one spare per seeker
  altarsToWin: 2,
  altarsPerHider: 1,
  altarExtra: 1,
  altarLightTime: 4,
  altarKickTime: 2,
  chainRange: 5,
  chainTime: 6,
  chainCooldown: 10,
  chainDaze: 2,
})
const grid = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: [] })
const spawns: SpawnSets = { seekers: [{ col: 15, row: 15 }, { col: 15, row: 13 }], hiders: [{ col: 16, row: 16 }, { col: 14, row: 16 }] }
const random = () => 0.42
/** The seekers' jail at (3, 3), the hiders' home in the corner 24..29 */
const arena: MatchArena = { jail: { col: 3, row: 3 }, home: { col: 24, row: 24, cols: 6, rows: 6 } }
const HOME = { col: 26, row: 26 }
/** Spots far from the jail, the home and each other (out of everyone's way) */
const AWAY = [{ col: 1, row: 28 }, { col: 6, row: 28 }, { col: 11, row: 28 }, { col: 16, row: 28 }]
/** Nobody is caught in the first seconds of seeking */
const GRACE = 3

function body(id: string, at: GridCoord, extra: Partial<MatchBody> = {}): MatchBody {
  return { id, col: at.col, row: at.row, moving: false, hidden: -1, ...extra }
}

/** Seekers (team 0) and hiders (team 1) */
function teams(seekers: string[], hiders: string[]): { id: string; team: HideSeekTeam }[] {
  return [...seekers.map(id => ({ id, team: 0 as const })), ...hiders.map(id => ({ id, team: 1 as const }))]
}

/** A match already seeking, past the start grace: `s*` seek, `h*` hide. */
function seekingMatch(ids: string[], rounds = 1): HideSeekMatch {
  const match = createMatch(teams(ids.filter(id => id.startsWith('s')), ids.filter(id => id.startsWith('h'))), rounds)
  startRound(match, 0, grid, spawns, settings, random)
  const bodies = ids.map((id, i) => body(id, AWAY[i % AWAY.length]))
  tickMatch(match, bodies, grid, settings, settings.hideTime + 0.01, arena)
  tickMatch(match, bodies, grid, settings, GRACE, arena)
  return match
}

const tick = (match: HideSeekMatch, bodies: MatchBody[], dt = 0.1) => tickMatch(match, bodies, grid, settings, dt, arena)

/** Moves the players far from the altars apart from the given ones (out of each other's reach). */
function away(ids: string[]): MatchBody[] {
  return ids.map((id, i) => body(id, AWAY[i % AWAY.length]))
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

  it('starts seeking right away without a hiding time (the sides start far apart)', () => {
    const match = createMatch(teams(['s'], ['h']))
    startRound(match, 0, grid, spawns, { ...settings, hideTime: 0 }, random)
    expect(match.clock).toMatchObject({ phase: 'seeking', timeLeft: settings.roundTime })
  })

  it('catches nobody in the first seconds of a round (positions are still arriving)', () => {
    const match = createMatch(teams(['s'], ['h']))
    startRound(match, 0, grid, spawns, { ...settings, hideTime: 0 }, random)
    tickMatch(match, [body('s', { col: 10, row: 10 }), body('h', { col: 10.3, row: 10 })], grid, { ...settings, hideTime: 0 }, 1, arena)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    tickMatch(match, [body('s', { col: 10, row: 10 }), body('h', { col: 10.3, row: 10 })], grid, { ...settings, hideTime: 0 }, GRACE, arena)
    expect(seatOf(match, 'h')!.jailed).toBe(true)
  })

  it('asks for a set number of altars, one more per extra hider, and puts out a spare for every seeker', () => {
    const duel = createMatch(teams(['s'], ['h']))
    startRound(duel, 0, grid, spawns, settings, random)
    expect(altarProgress(duel)).toEqual({ lit: 0, needed: 2, total: 3 })
    const team = createMatch(teams(['s1', 's2'], ['h1', 'h2']))
    startRound(team, 0, grid, spawns, settings, random)
    expect(altarProgress(team)).toEqual({ lit: 0, needed: 3, total: 5 })
  })

  it('one against one with the default rules: 5 altars to light, 6 on the map', () => {
    const duel = createMatch(teams(['s'], ['h']))
    startRound(duel, 0, grid, spawns, normalizeHideSeekSettings({}), random)
    expect(altarProgress(duel)).toEqual({ lit: 0, needed: 5, total: 6 })
  })

  it('keeps a spare per seeker when the maze has room for fewer altars: fewer are needed instead', () => {
    // A corridor two cells wide: room for only a few altars apart from the starts
    const blocked: GridCoord[] = []
    for (let col = 0; col < 30; col++) for (let row = 0; row < 30; row++) if (row < 13 || row > 17) blocked.push({ col, row })
    const tight = buildCollisionGrid({
      cols: 30,
      rows: 30,
      collisionSubcells: blocked.flatMap(c => [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dc, dr]) => `${c.col * 2 + dc},${c.row * 2 + dr}`)),
    })
    const match = createMatch(teams(['s1', 's2'], ['h']))
    startRound(match, 0, tight, spawns, normalizeHideSeekSettings({ altarsToWin: 30 }), random)
    const { needed, total } = altarProgress(match)
    expect(total - needed).toBeGreaterThanOrEqual(2)
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
    const bodies = away(['s', 'h'])
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

  it('lights an altar while a hider stands at it; two together are twice as fast, a firekeeper faster', () => {
    const solo = seekingMatch(['s', 'h1', 'h2'])
    const altar = solo.altars[0]
    tick(solo, [body('s', AWAY[0]), body('h1', altar), body('h2', AWAY[1])], settings.altarLightTime / 2)
    expect(altar.progress).toBeCloseTo(0.5)
    const events = tick(solo, [body('s', AWAY[0]), body('h1', altar), body('h2', AWAY[1])], settings.altarLightTime / 2 + 0.01)
    expect(events).toContainEqual({ kind: 'altarLit', altar: 0, by: 'h1' })
    expect(altar.lit).toBe(true)
    expect(seatOf(solo, 'h1')!.lit).toBe(1)

    const pair = seekingMatch(['s', 'h1', 'h2'])
    tick(pair, [body('s', AWAY[0]), body('h1', pair.altars[0]), body('h2', pair.altars[0])], settings.altarLightTime / 2 + 0.01)
    expect(pair.altars[0].lit).toBe(true)
    expect([seatOf(pair, 'h1')!.lit, seatOf(pair, 'h2')!.lit]).toEqual([1, 1])

    const fast = seekingMatch(['s', 'h'])
    tick(fast, [body('s', AWAY[0]), body('h', fast.altars[0], { trait: 'firekeeper' })], settings.altarLightTime / 2)
    expect(fast.altars[0].progress).toBeGreaterThan(0.5)
  })

  it('lets a seeker put a half-lit altar out only down to its last stage, never a lit one', () => {
    const match = seekingMatch(['s', 'h'])
    const [half, done] = match.altars
    tick(match, [body('s', AWAY[0]), body('h', half)], settings.altarLightTime * 0.6)
    tick(match, [body('s', AWAY[0]), body('h', done)], settings.altarLightTime + 0.01)
    expect(done.lit).toBe(true)
    tick(match, [body('s', half), body('h', AWAY[1])], settings.altarKickTime)
    // 60% lit: put out to the 50% stage, no further
    expect(half.progress).toBeCloseTo(0.5)
    tick(match, [body('s', done), body('h', AWAY[1])], settings.altarKickTime + 1)
    expect(done.lit).toBe(true)
  })

  it('ends the round for the hiders once all but one altar are lit', () => {
    const match = seekingMatch(['s', 'h'])
    tick(match, [body('s', AWAY[0]), body('h', match.altars[0])], settings.altarLightTime + 0.01)
    expect(match.clock.phase).toBe('seeking')
    tick(match, [body('s', AWAY[0]), body('h', match.altars[1])], settings.altarLightTime + 0.01)
    expect(match.clock).toMatchObject({ winner: 'hider', reason: 'altars' })
  })

  it('lets a hider who lit an altar chain a nearby seeker: both freeze, then the seeker is dazed', () => {
    const match = seekingMatch(['s', 'h'])
    const at = { col: 10, row: 10 }
    // No altar lit yet: no chain
    expect(startChain(match, 'h', [body('s', { col: 13, row: 10 }), body('h', at)], grid, settings)).toEqual([])
    tick(match, [body('s', AWAY[0]), body('h', match.altars[0])], settings.altarLightTime + 0.01)
    // Out of reach: no chain
    expect(startChain(match, 'h', [body('s', { col: 20, row: 10 }), body('h', at)], grid, settings)).toEqual([])
    expect(startChain(match, 'h', [body('s', { col: 13, row: 10 }), body('h', at)], grid, settings)).toEqual([{ kind: 'chain', hider: 'h', seeker: 's' }])
    expect(isFrozen(match, 's')).toBe(true)
    expect(isFrozen(match, 'h')).toBe(true)
    // Held, the seeker catches nobody, even right next to the hider
    tick(match, [body('s', { col: 10.4, row: 10 }), body('h', at)], 1)
    expect(seatOf(match, 'h')!.jailed).toBe(false)

    const events = tick(match, [body('s', { col: 13, row: 10 }), body('h', at)], settings.chainTime)
    expect(events).toContainEqual({ kind: 'chainEnd', hider: 'h', seeker: 's', dazed: true })
    expect(isFrozen(match, 'h')).toBe(false)
    expect(seatOf(match, 's')!.dazed).toBeGreaterThan(0)
    // Dazed: still no catch; then free again
    tick(match, [body('s', { col: 10.4, row: 10 }), body('h', at)], 0.1)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    tick(match, [body('s', { col: 20, row: 20 }), body('h', at)], settings.chainDaze)
    expect(isFrozen(match, 's')).toBe(false)
    // Cooldown: no second chain right away
    expect(startChain(match, 'h', [body('s', { col: 13, row: 10 }), body('h', at)], grid, settings)).toEqual([])
  })

  it('lets the other seeker free a chained teammate (no daze) or catch the frozen hider', () => {
    const lit = () => {
      const match = seekingMatch(['s1', 's2', 'h'])
      tick(match, [body('s1', AWAY[0]), body('s2', AWAY[1]), body('h', match.altars[0])], settings.altarLightTime + 0.01)
      startChain(match, 'h', [body('s1', { col: 13, row: 10 }), body('s2', AWAY[1]), body('h', { col: 10, row: 10 })], grid, settings)
      return match
    }
    const freed = lit()
    const events = tick(freed, [body('s1', { col: 13, row: 10 }), body('s2', { col: 13.4, row: 10 }), body('h', { col: 10, row: 10 })])
    expect(events).toContainEqual({ kind: 'chainEnd', hider: 'h', seeker: 's1', dazed: false })
    expect(seatOf(freed, 's1')!.dazed).toBe(0)

    const caught = lit()
    tick(caught, [body('s1', { col: 13, row: 10 }), body('s2', { col: 10.4, row: 10 }), body('h', { col: 10, row: 10 })])
    expect(seatOf(caught, 'h')!.jailed).toBe(true)
    expect(caught.chains).toEqual([])
  })

  it('sends the caught to jail; a free teammate reaching the jail frees everybody there', () => {
    const match = seekingMatch(['s', 'h1', 'h2', 'h3'])
    const far = { col: 20, row: 2 }
    tick(match, [body('s', { col: 10, row: 10 }), body('h1', { col: 10.5, row: 10 }), body('h2', { col: 9.6, row: 10 }), body('h3', far)])
    expect(['h1', 'h2'].map(id => seatOf(match, id)!.jailed)).toEqual([true, true])
    expect(match.clock.phase).toBe('seeking')

    // Touching where they were caught does nothing: they are in the jail
    tick(match, [body('s', AWAY[0]), body('h1', jailSpot(arena.jail!, 0)), body('h2', jailSpot(arena.jail!, 1)), body('h3', { col: 10, row: 10 })])
    expect(seatOf(match, 'h1')!.jailed).toBe(true)

    const atJail = [body('s', AWAY[0]), body('h1', jailSpot(arena.jail!, 0)), body('h2', jailSpot(arena.jail!, 1)), body('h3', { col: 3.5, row: 3.5 })]
    // It takes standing there for the rescue time
    expect(tick(match, atJail, settings.rescueTime / 2)).toEqual([])
    const events = tick(match, atJail, settings.rescueTime / 2 + 0.01)
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
    tick(match, [body('s1', AWAY[0]), body('s2', { col: 20, row: 20 }), body('h1', { col: 20.5, row: 20 }), body('h2', { col: 20, row: 2 })])
    expect(seatOf(match, 'h1')!.jailed).toBe(true)
    expect(seatOf(match, 's2')!.catches).toBe(1)
    expect(seatOf(match, 's1')!.catches).toBe(0)
    startRound(match, 1, grid, spawns, settings, random)
    expect(match.seats.every(s => s.catches === 0 && s.lit === 0 && !s.jailed)).toBe(true)
    expect(match.altars.every(a => !a.lit && a.progress === 0)).toBe(true)
  })

  it('lets a rescuer free the jail from further away', () => {
    const jailedMatch = () => {
      const match = seekingMatch(['s', 'h1', 'h2'])
      tick(match, [body('s', { col: 10, row: 10 }), body('h1', { col: 10.5, row: 10 }), body('h2', { col: 20, row: 2 })])
      return match
    }
    const nearJail = { col: arena.jail!.col + 2.5, row: arena.jail!.row }
    const plain = jailedMatch()
    tick(plain, [body('s', AWAY[0]), body('h1', arena.jail!), body('h2', nearJail)], settings.rescueTime + 0.01)
    expect(seatOf(plain, 'h1')!.jailed).toBe(true)
    const rescued = jailedMatch()
    tick(rescued, [body('s', AWAY[0]), body('h1', arena.jail!), body('h2', nearJail, { trait: 'rescuer' })], settings.rescueTime + 0.01)
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
    expect(events[0]).toEqual({ kind: 'caught', id: 'h', by: 's' })
    expect(match.clock.reason).toBe('caught')
  })

  it('lets the seekers set burning candles down while seeking, a few per round and not on top of each other', () => {
    const match = createMatch(teams(['s'], ['h']))
    startRound(match, 0, grid, spawns, settings, random)
    expect(placeCandle(match, { col: 5, row: 5 }, 2, null)).toBe(false) // still hiding
    tick(match, away(['s', 'h']), settings.hideTime + 0.01)
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
    const events = tick(match, [body('s', AWAY[0]), body('h', { col: 20.3, row: 20 })])
    expect(events).toContainEqual({ kind: 'bell', col: 20, row: 20 })
    expect(match.traps[0].ringing).toBeGreaterThan(0)
  })

  it('with exit gates: enough altars open them, and the hiders win only by getting out', () => {
    const match = seekingMatch(['s', 'h'])
    match.exits = [{ col: 0, row: 10.5 }, { col: 29, row: 20.5 }]
    tick(match, [body('s', AWAY[0]), body('h', match.altars[0])], settings.altarLightTime + 0.01)
    const events = tick(match, [body('s', AWAY[0]), body('h', match.altars[1])], settings.altarLightTime + 0.01)
    expect(events.map(e => e.kind)).toContain('exitsOpen')
    expect(match.clock.phase).toBe('seeking')
    // Hiding in a barrel next to the gate is not getting out
    tick(match, [body('s', AWAY[0]), body('h', { col: 28.8, row: 20.5 }, { hidden: 0 })])
    expect(match.clock.phase).toBe('seeking')
    tick(match, [body('s', AWAY[0]), body('h', { col: 28.8, row: 20.5 })])
    expect(match.clock).toMatchObject({ winner: 'hider', reason: 'escaped' })
  })
})
