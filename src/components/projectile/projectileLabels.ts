import type { Component } from 'vue'
import {
  Flame, Snowflake, Zap, FlaskConical, Sparkles, Moon, Leaf, Sun, Hammer, Cpu,
  Rocket, CloudLightning, Radio,
} from 'lucide-vue-next'
import type { ProjectileBehavior, ProjectileDefinition, ProjectileElement } from '../../types/projectile'
import type { BadgeVariant } from '../ui'
import { presetParts } from '../../domain/projectile'

/** How an element is shown (library filters, cards) */
export const ELEMENT_INFO: Record<ProjectileElement, { icon: Component; badge: BadgeVariant }> = {
  fire: { icon: Flame, badge: 'amber' },
  frost: { icon: Snowflake, badge: 'cyan' },
  electro: { icon: Zap, badge: 'brand' },
  poison: { icon: FlaskConical, badge: 'emerald' },
  arcane: { icon: Sparkles, badge: 'purple' },
  void: { icon: Moon, badge: 'rose' },
  nature: { icon: Leaf, badge: 'emerald' },
  holy: { icon: Sun, badge: 'amber' },
  physical: { icon: Hammer, badge: 'slate' },
  tech: { icon: Cpu, badge: 'cyan' },
}

export const BEHAVIOR_INFO: Record<ProjectileBehavior, { icon: Component; label: string }> = {
  flying: { icon: Rocket, label: 'pe.behavior.flying' },
  strike: { icon: CloudLightning, label: 'pe.behavior.strike' },
  beam: { icon: Radio, label: 'pe.behavior.beam' },
}

type Translate = (key: string) => string

/** Player projectiles keep their own name; library presets are named from their element and form */
export function projectileName(def: ProjectileDefinition, t: Translate): string {
  if (def.isCustom) return def.name
  const parts = presetParts(def.id)
  if (!parts) return def.name
  const form = parts.kind === 'flying' ? `pe.family.${parts.key}` : `pe.${parts.kind}Style.${parts.key}`
  return `${t(`pe.element.${parts.element}`)} ${t(form)}`
}

/** The main colors of a projectile for a small swatch (its body, or its strike / beam) */
export function projectileSwatch(def: ProjectileDefinition): string[] {
  if (def.behavior === 'strike') return [def.strike.color2, def.strike.color, def.strike.core]
  if (def.behavior === 'beam') return [def.beam.color, def.beam.core]
  return def.body.map(l => l.color).slice(-3)
}
