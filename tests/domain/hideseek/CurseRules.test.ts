import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  normalizeHideSeekSettings,
  createMatch,
  startRound,
  startCurseRound,
  tickCurse,
  searchSpotCurse,
  curseHolder,
  seatOf,
  generateMaze,
  buildMazeMap,
  CURSE_STUN_SEC,
  CURSE_IMMUNE_SEC,
  MatchBody,
} from '@/domain/hideseek'
import { getMapMode, isMazeMode } from '@/domain/map'

const settings = normalizeHideSeekSettings({ hideTime: 2, roundTime: 10, roundCount: 2, scoreCatch: 10, scoreRescue: 25, scoreWin: 60, scorePerSecond: 1 })
const open = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: [] })
const spawns = { seekers: [{ col: 5, row: 5 }], hiders: [{ col: 20, row: 20 }, { col: 22, row: 20 }] }

/** a, b, c in a fresh round; the random pick makes `a` the first carrier */
function curseMatch(players = ['a', 'b', 'c']) {
  const match = createMatch(players.map(id => ({ id, team: 1 as const })), settings.roundCount)
  startRound(match, 0, open, spawns, settings, () => 0.3)
  startCurseRound(match, () => 0)
  return match
}

const body = (id: string, col: number, row: number, hidden = -1): MatchBody => ({ id, col, row, moving: false, hidden })

/** Past the scatter: the fuse is burning */
function burning(players?: string[]) {
  const match = curseMatch(players)
  tickCurse(match, [body('a', 5, 5), body('b', 20, 20), body('c', 25, 25)], open, settings, settings.hideTime + 0.01)
  return match
}

describe('Curse genre', () => {
  it('is a labyrinth genre of its own', () => {
    expect(getMapMode({ gameMode: 'curse' })).toBe('curse')
    expect(isMazeMode('curse')).toBe(true)
    expect(isMazeMode('hideseek')).toBe(true)
    expect(isMazeMode('td')).toBe(false)
  })

  it('starts with one carrier, no altars or gates, and a scatter before the fuse', () => {
    const match = curseMatch()
    expect(curseHolder(match)?.id).toBe('a')
    expect(match.seats.filter(s => s.role === 'seeker')).toHaveLength(1)
    expect(seatOf(match, 'a')?.team).toBe(0)
    expect(match.altars).toEqual([])
    expect(match.exits).toEqual([])
    expect(match.clock.phase).toBe('hiding')

    tickCurse(match, [body('a', 5, 5), body('b', 20, 20), body('c', 25, 25)], open, settings, settings.hideTime + 0.01)
    expect(match.clock.phase).toBe('seeking')
    expect(match.clock.timeLeft).toBe(settings.roundTime)
  })

  it('passes the curse with a touch: the new carrier is stunned, the old one protected', () => {
    const match = burning()
    const events = tickCurse(match, [body('a', 10, 10), body('b', 10.3, 10), body('c', 25, 25)], open, settings, 0.1)
    expect(events).toContainEqual({ kind: 'cursed', from: 'a', to: 'b' })
    expect(curseHolder(match)?.id).toBe('b')
    expect(seatOf(match, 'a')?.role).toBe('hider')
    expect(seatOf(match, 'b')?.dazed).toBe(CURSE_STUN_SEC)
    expect(seatOf(match, 'a')?.effects.shield).toBe(CURSE_IMMUNE_SEC)

    // Stunned: it cannot bounce straight back, and the old carrier is still protected after the stun
    expect(tickCurse(match, [body('a', 10, 10), body('b', 10.3, 10), body('c', 25, 25)], open, settings, 0.1)).not.toContainEqual(expect.objectContaining({ kind: 'cursed' }))
    tickCurse(match, [body('a', 15, 15), body('b', 10.3, 10), body('c', 25, 25)], open, settings, CURSE_STUN_SEC)
    expect(tickCurse(match, [body('a', 10, 10), body('b', 10.3, 10), body('c', 25, 25)], open, settings, 0.1)).not.toContainEqual(expect.objectContaining({ kind: 'cursed' }))
  })

  it('does not reach into a barrel by touch, but opening it passes the curse', () => {
    const match = burning()
    const bodies = [body('a', 10, 10), body('b', 10.3, 10, 0), body('c', 25, 25)]
    expect(tickCurse(match, bodies, open, settings, 0.1)).not.toContainEqual(expect.objectContaining({ kind: 'cursed' }))
    expect(searchSpotCurse(match, 0, bodies, settings, 'a')).toEqual([{ kind: 'cursed', from: 'a', to: 'b' }])
    expect(curseHolder(match)?.id).toBe('b')
  })

  it('turns the carrier to stone when the fuse burns out, and the curse finds a new carrier', () => {
    const match = burning()
    const events = tickCurse(match, [body('a', 5, 5), body('b', 20, 20), body('c', 25, 25)], open, settings, settings.roundTime)
    expect(events).toContainEqual({ kind: 'caught', id: 'a' })
    expect(seatOf(match, 'a')?.jailed).toBe(true)
    expect(seatOf(match, 'a')?.role).toBe('hider')
    expect(['b', 'c']).toContain(curseHolder(match)?.id)
    expect(match.clock.phase).toBe('hiding')
    // The survivors scored for outliving the fuse (plus a point a second while running)
    expect(seatOf(match, 'b')!.score).toBeGreaterThanOrEqual(settings.scoreRescue + settings.roundTime - 0.01)
  })

  it('ends the round with the last one standing, and the match with the best total', () => {
    const match = burning(['a', 'b'])
    let events = tickCurse(match, [body('a', 5, 5), body('b', 20, 20)], open, settings, settings.roundTime)
    expect(events).toContainEqual({ kind: 'roundOver' })
    expect(match.clock.reason).toBe('survived')
    expect(seatOf(match, 'b')!.score).toBeGreaterThan(seatOf(match, 'a')!.score)

    // Second (last) round: the match ends and the best total is the champion
    events = tickCurse(match, [body('a', 5, 5), body('b', 20, 20)], open, settings, 10)
    expect(events).toEqual([{ kind: 'roundDue' }])
    startRound(match, 1, open, spawns, settings, () => 0.3)
    startCurseRound(match, () => 0)
    tickCurse(match, [body('a', 5, 5), body('b', 20, 20)], open, settings, settings.hideTime + 0.01)
    events = tickCurse(match, [body('a', 5, 5), body('b', 20, 20)], open, settings, settings.roundTime)
    expect(events).toContainEqual({ kind: 'ended' })
    expect(match.champion).toBe('b')
  })

  it('hands the curse on when its carrier leaves the game', () => {
    const match = burning()
    tickCurse(match, [body('b', 20, 20), body('c', 25, 25)], open, settings, 0.1)
    expect(['b', 'c']).toContain(curseHolder(match)?.id)
  })

  it('dresses the ruins labyrinth with overgrown floors and crumbled walls, keeping the same walls', () => {
    const maze = generateMaze(4242, { cols: 30, rows: 30, roomCount: 6, doorCount: 4, holeCount: 6, torchCount: 12, hideSpotCount: 14, exitCount: 0 })
    const classic = buildMazeMap(maze)
    const ruins = buildMazeMap(maze, 'ruins')
    expect(ruins.collisionSubcells).toEqual(classic.collisionSubcells)
    const floors = new Set(Object.values(ruins.layers[0].tiles).map(items => items[0].assetId))
    expect(floors.has('sprite-grass') || floors.has('sprite-grassflower') || floors.has('sprite-grasscombo')).toBe(true)
    expect([...floors].some(id => id.startsWith('sprite-stone'))).toBe(true)
    const walls = Object.values(ruins.layers[1].tiles).flat().map(item => item.assetId)
    expect(walls.some(id => id.startsWith('sprite-stoneWallBroken'))).toBe(true)
    // The same cell always looks the same
    expect(buildMazeMap(maze, 'ruins').layers[0].tiles).toEqual(ruins.layers[0].tiles)
  })
})
