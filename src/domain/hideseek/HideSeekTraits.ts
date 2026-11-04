import { HideSeekSettings } from '../../types/map'
import { HideSeekRole } from './HideSeekRules'

/**
 * Character traits: every character has one, and keeps it in both roles (a swift hider is a swift seeker too).
 * The numbers come from the map's hide & seek settings.
 */
export type HideSeekTrait =
  | 'swift'
  | 'endurance'
  | 'rescuer'
  | 'stealth'
  | 'keenEye'
  | 'crawler'
  | 'treasureSense'
  | 'trickster'

const MODEL_TRAITS: Record<string, HideSeekTrait> = {
  female: 'swift',
  warrior: 'endurance',
  orc: 'rescuer',
  demon: 'stealth',
  male: 'keenEye',
  zombi: 'crawler',
  bird: 'treasureSense',
  barry: 'trickster',
}

export function traitOf(model: string | null | undefined): HideSeekTrait | null {
  return (model && MODEL_TRAITS[model]) || null
}

/**
 * A player's own rules: the base rules with their trait (faster, longer breath, further sight), for the seeker the
 * momentum of every hider caught this round (faster and slower to tire), for a hider carrying treasure a slower run.
 */
export function playerRules(settings: HideSeekSettings, trait: HideSeekTrait | null, role: HideSeekRole, catches = 0, carrying = false): HideSeekSettings {
  const rules = { ...settings }
  if (trait === 'swift') {
    rules.runSpeed *= 1 + settings.traitSpeedBonus
    rules.tiredSpeed *= 1 + settings.traitSpeedBonus
  } else if (trait === 'endurance') {
    rules.staminaSeconds *= 1 + settings.traitStaminaBonus
    rules.staminaRegen *= 1 + settings.traitStaminaBonus
  } else if (trait === 'keenEye') {
    rules.visionRange *= 1 + settings.traitVisionBonus
  }
  if (role === 'seeker' && catches > 0) {
    rules.runSpeed *= 1 + settings.catchSpeedBonus * catches
    rules.staminaSeconds *= 1 + settings.catchStaminaBonus * catches
  }
  if (carrying) {
    rules.runSpeed *= settings.carrySpeedFactor
    rules.tiredSpeed *= settings.carrySpeedFactor
    rules.sneakSpeed *= settings.carrySpeedFactor
  }
  return rules
}

/** Only the crawler squeezes through the crawl holes in the labyrinth walls (in both roles). */
export function crawlsThroughHoles(trait: HideSeekTrait | null | undefined): boolean {
  return trait === 'crawler'
}

/** How close a free hider has to come to a jailed teammate to set them free. */
export function rescueReach(settings: HideSeekSettings, trait: HideSeekTrait | null | undefined): number {
  return settings.catchDistance * (trait === 'rescuer' ? settings.traitRescueReach : 1)
}

/** How close the seeker has to come to a hider to catch them. */
export function catchReach(settings: HideSeekSettings, trait: HideSeekTrait | null | undefined): number {
  return settings.catchDistance * (trait === 'rescuer' ? settings.traitCatchReach : 1)
}

/** Share of the others' sight range within which this character is spotted (a shadow only from close by). */
export function spottedWithin(settings: HideSeekSettings, trait: HideSeekTrait | null | undefined): number {
  return trait === 'stealth' ? settings.traitStealthSight : 1
}

/** How loud this character's footsteps are (a shadow is hard to hear). */
export function stepLoudness(settings: HideSeekSettings, trait: HideSeekTrait | null | undefined): number {
  return trait === 'stealth' ? settings.traitStealthNoise : 1
}

/** Chests within this distance show through walls and darkness (0 = no treasure sense). */
export function treasureSenseRadius(settings: HideSeekSettings, trait: HideSeekTrait | null | undefined): number {
  return trait === 'treasureSense' ? settings.traitSenseRadius : 0
}

/** Extra of each own gadget per round (the trickster). */
export function extraGadgets(settings: HideSeekSettings, trait: HideSeekTrait | null | undefined): number {
  return trait === 'trickster' ? settings.traitExtraGadgets : 0
}
