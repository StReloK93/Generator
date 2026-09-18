import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { BASE_PROJECTILE_CATALOG, registerCustomProjectiles } from '../utils/projectileCatalog'

export type ProjectileCategory = 
  | 'fire' 
  | 'frost' 
  | 'electro' 
  | 'poison' 
  | 'arcane' 
  | 'void' 
  | 'siege' 
  | 'holy'
  | 'custom'

export type ProjectileFormation =
  | 'single'
  | 'volley_3'
  | 'volley_5'
  | 'twin_helix'
  | 'satellites'
  | 'laser_beam'

export type TrailStyle = 'particles' | 'solid_line' | 'glow_streak' | 'none'

export type ProjectileShape =
  | 'circle'
  | 'sand_cluster'
  | 'line_streak'
  | 'energy_orb'
  | 'energy_wave'
  | 'flame_wisp'
  | 'diamond_shard'
  | 'star'
  | 'instant_strike'
  | 'arrow'
  | 'spear_lance'
  | 'lightning_bolt'
  | 'shuriken'
  | 'sawblade'
  | 'skull'
  | 'greatsword'
  | 'hammer'
  | 'boulder'
  | 'feather'

export type SparkParticleType =
  | 'fire_ember'
  | 'ice_shard'
  | 'snowflake'
  | 'lightning_arc'
  | 'acid_drop'
  | 'arcane_star'
  | 'void_blood'
  | 'shrapnel'
  | 'holy_cross'
  | 'sand_dust'
  | 'spark_line'
  | 'default'

export interface ProjectileConfig {
  id: string
  name: string
  nameUz: string
  category: ProjectileCategory
  description: string
  isCustom?: boolean
  formation: ProjectileFormation
  shape: ProjectileShape
  size: number
  length?: number
  points?: number
  satelliteCount?: number
  hasArc: boolean
  isLaser: boolean
  isInstant?: boolean
  instantType?: 'sky_strike' | 'ground_burst' | 'unit_aura'
  colorHex: number
  colorCss: string
  trailColorHex: number
  trailColorCss: string
  sparkColorHex: number
  sparkColorCss: string
  shockwaveColorHex: number
  shockwaveColorCss: string
  trailAlpha: number
  trailLength: number
  trailWidth: number
  trailStyle?: TrailStyle
  sparkType: SparkParticleType
  sparkCount: number
  shockwaveRadius: number
  hasDoubleRing: boolean
}

export const useProjectileStore = defineStore('projectile', () => {
  const sessionProjectiles = ref<ProjectileConfig[]>(
    BASE_PROJECTILE_CATALOG.map(p => ({
      id: p.id,
      name: p.name,
      nameUz: p.nameUz,
      category: p.category,
      description: p.description,
      isCustom: Boolean(p.isCustom),
      formation: p.formation || 'single',
      shape: p.shape || 'circle',
      size: p.size ?? 10,
      length: p.length ?? 24,
      points: p.points ?? 4,
      satelliteCount: p.satelliteCount ?? 0,
      hasArc: p.hasArc,
      isLaser: p.isLaser,
      isInstant: p.isInstant,
      instantType: p.instantType || 'sky_strike',
      colorHex: p.colorHex,
      colorCss: p.colorCss,
      trailColorHex: p.trailColorHex,
      trailColorCss: p.trailColorCss,
      sparkColorHex: p.sparkColorHex,
      sparkColorCss: p.sparkColorCss,
      shockwaveColorHex: p.shockwaveColorHex,
      shockwaveColorCss: p.shockwaveColorCss,
      trailAlpha: p.trailAlpha,
      trailLength: p.trailLength ?? 8,
      trailWidth: p.trailWidth ?? 4,
      trailStyle: p.trailStyle || 'solid_line',
      sparkType: p.sparkType || 'fire_ember',
      sparkCount: p.sparkCount ?? 16,
      shockwaveRadius: p.shockwaveRadius ?? 24,
      hasDoubleRing: Boolean(p.hasDoubleRing)
    }))
  )

  const isLoaded = ref(true)

  const allProjectiles = computed<ProjectileConfig[]>(() => {
    return sessionProjectiles.value
  })

  function getProjectile(id: string): ProjectileConfig | undefined {
    return sessionProjectiles.value.find(p => p.id === id) || sessionProjectiles.value[0]
  }

  function createBlankProjectile(category: ProjectileCategory = 'fire'): ProjectileConfig {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const blank: ProjectileConfig = {
      id,
      name: 'New Custom Projectile',
      nameUz: 'Yangi Maxsus Snaryad',
      category,
      description: 'Yangi maxsus snaryad konfiguratsiyasi',
      isCustom: true,
      formation: 'single',
      shape: 'circle',
      size: 8,
      length: 24,
      points: 4,
      satelliteCount: 0,
      hasArc: false,
      isLaser: false,
      isInstant: false,
      instantType: 'sky_strike',
      colorHex: 0xf97316,
      colorCss: '#f97316',
      trailColorHex: 0xfbbf24,
      trailColorCss: '#fbbf24',
      sparkColorHex: 0xfef08a,
      sparkColorCss: '#fef08a',
      shockwaveColorHex: 0xef4444,
      shockwaveColorCss: '#ef4444',
      trailAlpha: 0.7,
      trailLength: 8,
      trailWidth: 4,
      trailStyle: 'solid_line',
      sparkType: 'fire_ember',
      sparkCount: 16,
      shockwaveRadius: 24,
      hasDoubleRing: true,
    }
    sessionProjectiles.value.unshift(blank)
    registerCustomProjectiles(sessionProjectiles.value)
    return blank
  }

  function updateProjectile(id: string, updates: Partial<ProjectileConfig>): boolean {
    const idx = sessionProjectiles.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      sessionProjectiles.value[idx] = { ...sessionProjectiles.value[idx], ...updates }
      registerCustomProjectiles(sessionProjectiles.value)
      return true
    }
    return false
  }

  function deleteProjectile(id: string): boolean {
    const idx = sessionProjectiles.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      sessionProjectiles.value.splice(idx, 1)
      registerCustomProjectiles(sessionProjectiles.value)
      return true
    }
    return false
  }

  function duplicateProjectile(id: string): ProjectileConfig | null {
    const src = getProjectile(id)
    if (!src) return null

    const cloned: ProjectileConfig = {
      ...JSON.parse(JSON.stringify(src)),
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${src.name} (Copy)`,
      nameUz: `${src.nameUz} (Nusxa)`,
      isCustom: true,
    }

    sessionProjectiles.value.unshift(cloned)
    registerCustomProjectiles(sessionProjectiles.value)
    return cloned
  }

  function exportProjectilesJson(): void {
    const jsonStr = JSON.stringify(sessionProjectiles.value, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projectiles_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function resetToDefaults() {
    sessionProjectiles.value = BASE_PROJECTILE_CATALOG.map(p => ({
      id: p.id,
      name: p.name,
      nameUz: p.nameUz,
      category: p.category,
      description: p.description,
      isCustom: Boolean(p.isCustom),
      formation: p.formation || 'single',
      shape: p.shape || 'circle',
      size: p.size ?? 10,
      length: p.length ?? 24,
      points: p.points ?? 4,
      satelliteCount: p.satelliteCount ?? 0,
      hasArc: p.hasArc,
      isLaser: p.isLaser,
      isInstant: p.isInstant,
      instantType: p.instantType || 'sky_strike',
      colorHex: p.colorHex,
      colorCss: p.colorCss,
      trailColorHex: p.trailColorHex,
      trailColorCss: p.trailColorCss,
      sparkColorHex: p.sparkColorHex,
      sparkColorCss: p.sparkColorCss,
      shockwaveColorHex: p.shockwaveColorHex,
      shockwaveColorCss: p.shockwaveColorCss,
      trailAlpha: p.trailAlpha,
      trailLength: p.trailLength ?? 8,
      trailWidth: p.trailWidth ?? 4,
      trailStyle: p.trailStyle || 'solid_line',
      sparkType: p.sparkType || 'fire_ember',
      sparkCount: p.sparkCount ?? 16,
      shockwaveRadius: p.shockwaveRadius ?? 24,
      hasDoubleRing: Boolean(p.hasDoubleRing)
    }))
    registerCustomProjectiles(sessionProjectiles.value)
  }

  // Register in catalog runtime initially
  registerCustomProjectiles(sessionProjectiles.value)

  const customProjectiles = computed(() => sessionProjectiles.value.filter(p => p.isCustom || p.category === 'custom'))

  function importProjectilesFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr)
      const list: ProjectileConfig[] = Array.isArray(parsed) ? parsed : [parsed]
      if (list.length === 0) return { success: false, count: 0, error: 'Hech qanday snaryad topilmadi' }
      for (const item of list) {
        if (!item.id || !item.name) continue
        const idx = sessionProjectiles.value.findIndex(p => p.id === item.id)
        if (idx >= 0) {
          sessionProjectiles.value[idx] = { ...sessionProjectiles.value[idx], ...item }
        } else {
          sessionProjectiles.value.unshift(item)
        }
      }
      registerCustomProjectiles(sessionProjectiles.value)
      return { success: true, count: list.length }
    } catch (e: any) {
      return { success: false, count: 0, error: e.message }
    }
  }

  return {
    allProjectiles,
    customProjectiles,
    isLoaded,
    getProjectile,
    createBlankProjectile,
    updateProjectile,
    deleteProjectile,
    duplicateProjectile,
    exportProjectilesJson,
    importProjectilesFromJson,
    resetToDefaults,
  }
})
