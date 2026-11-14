import type { Component } from 'vue'
import { Users, Footprints, Flame, Map as MapIcon, Eye, Trophy, Sparkles, Zap } from 'lucide-vue-next'
import type { HideSeekSettings } from '../types/map'
import type { AbilityId, HideSeekTrait } from '../domain/hideseek'
import { ABILITY_ICONS, TRAIT_INFO } from './game/hideSeekTraitInfo'

type NumericKey = { [K in keyof HideSeekSettings]: HideSeekSettings[K] extends number ? K : never }[keyof HideSeekSettings]

/** One editable hide & seek rule: its i18n label and the range the editor allows */
export interface HideSeekField {
  key: NumericKey
  label: string
  min: number
  max: number
  step: number
  unit?: string
}

/** A titled block of fields (an ability, a trait) or an untitled one */
export interface HideSeekFieldCard {
  title?: string
  icon?: Component
  fields: HideSeekField[]
}

export interface HideSeekFieldSection {
  id: string
  label: string
  icon: Component
  cards: HideSeekFieldCard[]
}

const SEC = 's'

const field = (key: NumericKey, min: number, max: number, step: number, unit?: string): HideSeekField =>
  ({ key, label: `hsConfig.${key}`, min, max, step, unit })

/** An ability's parameters are labelled by what they are (distance, cooldown…); the card carries the ability name */
const param = (key: NumericKey, kind: string, min: number, max: number, step: number, unit?: string): HideSeekField =>
  ({ key, label: `hsConfig.param.${kind}`, min, max, step, unit })

const ability = (id: AbilityId, ...fields: HideSeekField[]): HideSeekFieldCard =>
  ({ title: `hideseek.ability.${id}`, icon: ABILITY_ICONS[id], fields })

const trait = (id: HideSeekTrait, ...fields: HideSeekField[]): HideSeekFieldCard =>
  ({ title: TRAIT_INFO[id].label, icon: TRAIT_INFO[id].icon, fields })

const cooldown = (key: NumericKey) => param(key, 'cooldown', 1, 180, 1, SEC)
const duration = (key: NumericKey) => param(key, 'time', 0.5, 60, 0.5, SEC)

/** Every hide & seek rule of a map, grouped as the editor's settings window shows them */
export const HIDE_SEEK_SECTIONS: HideSeekFieldSection[] = [
  {
    id: 'match',
    label: 'hsConfig.section.match',
    icon: Users,
    cards: [{
      fields: [
        field('maxPlayers', 2, 10, 1),
        field('seekerSlots', 1, 9, 1),
        field('roundCount', 1, 9, 1),
        field('roundTime', 30, 900, 10, SEC),
        field('hideTime', 0, 60, 1, SEC),
        field('heroPickTime', 5, 120, 5, SEC),
      ],
    }],
  },
  {
    id: 'movement',
    label: 'hsConfig.section.movement',
    icon: Footprints,
    cards: [{
      fields: [
        field('runSpeed', 0.5, 12, 0.1),
        field('sneakSpeed', 0.5, 12, 0.1),
        field('tiredSpeed', 0.5, 12, 0.1),
        field('seekerSpeedBonus', 1, 2, 0.01, '×'),
        field('staminaSeconds', 1, 60, 0.5, SEC),
        field('staminaRegen', 0.1, 10, 0.1),
        field('slowFactor', 0.1, 1, 0.05, '×'),
        field('hasteFactor', 1, 3, 0.05, '×'),
        field('visionRange', 1, 30, 0.5),
        field('visionAngle', 10, 180, 5, '°'),
        field('lanternRadius', 0, 10, 0.5),
        field('hearingRange', 1, 30, 0.5),
        field('noiseRange', 1, 30, 0.5),
        field('catchDistance', 0.2, 3, 0.05),
        field('footprintSeconds', 0, 60, 1, SEC),
      ],
    }],
  },
  {
    id: 'altars',
    label: 'hsConfig.section.altars',
    icon: Flame,
    cards: [{
      fields: [
        field('altarsToWin', 1, 20, 1),
        field('altarsPerHider', 0, 5, 1),
        field('altarExtra', 0, 10, 1),
        field('altarStages', 1, 10, 1),
        field('altarLightTime', 1, 60, 0.5, SEC),
        field('altarKickTime', 0.5, 60, 0.5, SEC),
        field('altarBaseDistance', 0, 40, 1),
        field('rescueTime', 0, 30, 0.5, SEC),
        field('chainRange', 0.5, 15, 0.5),
        field('chainTime', 1, 60, 1, SEC),
        field('chainCooldown', 0, 120, 1, SEC),
        field('chainDaze', 0, 15, 0.5, SEC),
        field('auraRange', 0, 10, 0.5),
        field('auraStun', 0, 30, 0.5, SEC),
        field('auraStunPerAltar', 0, 10, 0.5, SEC),
        field('auraCooldown', 0, 300, 5, SEC),
        field('auraReveal', 0, 60, 1, SEC),
      ],
    }],
  },
  {
    id: 'labyrinth',
    label: 'hsConfig.section.labyrinth',
    icon: MapIcon,
    cards: [{
      fields: [
        field('mazeCols', 12, 120, 2),
        field('mazeRows', 12, 120, 2),
        field('mazeGrowPerSeeker', 0, 20, 1),
        field('roomCount', 0, 30, 1),
        field('doorCount', 0, 30, 1),
        field('holeCount', 0, 30, 1),
        field('hideSpotCount', 0, 30, 1),
        field('torchCount', 0, 40, 1),
        field('torchRadius', 1, 10, 0.5),
        field('exitCount', 0, 8, 1),
      ],
    }],
  },
  {
    id: 'seeker',
    label: 'hsConfig.section.seeker',
    icon: Eye,
    cards: [{
      fields: [
        field('trapCount', 0, 10, 1),
        field('trapSlowTime', 0, 10, 0.5, SEC),
        field('seekerCandleCount', 0, 10, 1),
        field('huntTime', 0, 300, 5, SEC),
        field('huntPingInterval', 1, 60, 1, SEC),
        field('huntVisionBonus', 0, 2, 0.05, '×'),
        field('catchSpeedBonus', 0, 0.5, 0.01, '×'),
        field('catchStaminaBonus', 0, 2, 0.05, '×'),
      ],
    }],
  },
  {
    id: 'score',
    label: 'hsConfig.section.score',
    icon: Trophy,
    cards: [{
      fields: [
        field('scoreAltar', 0, 500, 5),
        field('scoreCatch', 0, 500, 5),
        field('scoreRescue', 0, 500, 5),
        field('scoreWin', 0, 1000, 5),
        field('scorePerSecond', 0, 20, 0.5),
      ],
    }],
  },
  {
    id: 'traits',
    label: 'hsConfig.section.traits',
    icon: Sparkles,
    cards: [
      trait('swift', param('traitSpeedBonus', 'bonus', 0, 1, 0.05, '×')),
      trait('endurance', param('traitStaminaBonus', 'bonus', 0, 2, 0.05, '×')),
      trait('keenEye', param('traitVisionBonus', 'bonus', 0, 1, 0.05, '×')),
      trait('rescuer', field('traitRescueReach', 1, 6, 0.1, '×'), field('traitCatchReach', 1, 3, 0.05, '×')),
      trait('stealth', field('traitStealthSight', 0.1, 1, 0.05, '×'), field('traitStealthNoise', 0.1, 1, 0.05, '×')),
      trait('firekeeper', param('traitLightBonus', 'bonus', 0, 2, 0.05, '×')),
      trait('trickster', field('traitExtraGadgets', 0, 5, 1)),
    ],
  },
  {
    id: 'abilities',
    label: 'hsConfig.section.abilities',
    icon: Zap,
    cards: [
      ability('dash', param('dashDistance', 'distance', 1, 15, 0.5), cooldown('dashCooldown')),
      ability('blink', param('blinkDistance', 'distance', 1, 15, 0.5), cooldown('blinkCooldown')),
      ability('wind', duration('windTime'), cooldown('windCooldown')),
      ability('secondWind', cooldown('secondWindCooldown')),
      ability('shield', duration('shieldTime'), cooldown('shieldCooldown')),
      ability('vanish', duration('vanishTime'), cooldown('vanishCooldown')),
      ability('watch', param('watchRange', 'range', 1, 30, 0.5), duration('watchTime'), cooldown('watchCooldown')),
      ability('track', duration('trackTime'), cooldown('trackCooldown')),
      ability('hook', param('hookRange', 'range', 1, 15, 0.5), cooldown('hookCooldown')),
      ability('roar', param('roarRange', 'range', 1, 15, 0.5), duration('roarTime'), cooldown('roarCooldown')),
      ability('burrow', duration('burrowTime'), cooldown('burrowCooldown')),
      ability('sense', duration('senseTime'), cooldown('senseCooldown')),
      ability('scout', param('scoutDistance', 'distance', 1, 30, 0.5), param('scoutRadius', 'radius', 1, 10, 0.5), duration('scoutTime'), cooldown('scoutCooldown')),
      ability('fireWall', param('fireWallLength', 'length', 1, 12, 0.5), duration('fireWallTime'), param('fireWallSlowTime', 'slowTime', 0.5, 10, 0.5, SEC), cooldown('fireWallCooldown')),
      ability('decoy', duration('decoyTime'), cooldown('decoyCooldown')),
      ability('snare', duration('snareTime'), param('snareLife', 'life', 5, 300, 5, SEC), cooldown('snareCooldown')),
      ability('sprint', duration('sprintTime'), cooldown('sprintCooldown')),
      ability('bash', param('bashRange', 'range', 1, 6, 0.5), duration('bashTime'), cooldown('bashCooldown')),
      ability('berserk', duration('berserkTime'), cooldown('berserkCooldown')),
      ability('rewind', param('rewindTime', 'back', 0.5, 10, 0.5, SEC), cooldown('rewindCooldown')),
      ability('stalk', duration('stalkTime'), param('stalkTrailLife', 'trailLife', 1, 60, 1, SEC), param('stalkTrailRadius', 'radius', 0.5, 8, 0.5), cooldown('stalkCooldown')),
      ability('tunnel', duration('tunnelTime'), cooldown('tunnelCooldown')),
      ability('nest', param('nestTime', 'life', 1, 60, 1, SEC), cooldown('nestCooldown')),
      ability('swap', param('swapRange', 'range', 1, 20, 0.5), cooldown('swapCooldown')),
    ],
  },
]
