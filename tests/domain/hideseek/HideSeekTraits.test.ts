import { describe, it, expect } from 'vitest'
import {
  normalizeHideSeekSettings,
  traitOf,
  playerRules,
  rescueReach,
  catchReach,
  spottedWithin,
  stepLoudness,
  treasureSenseRadius,
  extraGadgets,
  crawlsThroughHoles,
} from '@/domain/hideseek'
import { HERO_MODELS } from '@/stores/heroStore'

const settings = normalizeHideSeekSettings({ runSpeed: 4, tiredSpeed: 3, staminaSeconds: 8, staminaRegen: 1, visionRange: 10, hearingRange: 9, catchDistance: 1 })

describe('HideSeekTraits', () => {
  it('gives every character a trait, all different', () => {
    const traits = HERO_MODELS.map(m => traitOf(m.id))
    expect(traits.every(Boolean)).toBe(true)
    expect(new Set(traits).size).toBe(HERO_MODELS.length)
    expect(traitOf('nobody')).toBeNull()
  })

  it('keeps the trait in both roles: a swift character is fast as a hider and as the seeker', () => {
    expect(playerRules(settings, 'swift', 'hider').runSpeed).toBeCloseTo(4 * (1 + settings.traitSpeedBonus))
    expect(playerRules(settings, 'swift', 'seeker').runSpeed).toBeCloseTo(4 * (1 + settings.traitSpeedBonus))
    expect(playerRules(settings, null, 'hider').runSpeed).toBe(4)
  })

  it('makes the tireless run longer and the keen-eyed see further', () => {
    expect(playerRules(settings, 'endurance', 'hider').staminaSeconds).toBeCloseTo(8 * (1 + settings.traitStaminaBonus))
    expect(playerRules(settings, 'keenEye', 'seeker').visionRange).toBeCloseTo(10 * (1 + settings.traitVisionBonus))
  })

  it('makes the seeker faster and slower to tire with every catch of the round', () => {
    const none = playerRules(settings, null, 'seeker', 0)
    const two = playerRules(settings, null, 'seeker', 2)
    expect(two.runSpeed).toBeCloseTo(none.runSpeed * (1 + 2 * settings.catchSpeedBonus))
    expect(two.staminaSeconds).toBeCloseTo(none.staminaSeconds * (1 + 2 * settings.catchStaminaBonus))
    // Carrying a treasure slows a hider down
    expect(playerRules(settings, null, 'hider', 0, true).runSpeed).toBeCloseTo(4 * settings.carrySpeedFactor)
    // Only the seeker gets the momentum
    expect(playerRules(settings, null, 'hider', 2).runSpeed).toBe(4)
  })

  it('lets the rescuer free and catch from further, the shadow hide better, the sense feel chests, the trickster carry more', () => {
    expect(rescueReach(settings, 'rescuer')).toBeCloseTo(settings.traitRescueReach)
    expect(rescueReach(settings, 'swift')).toBe(1)
    expect(catchReach(settings, 'rescuer')).toBeCloseTo(settings.traitCatchReach)
    expect(spottedWithin(settings, 'stealth')).toBeLessThan(1)
    expect(stepLoudness(settings, 'stealth')).toBeLessThan(1)
    expect(spottedWithin(settings, 'swift')).toBe(1)
    expect(treasureSenseRadius(settings, 'treasureSense')).toBe(settings.traitSenseRadius)
    expect(treasureSenseRadius(settings, 'swift')).toBe(0)
    expect(extraGadgets(settings, 'trickster')).toBe(settings.traitExtraGadgets)
    expect(extraGadgets(settings, null)).toBe(0)
  })

  it('lets only the crawler through the crawl holes', () => {
    expect(crawlsThroughHoles('crawler')).toBe(true)
    expect(crawlsThroughHoles('swift')).toBe(false)
    expect(crawlsThroughHoles(null)).toBe(false)
  })

  it('takes the trait numbers from the map settings', () => {
    const custom = normalizeHideSeekSettings({ traitSpeedBonus: 0.5, traitStealthSight: 3 })
    expect(playerRules(custom, 'swift', 'hider').runSpeed).toBeCloseTo(custom.runSpeed * 1.5)
    // A shadow is never easier to spot than anyone else
    expect(custom.traitStealthSight).toBe(1)
  })
})
