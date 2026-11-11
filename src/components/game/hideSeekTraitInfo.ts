import type { Component } from 'vue'
import {
  Rabbit, Dumbbell, HandHelping, Ghost, Eye, Worm, Flame, WandSparkles,
  Zap, Wind, HeartPulse, Shield, Waypoints, Radar, ScanSearch, Anchor, Megaphone, Shovel, Bird, Copy, CircleDot,
  FastForward, Hammer, Axe, History, ScanEye, Pickaxe, Egg, ArrowLeftRight,
} from 'lucide-vue-next'
import type { AbilityId, HideSeekTrait } from '../../domain/hideseek'

/** How a character trait is shown (hero picker, in-game panel). */
export const TRAIT_INFO: Record<HideSeekTrait, { icon: Component; label: string; desc: string }> = {
  swift: { icon: Rabbit, label: 'hideseek.traitSwift', desc: 'hideseek.traitSwiftDesc' },
  endurance: { icon: Dumbbell, label: 'hideseek.traitEndurance', desc: 'hideseek.traitEnduranceDesc' },
  rescuer: { icon: HandHelping, label: 'hideseek.traitRescuer', desc: 'hideseek.traitRescuerDesc' },
  stealth: { icon: Ghost, label: 'hideseek.traitStealth', desc: 'hideseek.traitStealthDesc' },
  keenEye: { icon: Eye, label: 'hideseek.traitKeenEye', desc: 'hideseek.traitKeenEyeDesc' },
  crawler: { icon: Worm, label: 'hideseek.traitCrawler', desc: 'hideseek.traitCrawlerDesc' },
  firekeeper: { icon: Flame, label: 'hideseek.traitFirekeeper', desc: 'hideseek.traitFirekeeperDesc' },
  trickster: { icon: WandSparkles, label: 'hideseek.traitTrickster', desc: 'hideseek.traitTricksterDesc' },
}

/** Ability icons (hero picker, HUD buttons) */
export const ABILITY_ICONS: Record<AbilityId, Component> = {
  dash: Zap,
  wind: Wind,
  secondWind: HeartPulse,
  shield: Shield,
  vanish: Ghost,
  blink: Waypoints,
  watch: Radar,
  track: ScanSearch,
  hook: Anchor,
  roar: Megaphone,
  burrow: Shovel,
  sense: Eye,
  scout: Bird,
  fireWall: Flame,
  decoy: Copy,
  snare: CircleDot,
  sprint: FastForward,
  bash: Hammer,
  berserk: Axe,
  rewind: History,
  stalk: ScanEye,
  tunnel: Pickaxe,
  nest: Egg,
  swap: ArrowLeftRight,
}

/** Keys of the three ability slots */
export const ABILITY_KEYS = ['Q', 'F', 'G']
