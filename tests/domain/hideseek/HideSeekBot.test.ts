import { describe, it, expect } from 'vitest'
import {
  buildCollisionGrid,
  createBotBrain,
  thinkBot,
  stepAlongPath,
  normalizeHideSeekSettings,
  ChestState,
  BotBrain,
  BotSenses,
  HideSeekRole,
  CollisionGrid,
} from '@/domain/hideseek'
import { GridCoord } from '@/types/map'
import labyrinth from '@/maps/Labyrinth.json'

const settings = normalizeHideSeekSettings({ visionRange: 8, visionAngle: 90, hearingRange: 9, lanternRadius: 1.5 })
const openGrid = buildCollisionGrid({ cols: 20, rows: 20, collisionSubcells: [] })
const random = () => 0.5

function senses(self: GridCoord, facing: number, opponent: GridCoord | null, chests: ChestState[], extra: Partial<BotSenses> = {}, moving = false): BotSenses {
  return {
    self,
    facing,
    opponent: opponent && { ...opponent, moving, sneaking: false },
    chests,
    spots: [],
    noise: null,
    exhausted: false,
    hiddenIn: -1,
    gadgets: { stones: 0, flares: 0, traps: 0 },
    flareActive: false,
    exits: [],
    ...extra,
  }
}

function think(brain: BotBrain, role: HideSeekRole, s: BotSenses, grid: CollisionGrid = openGrid) {
  return thinkBot(brain, role, s, grid, settings, random, 0.1)
}

describe('HideSeekBot', () => {
  it('hider heads for the nearest chest that still holds treasure', () => {
    const chests = [{ col: 15, row: 15, looted: false }, { col: 4, row: 2, looted: true }, { col: 6, row: 3, looted: false }]
    const brain = createBotBrain(openGrid, [{ col: 2, row: 2 }], chests.length, 0)
    think(brain, 'hider', senses({ col: 2, row: 2 }, 0, null, chests))
    expect(brain.mode).toBe('collect')
    expect(brain.path.at(-1)).toEqual({ col: 6, row: 3 })
  })

  it('hider runs away from a seeker it sees, never past them', () => {
    const chests = [{ col: 12, row: 10, looted: false }]
    const brain = createBotBrain(openGrid, [{ col: 10, row: 10 }], chests.length, 0)
    const self = { col: 10, row: 10 }
    const seeker = { col: 13, row: 10 }
    think(brain, 'hider', senses(self, 0, seeker, chests))
    expect(brain.mode).toBe('flee')
    const end = brain.path.at(-1)!
    expect(Math.hypot(end.col - seeker.col, end.row - seeker.row)).toBeGreaterThan(Math.hypot(self.col - seeker.col, self.row - seeker.row))
    for (const p of brain.path) expect(Math.hypot(p.col - seeker.col, p.row - seeker.row)).toBeGreaterThan(2.5)
  })

  it('hider does not flee through the seeker in the labyrinth', () => {
    const project = labyrinth.project
    const grid = buildCollisionGrid(project)
    const brain = createBotBrain(grid, project.routes.map(r => r.routePoints[0]), 0, 0)
    const self = { col: 12, row: 12 }
    const seeker = { col: 11, row: 11 }
    thinkBot(brain, 'hider', senses(self, Math.atan2(-1, -1), seeker, [], {}, true), grid, settings, Math.random, 0.1)
    expect(brain.mode).toBe('flee')
    let a = self
    for (const b of brain.path) {
      const length = Math.hypot(b.col - a.col, b.row - a.row)
      for (let d = 0; d <= length; d += 0.25) {
        const t = length > 0 ? d / length : 0
        expect(Math.hypot(a.col + (b.col - a.col) * t - seeker.col, a.row + (b.row - a.row) * t - seeker.row)).toBeGreaterThan(1.3)
      }
      a = b
    }
  })

  it('hider tiptoes and throws a decoy stone when it hears the seeker nearby', () => {
    const chests = [{ col: 15, row: 15, looted: false }]
    const brain = createBotBrain(openGrid, [{ col: 2, row: 2 }], chests.length, 0)
    // Seeker behind the bot (not in its sight cone), 5 tiles away and running
    const action = think(brain, 'hider', senses({ col: 7, row: 7 }, 0, { col: 2, row: 7 }, chests, { gadgets: { stones: 1, flares: 0, traps: 0 } }, true))
    expect(action.sneak).toBe(true)
    expect(action.stone).not.toBeNull()
    expect(Math.hypot(action.stone!.col - 7, action.stone!.row - 7)).toBeLessThanOrEqual(settings.stoneRange)
  })

  it('hider out of breath dives into a nearby barrel and stays while the seeker is close', () => {
    const brain = createBotBrain(openGrid, [{ col: 2, row: 2 }], 0, 1)
    const spots = [{ col: 8, row: 10 }]
    const seeker = { col: 13, row: 10 }
    think(brain, 'hider', senses({ col: 10, row: 10 }, 0, seeker, [], { spots, exhausted: true }))
    expect(brain.mode).toBe('hide')
    expect(brain.path.at(-1)).toEqual(spots[0])
    const action = think(brain, 'hider', senses({ col: 8.2, row: 10 }, Math.PI, seeker, [], { spots, exhausted: true }, true))
    expect(action.hideIn).toBe(0)
    // Inside: stays put while it can still hear the seeker
    expect(think(brain, 'hider', senses({ col: 8, row: 10 }, Math.PI, { col: 11, row: 10 }, [], { spots, hiddenIn: 0 }, true)).hideIn).toBe(0)
  })

  it('seeker chases a hider it sees, looks into chests it passes and leaves a bell at full ones', () => {
    const chests = [{ col: 5.5, row: 5, looted: false }]
    const brain = createBotBrain(openGrid, [{ col: 5, row: 5 }], chests.length, 0)
    const action = think(brain, 'seeker', senses({ col: 5, row: 5 }, 0, { col: 10, row: 5 }, chests, { gadgets: { stones: 0, flares: 0, traps: 1 } }))
    expect(brain.mode).toBe('chase')
    expect(brain.path.at(-1)).toEqual({ col: 10, row: 5 })
    expect(action.checkedChest).toBe(0)
    expect(action.trap).toBe(true)
    // Same chest is not checked again right away
    expect(think(brain, 'seeker', senses({ col: 5, row: 5 }, 0, { col: 10, row: 5 }, chests)).checkedChest).toBe(-1)
  })

  it('seeker lights a flare and runs to where it last saw the hider after losing sight', () => {
    const brain = createBotBrain(openGrid, [{ col: 5, row: 5 }], 0, 0)
    const gadgets = { stones: 0, flares: 1, traps: 0 }
    think(brain, 'seeker', senses({ col: 5, row: 5 }, 0, { col: 9, row: 5 }, [], { gadgets }))
    // Hider slipped behind the seeker
    const action = think(brain, 'seeker', senses({ col: 6, row: 5 }, 0, { col: 2, row: 5 }, [], { gadgets }))
    expect(action.flare).toBe(true)
    expect(brain.mode).toBe('search')
    expect(brain.path.at(-1)).toEqual({ col: 9, row: 5 })
  })

  it('seeker investigates a noise and opens the barrels around it', () => {
    const brain = createBotBrain(openGrid, [{ col: 2, row: 2 }], 0, 1)
    const spots = [{ col: 12, row: 12 }]
    think(brain, 'seeker', senses({ col: 2, row: 2 }, 0, null, [], { spots, noise: { col: 11, row: 12 } }))
    expect(brain.mode).toBe('investigate')
    expect(brain.path.at(-1)).toEqual({ col: 11, row: 12 })
    // Reached the noise, nobody in sight: open the barrel next to it
    brain.path = []
    think(brain, 'seeker', senses({ col: 11, row: 12 }, 0, null, [], { spots }))
    expect(brain.mode).toBe('suspect')
    const action = think(brain, 'seeker', senses({ col: 11.5, row: 12 }, 0, null, [], { spots }))
    expect(action.search).toBe(0)
  })

  it('a hider bot loots every labyrinth chest when left alone', () => {
    const project = labyrinth.project
    const grid = buildCollisionGrid(project)
    const spawns = project.routes.map(r => r.routePoints[0])
    const chests: ChestState[] = [{ col: 2, row: 2 }, { col: 21, row: 3 }, { col: 4, row: 20 }].map(c => ({ ...c, looted: false }))
    const brain = createBotBrain(grid, spawns, chests.length, 0)
    let self: GridCoord = { ...spawns[1] }
    for (let t = 0; t < 120 * 10 && chests.some(c => !c.looted); t++) {
      thinkBot(brain, 'hider', senses(self, 0, null, chests), grid, settings, Math.random, 0.1)
      const step = stepAlongPath(self, brain.path, settings.runSpeed * 0.1)
      brain.path = step.path
      self = step.pos
      for (const c of chests) if (Math.hypot(c.col - self.col, c.row - self.row) < 0.7) c.looted = true
    }
    expect(chests.every(c => c.looted)).toBe(true)
  })
})
