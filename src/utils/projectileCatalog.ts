import {
  Flame, Snowflake, Zap, Skull, Wand2, Ghost, Crosshair, Sun,
  Sparkles, Rocket, Wind, Mountain, Orbit, Send, Activity
} from 'lucide-vue-next'
import {
  ProjectileDefinition,
  ProjectileCategory,
  ProjectileArchetype,
  ProjectileClipboardPayload,
} from '../types/projectile'

export interface ProjectileArchetypeMeta {
  id: ProjectileArchetype
  name: string
  nameUz: string
  desc: string
  descUz: string
  icon: any
  badgeClass: string
}

export const PROJECTILE_ARCHETYPES: ProjectileArchetypeMeta[] = [
  {
    id: 'flying',
    name: 'Flying Projectiles',
    nameUz: "Uchuvchi O'qlar",
    desc: 'Arrows, fireballs, missiles, rockets, shurikens, and sawblades flying from tower to target',
    descUz: "Minora tomonidan dushmanga to'g'ridan-to'g'ri uchirib yuboriluvchi o'qlar (kamon, olov, raketa, tig')",
    icon: Send,
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  {
    id: 'sky_strike',
    name: 'Sky Strikes',
    nameUz: 'Osmondan Tushuvchi',
    desc: 'Lightning bolts, holy light pillars, meteors, solar beams, and arrow rain raining from the heavens',
    descUz: "Osmondan to'g'ridan-to'g'ri dushman ustiga tushuvchi chaqmoq, nur ustuni, meteorit yoki o'qlar yomg'iri",
    icon: Zap,
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  },
  {
    id: 'ground_burst',
    name: 'Ground Bursts',
    nameUz: 'Yerdan Otiluvchi',
    desc: 'Earth fissures, magma geysers, frost spikes, poison brambles, and seismic shockwaves erupting from beneath',
    descUz: "Dushmanning oyog'i ostidan otilib chiquvchi magma geyzeri, muz nayzalari, tikanli ildizlar va yer yoriqlari",
    icon: Mountain,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'unit_aura',
    name: 'Unit Auras & Orbitals',
    nameUz: 'Unit Atrofidagi Aura',
    desc: 'Orbiting blades, gravity singularities, void vortexes, frost novae, toxic clouds, and holy halos',
    descUz: "Dushman atrofida aylanuvchi po'lat tig'lar, qora tuynuk girdobi, muz to'lqini va sehrli runalar",
    icon: Orbit,
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  },
  {
    id: 'laser',
    name: 'Continuous Laser',
    nameUz: 'Uzluksiz Lazer Nuri',
    desc: 'Continuous focused plasma, void death beam, or prismatic laser locked onto target',
    descUz: "Minora va dushman o'rtasidagi to'xtovsiz yuqori energiyali plazma yoki lazer nuri",
    icon: Activity,
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  },
]

export function getProjectileArchetype(proj: ProjectileDefinition): ProjectileArchetype {
  if (!proj) return 'flying'
  if (proj.movement.isLaser || proj.formation.type === 'laser_beam') return 'laser'
  if (proj.movement.isInstant || proj.visual.shape === 'instant_strike') {
    const inst = proj.movement.instantType || ''
    if (['sky_thunder', 'heavenly_pillar', 'meteor_fall', 'solar_beam', 'arrow_rain', 'holy_spear', 'sky_strike'].includes(inst)) {
      return 'sky_strike'
    }
    if (['ground_fissure', 'magma_geyser', 'frost_spikes', 'poison_roots', 'void_portal', 'quake_stomp', 'ground_burst'].includes(inst)) {
      return 'ground_burst'
    }
    if (['unit_singularity', 'void_vortex', 'swirling_blades', 'frost_nova', 'poison_cloud', 'electric_discharge', 'rune_seal', 'holy_halo', 'unit_aura'].includes(inst)) {
      return 'unit_aura'
    }
    return 'sky_strike'
  }
  return 'flying'
}

export function applyProjectileArchetype(proj: ProjectileDefinition, archetype: ProjectileArchetype): void {
  if (!proj) return
  if (archetype === 'flying') {
    proj.movement.isLaser = false
    proj.movement.isInstant = false
    if (proj.visual.shape === 'instant_strike') {
      proj.visual.shape = 'arrow'
    }
    if (proj.formation.type === 'laser_beam') {
      proj.formation.type = 'single'
    }
  } else if (archetype === 'sky_strike') {
    proj.movement.isLaser = false
    proj.movement.isInstant = true
    proj.visual.shape = 'instant_strike'
    if (!proj.movement.instantType || !['sky_thunder', 'heavenly_pillar', 'meteor_fall', 'solar_beam', 'arrow_rain', 'holy_spear'].includes(proj.movement.instantType)) {
      proj.movement.instantType = 'sky_thunder'
    }
    if (proj.formation.type === 'laser_beam') {
      proj.formation.type = 'single'
    }
  } else if (archetype === 'ground_burst') {
    proj.movement.isLaser = false
    proj.movement.isInstant = true
    proj.visual.shape = 'instant_strike'
    if (!proj.movement.instantType || !['ground_fissure', 'magma_geyser', 'frost_spikes', 'poison_roots', 'void_portal', 'quake_stomp'].includes(proj.movement.instantType)) {
      proj.movement.instantType = 'ground_fissure'
    }
    if (proj.formation.type === 'laser_beam') {
      proj.formation.type = 'single'
    }
  } else if (archetype === 'unit_aura') {
    proj.movement.isLaser = false
    proj.movement.isInstant = true
    proj.visual.shape = 'instant_strike'
    if (!proj.movement.instantType || !['unit_singularity', 'void_vortex', 'swirling_blades', 'frost_nova', 'poison_cloud', 'electric_discharge', 'rune_seal', 'holy_halo'].includes(proj.movement.instantType)) {
      proj.movement.instantType = 'unit_singularity'
    }
    if (proj.formation.type === 'laser_beam') {
      proj.formation.type = 'single'
    }
  } else if (archetype === 'laser') {
    proj.movement.isLaser = true
    proj.movement.isInstant = false
    proj.formation.type = 'laser_beam'
    if (proj.visual.shape === 'instant_strike') {
      proj.visual.shape = 'line_streak'
    }
  }
}

export interface ProjectileCategoryMeta {
  id: ProjectileCategory
  name: string
  nameUz: string
  icon: any
  color: string
  bgClass: string
  borderClass: string
  glowClass: string
}

export const PROJECTILE_CATEGORIES: ProjectileCategoryMeta[] = [
  {
    id: 'fire',
    name: 'Fire / Inferno',
    nameUz: 'Olov / Magma',
    icon: Flame,
    color: '#f97316',
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400',
    borderClass: 'border-orange-500/40',
    glowClass: 'shadow-orange-500/30'
  },
  {
    id: 'frost',
    name: 'Frost / Ice',
    nameUz: 'Muz / Qor',
    icon: Snowflake,
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400',
    borderClass: 'border-cyan-500/40',
    glowClass: 'shadow-cyan-500/30'
  },
  {
    id: 'electro',
    name: 'Electro / Storm',
    nameUz: 'Elektr / Chaqmoq',
    icon: Zap,
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
    borderClass: 'border-blue-500/40',
    glowClass: 'shadow-blue-500/30'
  },
  {
    id: 'poison',
    name: 'Poison / Nature',
    nameUz: 'Zahar / Kislota',
    icon: Skull,
    color: '#22c55e',
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
    borderClass: 'border-emerald-500/40',
    glowClass: 'shadow-emerald-500/30'
  },
  {
    id: 'arcane',
    name: 'Arcane / Cosmic',
    nameUz: 'Sehr / Fazoviy',
    icon: Wand2,
    color: '#a855f7',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400',
    borderClass: 'border-purple-500/40',
    glowClass: 'shadow-purple-500/30'
  },
  {
    id: 'void',
    name: 'Void / Blood',
    nameUz: 'Zulmat / Qon',
    icon: Ghost,
    color: '#e11d48',
    bgClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400',
    borderClass: 'border-rose-500/40',
    glowClass: 'shadow-rose-500/30'
  },
  {
    id: 'siege',
    name: 'Siege / Physical',
    nameUz: 'Qamal / Mexanik',
    icon: Crosshair,
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
    borderClass: 'border-amber-500/40',
    glowClass: 'shadow-amber-500/30'
  },
  {
    id: 'holy',
    name: 'Holy / Radiant',
    nameUz: 'Muqaddas / Nur',
    icon: Sun,
    color: '#eab308',
    bgClass: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400',
    borderClass: 'border-yellow-500/40',
    glowClass: 'shadow-yellow-500/30'
  },
  {
    id: 'custom',
    name: 'Custom / Studio',
    nameUz: 'Maxsus / Redaktor',
    icon: Sparkles,
    color: '#ec4899',
    bgClass: 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400',
    borderClass: 'border-pink-500/40',
    glowClass: 'shadow-pink-500/30'
  },
]

export const BASE_PROJECTILE_DEFINITIONS: ProjectileDefinition[] = [
  // ══════════════════════════════════════════════════════════
  // 1. FLYING PROJECTILES / UCHUVCHI O'QLAR (Kamon, Olov, Raketa)
  // ══════════════════════════════════════════════════════════
  {
    "identity": {
      "id": "arrow",
      "name": "Ice cristal",
      "nameUz": "Muzli kristal",
      "category": "frost",
      "description": "3D Parabolik traektoriya bilan uchuvchi kamon o'qi",
      "version": 1
    },
    "movement": {
      "speed": 16,
      "hasArc": true,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "rocket",
      "size": 4,
      "length": 42,
      "points": 4,
      "colorHex": 3900150,
      "colorCss": "#3b82f6",
      "glowColorHex": 3900150,
      "glowColorCss": "#3b82f6",
      "coreColorHex": 3900150,
      "coreColorCss": "#3b82f6",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 3900150,
      "colorCss": "#3b82f6",
      "alpha": 0.4,
      "length": 15,
      "width": 7
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "shrapnel",
      "sparkCount": 8,
      "sparkColorHex": 3900150,
      "sparkColorCss": "#3b82f6",
      "shockwaveRadius": 12,
      "shockwaveColorHex": 3900150,
      "shockwaveColorCss": "#3b82f6",
      "hasDoubleRing": false
    }
  },
  {
    "identity": {
      "id": "flame_rocket",
      "name": "Flame Rocket",
      "nameUz": "Olovli Raketa",
      "category": "fire",
      "description": "Aerodinamik olovli reaktiv raketa",
      "version": 1
    },
    "movement": {
      "speed": 15,
      "hasArc": false,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "arrow",
      "size": 13,
      "length": 28,
      "points": 4,
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "glowColorHex": 15680580,
      "glowColorCss": "#ef4444",
      "coreColorHex": 15680580,
      "coreColorCss": "#ef4444",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "glow_streak",
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "alpha": 0.85,
      "length": 6,
      "width": 4
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "fire_ember",
      "sparkCount": 18,
      "sparkColorHex": 16347926,
      "sparkColorCss": "#f97316",
      "shockwaveRadius": 26,
      "shockwaveColorHex": 16498468,
      "shockwaveColorCss": "#fbbf24",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "fireball",
      "name": "Simple Flame",
      "nameUz": "Oddiy Olov",
      "category": "fire",
      "description": "Klassik uchuvchi olov shari",
      "version": 1
    },
    "movement": {
      "speed": 12,
      "hasArc": false,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "procedural_flame",
      "size": 6,
      "length": 24,
      "points": 4,
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "glowColorHex": 15680580,
      "glowColorCss": "#ef4444",
      "coreColorHex": 16707722,
      "coreColorCss": "#fef08a",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 16498468,
      "colorCss": "#fbbf24",
      "alpha": 0.7,
      "length": 4,
      "width": 3
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "fire_ember",
      "sparkCount": 16,
      "sparkColorHex": 16498468,
      "sparkColorCss": "#fbbf24",
      "shockwaveRadius": 22,
      "shockwaveColorHex": 15680580,
      "shockwaveColorCss": "#ef4444",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "custom_1790244461539_5z8n",
      "name": "Middle Fire",
      "nameUz": "O'rtacha olov",
      "category": "fire",
      "description": "Yangi maxsus snaryad konfiguratsiyasi",
      "version": 1,
      "isCustom": true
    },
    "movement": {
      "speed": 12,
      "hasArc": true,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "procedural_flame",
      "size": 10,
      "length": 10,
      "points": 4,
      "colorHex": 16347926,
      "colorCss": "#f97316",
      "glowColorHex": 16498468,
      "glowColorCss": "#fbbf24",
      "coreColorHex": 16498468,
      "coreColorCss": "#fbbf24",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "alpha": 0.7,
      "length": 20,
      "width": 9
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "ice_shard",
      "sparkCount": 16,
      "sparkColorHex": 16498468,
      "sparkColorCss": "#fbbf24",
      "shockwaveRadius": 24,
      "shockwaveColorHex": 15680580,
      "shockwaveColorCss": "#ef4444",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "simple_frost",
      "name": "Ice bold",
      "nameUz": "Qor ",
      "category": "frost",
      "description": "O'tkir qirrali kristall muz snaryadi",
      "version": 1
    },
    "movement": {
      "speed": 17,
      "hasArc": false,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "procedural_flame",
      "size": 6,
      "length": 24,
      "points": 4,
      "colorHex": 440020,
      "colorCss": "#06b6d4",
      "glowColorHex": 3900150,
      "glowColorCss": "#3b82f6",
      "coreColorHex": 16777215,
      "coreColorCss": "#ffffff",
      "alpha": 0.95,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 3900150,
      "colorCss": "#3b82f6",
      "alpha": 0.5,
      "length": 4,
      "width": 3
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "ice_shard",
      "sparkCount": 16,
      "sparkColorHex": 440020,
      "sparkColorCss": "#06b6d4",
      "shockwaveRadius": 22,
      "shockwaveColorHex": 440020,
      "shockwaveColorCss": "#06b6d4",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "shuriken",
      "name": "Spinning Shuriken",
      "nameUz": "Ninja Shurikeni",
      "category": "siege",
      "description": "Tez aylanuvchi po'lat yulduzcha",
      "version": 1
    },
    "movement": {
      "speed": 24,
      "hasArc": false,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "shuriken",
      "size": 7,
      "length": 24,
      "points": 4,
      "colorHex": 9741240,
      "colorCss": "#94a3b8",
      "glowColorHex": 13358561,
      "glowColorCss": "#cbd5e1",
      "coreColorHex": 16777215,
      "coreColorCss": "#ffffff",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "none",
      "colorHex": 9741240,
      "colorCss": "#94a3b8",
      "alpha": 0.6,
      "length": 5,
      "width": 2
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "default",
      "sparkCount": 12,
      "sparkColorHex": 16777215,
      "sparkColorCss": "#ffffff",
      "shockwaveRadius": 18,
      "shockwaveColorHex": 6583435,
      "shockwaveColorCss": "#64748b",
      "hasDoubleRing": false
    }
  },
  {
    "identity": {
      "id": "twin_helix_orb",
      "name": "Twin Spiral Helix",
      "nameUz": "3D Spiral Sehr",
      "category": "arcane",
      "description": "3D fazoviy aylanma spiral bilan uchuvchi shar",
      "version": 1
    },
    "movement": {
      "speed": 12,
      "hasArc": false,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "arrow",
      "size": 8,
      "length": 24,
      "points": 4,
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "glowColorHex": 15680580,
      "glowColorCss": "#ef4444",
      "coreColorHex": 3900150,
      "coreColorCss": "#3b82f6",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "alpha": 0.8,
      "length": 10,
      "width": 4
    },
    "formation": {
      "type": "twin_helix",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "holy_cross",
      "sparkCount": 10,
      "sparkColorHex": 16498468,
      "sparkColorCss": "#fbbf24",
      "shockwaveRadius": 10,
      "shockwaveColorHex": 15680580,
      "shockwaveColorCss": "#ef4444",
      "hasDoubleRing": true
    }
  },

  // ══════════════════════════════════════════════════════════
  // 2. SKY STRIKES / OSMONDAN TUSHUVCHILAR (Yuqoridan Zarba)
  // ══════════════════════════════════════════════════════════
  {
    "identity": {
      "id": "sky_thunder_strike",
      "name": "Sky Thunder Bolt",
      "nameUz": "Osmondan Chaqmoq",
      "category": "electro",
      "description": "Osmondan to'g'ridan-to'g'ri unit ustiga tushuvchi kuchli chaqmoq",
      "version": 1
    },
    "movement": {
      "speed": 23,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "sky_thunder"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 6,
      "length": 24,
      "points": 4,
      "colorHex": 3900150,
      "colorCss": "#3b82f6",
      "glowColorHex": 6333946,
      "glowColorCss": "#60a5fa",
      "coreColorHex": 16777215,
      "coreColorCss": "#ffffff",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "glow_streak",
      "colorHex": 6333946,
      "colorCss": "#60a5fa",
      "alpha": 0.8,
      "length": 6,
      "width": 8
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "snowflake",
      "sparkCount": 4,
      "sparkColorHex": 16777215,
      "sparkColorCss": "#ffffff",
      "shockwaveRadius": 24,
      "shockwaveColorHex": 2450411,
      "shockwaveColorCss": "#2563eb",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "meteor_fall_strike",
      "name": "Yellow Bolt",
      "nameUz": "Yashil chaqmoq",
      "category": "electro",
      "description": "Osmondan katta burchak ostida qulovchi olovli meteorit",
      "version": 1
    },
    "movement": {
      "speed": 19,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "sky_thunder"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 7,
      "length": 20,
      "points": 4,
      "colorHex": 16347926,
      "colorCss": "#f97316",
      "glowColorHex": 16498468,
      "glowColorCss": "#fbbf24",
      "coreColorHex": 16707722,
      "coreColorCss": "#fef08a",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "glow_streak",
      "colorHex": 16498468,
      "colorCss": "#fbbf24",
      "alpha": 0.85,
      "length": 8,
      "width": 8
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "ice_shard",
      "sparkCount": 6,
      "sparkColorHex": 16498468,
      "sparkColorCss": "#fbbf24",
      "shockwaveRadius": 12,
      "shockwaveColorHex": 15680580,
      "shockwaveColorCss": "#ef4444",
      "hasDoubleRing": false
    }
  },
  {
    "identity": {
      "id": "heavenly_pillar_strike",
      "name": "Radiant Light Pillar",
      "nameUz": "Ilohiy Nur Ustuni",
      "category": "holy",
      "description": "Osmondan tushuvchi shaffof vertikal nur ustuni",
      "version": 1
    },
    "movement": {
      "speed": 25,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "heavenly_pillar"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 5,
      "length": 80,
      "points": 4,
      "colorHex": 16498468,
      "colorCss": "#fbbf24",
      "glowColorHex": 15381256,
      "glowColorCss": "#eab308",
      "coreColorHex": 15485081,
      "coreColorCss": "#ec4899",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "glow_streak",
      "colorHex": 16707722,
      "colorCss": "#fef08a",
      "alpha": 0.8,
      "length": 6,
      "width": 8
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "holy_cross",
      "sparkCount": 24,
      "sparkColorHex": 16777215,
      "sparkColorCss": "#ffffff",
      "shockwaveRadius": 36,
      "shockwaveColorHex": 13273604,
      "shockwaveColorCss": "#ca8a04",
      "hasDoubleRing": true
    }
  },
  // ══════════════════════════════════════════════════════════
  // 3. GROUND BURSTS / YERDAN OTILUVCHILAR (Ostidan Portlash)
  // ══════════════════════════════════════════════════════════
  {
    "identity": {
      "id": "earth_ground_burst",
      "name": "Blue Aura",
      "nameUz": "Ko'k aura",
      "category": "void",
      "description": "Unit ostidagi yerdan yorilib chiquvchi sehrli yer razlomi",
      "version": 1
    },
    "movement": {
      "speed": 25,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "quake_stomp"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 9,
      "length": 52,
      "points": 4,
      "colorHex": 6583435,
      "colorCss": "#64748b",
      "glowColorHex": 6583435,
      "glowColorCss": "#64748b",
      "coreColorHex": 6583435,
      "coreColorCss": "#64748b",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 8843180,
      "colorCss": "#86efac",
      "alpha": 0.6,
      "length": 6,
      "width": 6
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "acid_drop",
      "sparkCount": 20,
      "sparkColorHex": 6583435,
      "sparkColorCss": "#64748b",
      "shockwaveRadius": 10,
      "shockwaveColorHex": 6583435,
      "shockwaveColorCss": "#64748b",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "magma_geyser_burst",
      "name": "Magma Geyser",
      "nameUz": "Magma Geyzeri",
      "category": "fire",
      "description": "Yerdan yuqoriga otilib chiquvchi lava va olov ustuni",
      "version": 1
    },
    "movement": {
      "speed": 25,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "magma_geyser"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 5,
      "length": 88,
      "points": 4,
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "glowColorHex": 16347926,
      "glowColorCss": "#f97316",
      "coreColorHex": 16707722,
      "coreColorCss": "#fef08a",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 16347926,
      "colorCss": "#f97316",
      "alpha": 0.7,
      "length": 6,
      "width": 6
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "fire_ember",
      "sparkCount": 24,
      "sparkColorHex": 16498468,
      "sparkColorCss": "#fbbf24",
      "shockwaveRadius": 38,
      "shockwaveColorHex": 12131356,
      "shockwaveColorCss": "#b91c1c",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "frost_spikes_burst",
      "name": "Frost Spike Eruption",
      "nameUz": "Muz Nayzalari Otilishi",
      "category": "frost",
      "description": "Yerdan bir zumda o'sib chiquvchi o'tkir muz nayzalari",
      "version": 1
    },
    "movement": {
      "speed": 25,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "frost_spikes"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 7,
      "length": 48,
      "points": 4,
      "colorHex": 440020,
      "colorCss": "#06b6d4",
      "glowColorHex": 440020,
      "glowColorCss": "#06b6d4",
      "coreColorHex": 440020,
      "coreColorCss": "#06b6d4",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 3718648,
      "colorCss": "#38bdf8",
      "alpha": 0.6,
      "length": 4,
      "width": 4
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "ice_shard",
      "sparkCount": 20,
      "sparkColorHex": 440020,
      "sparkColorCss": "#06b6d4",
      "shockwaveRadius": 32,
      "shockwaveColorHex": 440020,
      "shockwaveColorCss": "#06b6d4",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "void_portal_burst",
      "name": "Void Abyss Rift",
      "nameUz": "Qora Tuynuk Girdobi",
      "category": "void",
      "description": "Unit ostida ochiluvchi qora tuynuk va gravitatsion tortishish",
      "version": 1
    },
    "movement": {
      "speed": 25,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "ground_fissure"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 10,
      "length": 30,
      "points": 4,
      "colorHex": 988970,
      "colorCss": "#0f172a",
      "glowColorHex": 988970,
      "glowColorCss": "#0f172a",
      "coreColorHex": 988970,
      "coreColorCss": "#0f172a",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "glow_streak",
      "colorHex": 11032055,
      "colorCss": "#a855f7",
      "alpha": 0.7,
      "length": 6,
      "width": 6
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "void_blood",
      "sparkCount": 20,
      "sparkColorHex": 6583435,
      "sparkColorCss": "#64748b",
      "shockwaveRadius": 36,
      "shockwaveColorHex": 6583435,
      "shockwaveColorCss": "#64748b",
      "hasDoubleRing": true
    }
  },

  // ══════════════════════════════════════════════════════════
  // 4. UNIT AURA & SURROUNDING VFX / UNIT ATROFIDAGI AURALAR
  // ══════════════════════════════════════════════════════════
  {
    "identity": {
      "id": "swirling_blades_aura",
      "name": "circler",
      "nameUz": "qonli bulut",
      "category": "void",
      "description": "Unit atrofida tez aylanib turuvchi o'tkir tig'lar halqasi",
      "version": 1
    },
    "movement": {
      "speed": 20,
      "hasArc": false,
      "isLaser": false,
      "isInstant": true,
      "instantType": "poison_cloud"
    },
    "visual": {
      "shape": "instant_strike",
      "size": 9,
      "length": 30,
      "points": 4,
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "glowColorHex": 15485081,
      "glowColorCss": "#ec4899",
      "coreColorHex": 15485081,
      "coreColorCss": "#ec4899",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "solid_line",
      "colorHex": 9741240,
      "colorCss": "#94a3b8",
      "alpha": 0.5,
      "length": 4,
      "width": 3
    },
    "formation": {
      "type": "single",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "shrapnel",
      "sparkCount": 8,
      "sparkColorHex": 15680580,
      "sparkColorCss": "#ef4444",
      "shockwaveRadius": 16,
      "shockwaveColorHex": 4674921,
      "shockwaveColorCss": "#475569",
      "hasDoubleRing": true
    }
  },
  {
    "identity": {
      "id": "custom_1790249232525_9ll0",
      "name": "Big Fire (Copy)",
      "nameUz": "Katta olov",
      "category": "fire",
      "description": "Yangi maxsus snaryad konfiguratsiyasi",
      "version": 1,
      "isCustom": true
    },
    "movement": {
      "speed": 20,
      "hasArc": true,
      "isLaser": false,
      "isInstant": false
    },
    "visual": {
      "shape": "procedural_flame",
      "size": 13,
      "length": 10,
      "points": 4,
      "colorHex": 16347926,
      "colorCss": "#f97316",
      "glowColorHex": 16498468,
      "glowColorCss": "#fbbf24",
      "coreColorHex": 16498468,
      "coreColorCss": "#fbbf24",
      "alpha": 1,
      "scale": 1
    },
    "trail": {
      "style": "particles",
      "colorHex": 15680580,
      "colorCss": "#ef4444",
      "alpha": 0.7,
      "length": 20,
      "width": 9
    },
    "formation": {
      "type": "twin_helix",
      "satelliteCount": 0
    },
    "impact": {
      "sparkType": "ice_shard",
      "sparkCount": 16,
      "sparkColorHex": 16498468,
      "sparkColorCss": "#fbbf24",
      "shockwaveRadius": 24,
      "shockwaveColorHex": 15680580,
      "shockwaveColorCss": "#ef4444",
      "hasDoubleRing": true
    }
  },
  {
    identity: {
      id: 'frost_nova_aura',
      name: 'Frost Nova Burst',
      nameUz: 'Muz Portlashi Novasi',
      category: 'frost',
      description: 'Unit atrofida portlab kengayuvchi muz toshishi halqasi',
      version: 1,
    },
    movement: {
      speed: 25,
      hasArc: false,
      isLaser: false,
      isInstant: true,
      instantType: 'frost_nova',
    },
    visual: {
      shape: 'instant_strike',
      size: 16,
      length: 30,
      points: 4,
      colorHex: 0x38bdf8,
      colorCss: '#38bdf8',
      glowColorHex: 0x06b6d4,
      glowColorCss: '#06b6d4',
      coreColorHex: 0xffffff,
      coreColorCss: '#ffffff',
      alpha: 1.0,
      scale: 1.0,
    },
    trail: {
      style: 'particles',
      colorHex: 0x38bdf8,
      colorCss: '#38bdf8',
      alpha: 0.6,
      length: 4,
      width: 4,
    },
    formation: {
      type: 'single',
      satelliteCount: 0,
    },
    impact: {
      sparkType: 'snowflake',
      sparkCount: 20,
      sparkColorHex: 0xffffff,
      sparkColorCss: '#ffffff',
      shockwaveRadius: 34,
      shockwaveColorHex: 0x0284c7,
      shockwaveColorCss: '#0284c7',
      hasDoubleRing: true,
    }
  },
  {
    identity: {
      id: 'poison_cloud_aura',
      name: 'Toxic Cloud Explosion',
      nameUz: 'Zaharli Gaz Buluti',
      category: 'poison',
      description: 'Unit atrofida qoplab oluvchi zaharli gaz va kislota buluti',
      version: 1,
    },
    movement: {
      speed: 25,
      hasArc: false,
      isLaser: false,
      isInstant: true,
      instantType: 'poison_cloud',
    },
    visual: {
      shape: 'instant_strike',
      size: 16,
      length: 30,
      points: 4,
      colorHex: 0x84cc16,
      colorCss: '#84cc16',
      glowColorHex: 0x22c55e,
      glowColorCss: '#22c55e',
      coreColorHex: 0xd9f99d,
      coreColorCss: '#d9f99d',
      alpha: 1.0,
      scale: 1.0,
    },
    trail: {
      style: 'particles',
      colorHex: 0x84cc16,
      colorCss: '#84cc16',
      alpha: 0.6,
      length: 5,
      width: 5,
    },
    formation: {
      type: 'single',
      satelliteCount: 0,
    },
    impact: {
      sparkType: 'acid_drop',
      sparkCount: 18,
      sparkColorHex: 0xd9f99d,
      sparkColorCss: '#d9f99d',
      shockwaveRadius: 32,
      shockwaveColorHex: 0x4d7c0f,
      shockwaveColorCss: '#4d7c0f',
      hasDoubleRing: true,
    }
  },
  {
    identity: {
      id: 'rune_seal_aura',
      name: 'Arcane Rune Seal',
      nameUz: 'Qadimiy Runik Doira',
      category: 'arcane',
      description: 'Unit atrofida aylanuvchi qadimiy sehrli runik muhr',
      version: 1,
    },
    movement: {
      speed: 25,
      hasArc: false,
      isLaser: false,
      isInstant: true,
      instantType: 'rune_seal',
    },
    visual: {
      shape: 'instant_strike',
      size: 18,
      length: 30,
      points: 4,
      colorHex: 0xc084fc,
      colorCss: '#c084fc',
      glowColorHex: 0xa855f7,
      glowColorCss: '#a855f7',
      coreColorHex: 0xffffff,
      coreColorCss: '#ffffff',
      alpha: 1.0,
      scale: 1.0,
    },
    trail: {
      style: 'glow_streak',
      colorHex: 0xc084fc,
      colorCss: '#c084fc',
      alpha: 0.7,
      length: 6,
      width: 6,
    },
    formation: {
      type: 'single',
      satelliteCount: 0,
    },
    impact: {
      sparkType: 'arcane_star',
      sparkCount: 20,
      sparkColorHex: 0xffffff,
      sparkColorCss: '#ffffff',
      shockwaveRadius: 36,
      shockwaveColorHex: 0x7e22ce,
      shockwaveColorCss: '#7e22ce',
      hasDoubleRing: true,
    }
  },

  // ══════════════════════════════════════════════════════════
  // 5. CONTINUOUS BEAMS / UZLUKSIZ LAZER NURLARI
  // ══════════════════════════════════════════════════════════
  {
    identity: {
      id: 'laser_beam',
      name: 'Plasma Laser Beam',
      nameUz: 'Plazmali Lazer Nuri',
      category: 'electro',
      description: 'Uzluksiz fokuslangan yuqori haroratli lazer oqimi',
      version: 1,
    },
    movement: {
      speed: 30,
      hasArc: false,
      isLaser: true,
      isInstant: false,
    },
    visual: {
      shape: 'line_streak',
      size: 6,
      length: 30,
      points: 4,
      colorHex: 0x3b82f6,
      colorCss: '#3b82f6',
      glowColorHex: 0x60a5fa,
      glowColorCss: '#60a5fa',
      coreColorHex: 0xffffff,
      coreColorCss: '#ffffff',
      alpha: 1.0,
      scale: 1.0,
    },
    trail: {
      style: 'glow_streak',
      colorHex: 0x60a5fa,
      colorCss: '#60a5fa',
      alpha: 0.8,
      length: 6,
      width: 5,
    },
    formation: {
      type: 'laser_beam',
      satelliteCount: 0,
    },
    impact: {
      sparkType: 'spark_line',
      sparkCount: 16,
      sparkColorHex: 0xffffff,
      sparkColorCss: '#ffffff',
      shockwaveRadius: 24,
      shockwaveColorHex: 0x2563eb,
      shockwaveColorCss: '#2563eb',
      hasDoubleRing: true,
    }
  }
]

// Global Runtime Registry
const runtimeRegistry = new Map<string, ProjectileDefinition>()

export function registerCustomProjectiles(list: ProjectileDefinition[]): void {
  if (!Array.isArray(list)) return
  for (const p of list) {
    if (p && p.identity?.id) {
      runtimeRegistry.set(p.identity.id, p)
    }
  }
}

export function registerCustomProjectile(proj: ProjectileDefinition): void {
  if (proj?.identity?.id) {
    runtimeRegistry.set(proj.identity.id, proj)
  }
}

export function getProjectileDefinition(id: string): ProjectileDefinition {
  if (!id) return BASE_PROJECTILE_DEFINITIONS[0]
  if (runtimeRegistry.has(id)) {
    return runtimeRegistry.get(id)!
  }
  const found = BASE_PROJECTILE_DEFINITIONS.find(p => p.identity.id === id)
  if (found) return found
  return BASE_PROJECTILE_DEFINITIONS[0]
}

export function getAllProjectilesUnified(): ProjectileDefinition[] {
  const map = new Map<string, ProjectileDefinition>()
  for (const p of BASE_PROJECTILE_DEFINITIONS) {
    map.set(p.identity.id, p)
  }
  for (const [id, p] of runtimeRegistry.entries()) {
    map.set(id, p)
  }
  return Array.from(map.values())
}

/**
 * Validates and normalizes raw JSON clipboard or import payload
 */
export function parseProjectileJson(rawJson: string): { success: boolean; data?: ProjectileDefinition; error?: string } {
  try {
    const clean = rawJson.trim()
    let obj: any
    try {
      obj = JSON.parse(clean)
    } catch {
      // Fallback for JS object literal with comments or trailing commas
      const jsonLike = clean
        .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
        .replace(/'([^']*)'/g, '"$1"')
      obj = JSON.parse(jsonLike)
    }

    const data: ProjectileDefinition = obj.type === 'projectile' && obj.data ? obj.data : obj

    if (!data.identity?.name && !data.visual?.shape) {
      return { success: false, error: 'Snaryad strukturasi yaroqsiz (identity.name yoki visual.shape yetishmaydi)' }
    }

    const normalized: ProjectileDefinition = {
      identity: {
        id: data.identity?.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: data.identity?.name || 'Custom Projectile',
        nameUz: data.identity?.nameUz || data.identity?.name || 'Maxsus Snaryad',
        category: data.identity?.category || 'custom',
        description: data.identity?.description || '',
        version: 1,
        isCustom: true,
      },
      movement: {
        speed: Number(data.movement?.speed) || 12,
        hasArc: Boolean(data.movement?.hasArc),
        arcHeightRatio: data.movement?.arcHeightRatio,
        isLaser: Boolean(data.movement?.isLaser),
        isInstant: Boolean(data.movement?.isInstant),
        instantType: data.movement?.instantType || 'sky_strike',
        homing: Boolean(data.movement?.homing),
        turnRate: data.movement?.turnRate,
      },
      visual: {
        shape: data.visual?.shape || 'circle',
        spriteTextureId: data.visual?.spriteTextureId,
        size: Number(data.visual?.size) || 10,
        length: Number(data.visual?.length) || 24,
        points: Number(data.visual?.points) || 4,
        colorHex: Number(data.visual?.colorHex) || 0xf97316,
        colorCss: data.visual?.colorCss || '#f97316',
        glowColorHex: Number(data.visual?.glowColorHex) || Number(data.visual?.colorHex) || 0xfbbf24,
        glowColorCss: data.visual?.glowColorCss || data.visual?.colorCss || '#fbbf24',
        coreColorHex: Number(data.visual?.coreColorHex) || 0xffffff,
        coreColorCss: data.visual?.coreColorCss || '#ffffff',
        alpha: Number(data.visual?.alpha) ?? 1.0,
        scale: Number(data.visual?.scale) || 1.0,
      },
      trail: {
        style: data.trail?.style || 'solid_line',
        colorHex: Number(data.trail?.colorHex) || Number(data.visual?.colorHex) || 0xfbbf24,
        colorCss: data.trail?.colorCss || '#fbbf24',
        alpha: Number(data.trail?.alpha) ?? 0.7,
        length: Number(data.trail?.length) || 8,
        width: Number(data.trail?.width) || 4,
      },
      formation: {
        type: data.formation?.type || 'single',
        satelliteCount: typeof data.formation?.satelliteCount === 'number' ? data.formation.satelliteCount : 0,
        spreadAngle: Number(data.formation?.spreadAngle),
      },
      impact: {
        sparkType: data.impact?.sparkType || 'fire_ember',
        sparkCount: Number(data.impact?.sparkCount) || 16,
        sparkColorHex: Number(data.impact?.sparkColorHex) || 0xfbbf24,
        sparkColorCss: data.impact?.sparkColorCss || '#fbbf24',
        shockwaveRadius: Number(data.impact?.shockwaveRadius) || 24,
        shockwaveColorHex: Number(data.impact?.shockwaveColorHex) || 0xef4444,
        shockwaveColorCss: data.impact?.shockwaveColorCss || '#ef4444',
        hasDoubleRing: Boolean(data.impact?.hasDoubleRing),
      }
    }

    return { success: true, data: normalized }
  } catch (e: any) {
    return { success: false, error: e.message || 'JSON formati xato' }
  }
}

/**
 * Creates clean portable JSON string for export/clipboard
 */
export function serializeProjectileToClipboard(def: ProjectileDefinition): string {
  return JSON.stringify(def, null, 2)
}
