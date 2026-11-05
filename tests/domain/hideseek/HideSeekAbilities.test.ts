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
  it('gives the first heroes two abilities each, the same in both roles', () => {
    expect(abilitiesOf('female')).toEqual(['dash', 'wind'])
    expect(abilitiesOf('warrior')).toEqual(['secondWind', 'shield'])
    expect(abilitiesOf('demon')).toEqual(['vanish', 'blink'])
    expect(abilitiesOf('male')).toEqual(['watch', 'track'])
    expect(abilitiesOf('nobody')).toEqual([])
  })

  it('dashes forward and stops short of a wall; a blink steps through it', () => {
    expect(dashTarget(open, { col: 5, row: 5 }, 0, settings).col).toBeCloseTo(9)
    const dash = dashTarget(walled, { col: 8, row: 5 }, 0, settings)
    expect(dash.col).toBeLessThan(10)
    const blink = blinkTarget(walled, { col: 8, row: 5 }, 0, settings)
    expect(blink.col).toBeGreaterThan(10)
  })

  it('cools down after use, and a shield keeps a hider from being caught', () => {
    const match = seekingMatch()
    expect(useAbility(match, 'h', 1, 'warrior', settings)).toEqual([{ kind: 'ability', by: 'h', slot: 1, ability: 'shield' }])
    expect(useAbility(match, 'h', 1, 'warrior', settings)).toEqual([])
    expect(seatOf(match, 'h')!.cooldowns[1]).toBe(40)
    const bodies: MatchBody[] = [
      { id: 's', col: 10, row: 10, moving: false, hidden: -1 },
      { id: 'h', col: 10.3, row: 10, moving: false, hidden: -1 },
    ]
    // Past the start grace, still shielded: not caught
    tickMatch(match, bodies, open, settings, 2.9)
    expect(seatOf(match, 'h')!.jailed).toBe(false)
    // The shield ran out: caught
    tickMatch(match, bodies, open, settings, 0.5)
    expect(seatOf(match, 'h')!.jailed).toBe(true)
  })
})
