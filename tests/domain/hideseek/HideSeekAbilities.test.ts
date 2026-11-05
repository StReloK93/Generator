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
  it('gives every hero two abilities, the same in both roles', () => {
    expect(abilitiesOf('female')).toEqual(['dash', 'wind'])
    expect(abilitiesOf('warrior')).toEqual(['secondWind', 'shield'])
    expect(abilitiesOf('demon')).toEqual(['vanish', 'blink'])
    expect(abilitiesOf('male')).toEqual(['watch', 'track'])
    expect(abilitiesOf('orc')).toEqual(['hook', 'roar'])
    expect(abilitiesOf('zombi')).toEqual(['burrow', 'sense'])
    expect(abilitiesOf('bird')).toEqual(['scout', 'fireWall'])
    expect(abilitiesOf('barry')).toEqual(['decoy', 'snare'])
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
})
