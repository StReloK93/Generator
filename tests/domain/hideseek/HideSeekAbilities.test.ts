import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  normalizeHideSeekSettings,
  createMatch,
  startRound,
  tickMatch,
  seatOf,
  useAbility,
  abilitiesOf,
  motionFactor,
  noEffects,
  trailSees,
  fireWallCrossed,
  nearestFreeSpot,
  dashTarget,
  blinkTarget,
  MatchBody,
} from '@/domain/hideseek'

const settings = normalizeHideSeekSettings({ hideTime: 0, roundTime: 60, dashDistance: 4, blinkDistance: 5, shieldTime: 3, shieldCooldown: 40 })
const open = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: [] })
// A wall line on col = 10 (sub-column 20), all the way down
const walled = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: Array.from({ length: 60 }, (_, sr) => `20,${sr}`) })
const spawns = { seekers: [{ col: 5, row: 5 }], hiders: [{ col: 25, row: 25 }] }

function seekingMatch() {
  const match = createMatch([{ id: 's', team: 0 }, { id: 'h', team: 1 }])
  startRound(match, 0, open, spawns, settings, () => 0.42)
  return match
}

describe('HideSeekAbilities', () => {
  it('gives every hero three abilities of their own, the same in both roles', () => {
    expect(abilitiesOf('female')).toEqual(['dash', 'wind', 'sprint'])
    expect(abilitiesOf('warrior')).toEqual(['secondWind', 'shield', 'bash'])
    expect(abilitiesOf('demon')).toEqual(['vanish', 'blink', 'rewind'])
    expect(abilitiesOf('male')).toEqual(['watch', 'track', 'stalk'])
    expect(abilitiesOf('orc')).toEqual(['hook', 'roar', 'berserk'])
    expect(abilitiesOf('zombi')).toEqual(['burrow', 'sense', 'tunnel'])
    expect(abilitiesOf('bird')).toEqual(['scout', 'fireWall', 'nest'])
    expect(abilitiesOf('barry')).toEqual(['decoy', 'snare', 'swap'])
    expect(abilitiesOf('nobody')).toEqual([])
  })

  it('dashes forward and stops short of a wall; a blink steps through it', () => {
    expect(dashTarget(open, { col: 5, row: 5 }, 0, settings.dashDistance).col).toBeCloseTo(9)
    const dash = dashTarget(walled, { col: 8, row: 5 }, 0, settings.dashDistance)
    expect(dash.col).toBeLessThan(10)
    const blink = blinkTarget(walled, { col: 8, row: 5 }, 0, settings.blinkDistance)
    expect(blink.col).toBeGreaterThan(10)
  })

  it('cools down after use, and a shield keeps a hider from being caught', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 10, row: 10, moving: false, hidden: -1, model: 'male' },
      { id: 'h', col: 10.3, row: 10, moving: false, hidden: -1, model: 'warrior' },
    ]
    expect(useAbility(match, 'h', 1, bodies, open, settings)).toEqual([{ kind: 'ability', by: 'h', slot: 1, ability: 'shield', mark: null }])
    expect(useAbility(match, 'h', 1, bodies, open, settings)).toEqual([])
    expect(seatOf(match, 'h')!.cooldowns[1]).toBe(40)
    // Past the start grace, still shielded: not caught
    tickMatch(match, bodies, open, settings, 2.9)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    // The shield ran out: caught
    tickMatch(match, bodies, open, settings, 0.5)
    expect(seatOf(match, 'h')!.jailed).toBe(true)
  })

  it('an orc seeker hooks the nearest hider in sight to them, and roars to slow hiders nearby', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 5, row: 5, moving: false, hidden: -1, model: 'orc' },
      { id: 'h', col: 10, row: 5, moving: false, hidden: -1, model: 'male' },
    ]
    const events = useAbility(match, 's', 0, bodies, open, settings)
    const pulled = events.find(e => e.kind === 'pulled')
    expect(pulled).toMatchObject({ id: 'h', row: 5 })
    expect(pulled && 'col' in pulled ? pulled.col : 0).toBeCloseTo(6.2)
    bodies[1].col = 7
    useAbility(match, 's', 1, bodies, open, settings)
    expect(seatOf(match, 'h')!.effects.slowed).toBe(settings.roarTime)
  })

  it('a snare roots the first opponent stepping on it, then is gone', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 20, row: 20, moving: false, hidden: -1, model: 'male' },
      { id: 'h', col: 5, row: 5, moving: false, hidden: -1, model: 'barry' },
    ]
    useAbility(match, 'h', 1, bodies, open, settings)
    expect(match.marks).toHaveLength(1)
    bodies[0].col = 5.3
    bodies[0].row = 5
    bodies[1].col = 25
    bodies[1].row = 25
    tickMatch(match, bodies, open, settings, 0.1)
    expect(seatOf(match, 's')!.effects.rooted).toBe(settings.snareTime)
    expect(match.marks).toHaveLength(0)
  })

  it('nobody is caught underground', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 10, row: 10, moving: false, hidden: -1, model: 'male' },
      { id: 'h', col: 10.3, row: 10, moving: false, hidden: -1, model: 'zombi' },
    ]
    useAbility(match, 'h', 0, bodies, open, settings)
    tickMatch(match, bodies, open, settings, 4)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
  })
  it('nobody is caught or swapped while vanished', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 10, row: 10, moving: false, hidden: -1, model: 'barry' },
      { id: 'h', col: 10.3, row: 10, moving: false, hidden: -1, model: 'demon' },
    ]
    useAbility(match, 'h', 0, bodies, open, settings)
    tickMatch(match, bodies, open, settings, 1)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    // Nobody to swap with: not spent
    expect(useAbility(match, 's', 2, bodies, open, settings)).toEqual([])
  })

  it('sprint, stalk and berserk run faster; berserk shrugs off roots and slows', () => {
    const effects = noEffects()
    effects.sprint = 1
    expect(motionFactor(effects, settings)).toBeCloseTo(settings.hasteFactor)
    const berserk = noEffects()
    berserk.berserk = 1
    berserk.rooted = 1
    berserk.slowed = 1
    expect(motionFactor(berserk, settings)).toBeCloseTo(settings.hasteFactor)
    const rooted = noEffects()
    rooted.rooted = 1
    rooted.stalk = 1
    expect(motionFactor(rooted, settings)).toBe(0)
  })

  it('a bash roots the opponents right beside the warrior', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 10, row: 10, moving: false, hidden: -1, model: 'warrior' },
      { id: 'h', col: 11, row: 10, moving: false, hidden: -1, model: 'demon' },
    ]
    useAbility(match, 's', 2, bodies, open, settings)
    expect(seatOf(match, 'h')!.effects.rooted).toBe(settings.bashTime)
  })

  it('a stalker leaves a trail behind that keeps watch for them', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 5, row: 5, moving: true, hidden: -1, model: 'male' },
      { id: 'h', col: 25, row: 25, moving: false, hidden: -1, model: 'demon' },
    ]
    useAbility(match, 's', 2, bodies, open, settings)
    for (let i = 0; i < 4; i++) {
      bodies[0].col += 1.1
      tickMatch(match, bodies, open, settings, 0.1)
    }
    const trail = match.marks.filter(m => m.kind === 'trail' && m.by === 's')
    expect(trail.length).toBeGreaterThanOrEqual(4)
    expect(trailSees(trail[0], { col: 5.5, row: 6 }, settings)).toBe(true)
    expect(trailSees(trail[0], { col: 5, row: 15 }, settings)).toBe(false)
  })

  it('a bird sets a nest down, then flies back to it; only then it cools down', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 5, row: 5, moving: false, hidden: -1, model: 'male' },
      { id: 'h', col: 20, row: 20, moving: false, hidden: -1, model: 'bird' },
    ]
    useAbility(match, 'h', 2, bodies, open, settings)
    expect(match.marks).toMatchObject([{ kind: 'nest', col: 20, row: 20 }])
    tickMatch(match, bodies, open, settings, 0.6)
    bodies[1].col = 27
    const back = useAbility(match, 'h', 2, bodies, open, settings)
    expect(back).toContainEqual({ kind: 'pulled', id: 'h', col: 20, row: 20 })
    expect(match.marks.some(m => m.kind === 'nest')).toBe(false)
    expect(seatOf(match, 'h')!.cooldowns[2]).toBe(settings.nestCooldown)
  })

  it('an opponent cannot walk through a fire wall (its own side can)', () => {
    const match = seekingMatch()
    const bodies: MatchBody[] = [
      { id: 's', col: 5, row: 5, moving: false, hidden: -1, model: 'male' },
      { id: 'h', col: 10, row: 10, moving: false, hidden: -1, model: 'bird', facing: 0 },
    ]
    useAbility(match, 'h', 1, bodies, open, settings)
    expect(fireWallCrossed(match.marks, 0, { col: 9.5, row: 10 }, { col: 10.5, row: 10 }, settings)).toBe(true)
    expect(fireWallCrossed(match.marks, 1, { col: 9.5, row: 10 }, { col: 10.5, row: 10 }, settings)).toBe(false)
    expect(fireWallCrossed(match.marks, 0, { col: 9.5, row: 15 }, { col: 10.5, row: 15 }, settings)).toBe(false)
  })

  it('a swap trades places with the nearest opponent in sight', () => {
    const match = seekingMatch()
    const pair: MatchBody[] = [
      { id: 's', col: 14, row: 10, moving: false, hidden: -1, model: 'male' },
      { id: 'h', col: 10, row: 10, moving: false, hidden: -1, model: 'barry' },
    ]
    const swapped = useAbility(match, 'h', 2, pair, open, settings).filter(e => e.kind === 'pulled')
    expect(swapped).toEqual([{ kind: 'pulled', id: 's', col: 10, row: 10 }, { kind: 'pulled', id: 'h', col: 14, row: 10 }])
  })

  it('someone who comes up inside a wall steps out to the nearest free floor', () => {
    const out = nearestFreeSpot(walled, { col: 10, row: 5 })
    expect(Math.abs(out.col - 10)).toBeGreaterThan(0.3)
    expect(Math.abs(out.col - 10)).toBeLessThan(1)
  })
})
