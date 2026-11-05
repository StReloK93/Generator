import type { Component } from 'vue'
import { Rabbit, Dumbbell, HandHelping, Ghost, Eye, Worm, Flame, WandSparkles } from 'lucide-vue-next'
import type { HideSeekTrait } from '../../domain/hideseek'

/** How a character trait is shown (lobby picker, in-game panel). */
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
