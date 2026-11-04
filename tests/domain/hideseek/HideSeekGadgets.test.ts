import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  normalizeHideSeekSettings,
  freshStamina,
  advanceStamina,
  moveSpeed,
  gadgetsFor,
  stoneLanding,
  noiseLoudness,
  heartbeatDanger,
  markExplored,
  castVision,
} from '@/domain/hideseek'

const settings = normalizeHideSeekSettings({ staminaSeconds: 4, staminaRegen: 1, runSpeed: 4, tiredSpeed: 2.8, sneakSpeed: 2, seekerSpeedBonus: 1.1 })

describe('HideSeekGadgets', () => {
  it('runs out of breath after staminaSeconds of running, then recovers walking quietly', () => {
    let stamina = freshStamina(settings)
    stamina = advanceStamina(stamina, 'run', 4.1, settings)
    expect(stamina.exhausted).toBe(true)
    expect(moveSpeed('hider', false, stamina, settings)).toBe(2.8)
    stamina = advanceStamina(stamina, 'sneak', 0.5, settings)
    expect(stamina.exhausted).toBe(true)
    stamina = advanceStamina(stamina, 'still', 1, settings)
    expect(stamina.exhausted).toBe(false)
    // Hiding in a barrel recovers twice as fast
    expect(advanceStamina({ value: 0, exhausted: false }, 'hidden', 1, settings).value).toBe(2)
  })

  it('lets the seeker run a bit faster while not tired; sneaking is the same for everyone', () => {
    const fresh = freshStamina(settings)
    expect(moveSpeed('seeker', false, fresh, settings)).toBeCloseTo(4.4)
    expect(moveSpeed('hider', false, fresh, settings)).toBe(4)
    expect(moveSpeed('seeker', true, fresh, settings)).toBe(2)
  })

  it('hands out stones to hiders and flares / traps to the seeker', () => {
    expect(gadgetsFor('hider', settings)).toEqual({ stones: 3, flares: 0, traps: 0, candles: 0 })
    expect(gadgetsFor('seeker', settings)).toEqual({ stones: 0, flares: 2, traps: 2, candles: 4 })
  })

  it('gives the trickster one more of each own gadget', () => {
    expect(gadgetsFor('hider', settings, 1)).toEqual({ stones: 4, flares: 0, traps: 0, candles: 0 })
    expect(gadgetsFor('seeker', settings, 1)).toEqual({ stones: 0, flares: 3, traps: 3, candles: 5 })
  })

  it('stops a stone at walls and at the throwing range', () => {
    const collisionSubcells = Array.from({ length: 20 }, (_, sr) => `9,${sr}`) // wall on col = 4.5
    const grid = buildCollisionGrid({ cols: 20, rows: 10, collisionSubcells })
    const landing = stoneLanding(grid, { col: 1, row: 2 }, { col: 15, row: 2 }, settings)
    expect(landing.col).toBeLessThan(4.5)
    const open = buildCollisionGrid({ cols: 30, rows: 10, collisionSubcells: [] })
    expect(stoneLanding(open, { col: 1, row: 2 }, { col: 25, row: 2 }, settings).col).toBeLessThanOrEqual(1 + settings.stoneRange)
  })

  it('makes noises and the heartbeat louder up close', () => {
    expect(noiseLoudness(1, settings)).toBeGreaterThan(noiseLoudness(8, settings))
    expect(noiseLoudness(settings.noiseRange, settings)).toBe(0)
    expect(heartbeatDanger(1, settings)).toBeGreaterThan(heartbeatDanger(5, settings))
    expect(heartbeatDanger(50, settings)).toBe(0)
  })

  it('remembers the cells a player has seen', () => {
    const grid = buildCollisionGrid({ cols: 20, rows: 20, collisionSubcells: [] })
    const explored = new Uint8Array(400)
    markExplored(explored, 20, 20, castVision(grid, { col: 5, row: 5 }, 0, settings))
    expect(explored[5 * 20 + 9]).toBe(1) // ahead
    expect(explored[5 * 20 + 1]).toBe(0) // behind
  })

  it('a lantern / flare adds a full circle around the player to the forward cone', () => {
    const grid = buildCollisionGrid({ cols: 30, rows: 30, collisionSubcells: [] })
    const lit = castVision(grid, { col: 15, row: 15 }, 0, settings, 5)
    const reach = (p: { col: number; row: number }) => Math.hypot(p.col - 15, p.row - 15)
    const rays = lit.slice(1)
    expect(Math.max(...rays.map(reach))).toBeCloseTo(settings.visionRange) // the cone still reaches far
    expect(Math.min(...rays.map(reach))).toBeCloseTo(5) // and behind is lit up to the flare radius
  })
})
