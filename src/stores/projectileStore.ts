import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
  | 'arrow'
  | 'diamond_shard'
  | 'star'
  | 'sawblade'
  | 'skull'
  | 'greatsword'
  | 'hammer'
  | 'boulder'
  | 'feather'
  | 'spear_lance'
  | 'flame_wisp'
  | 'lightning_bolt'
  | 'shuriken'
  | 'energy_orb'
  | 'energy_wave'

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

import { BASE_PROJECTILE_CATALOG } from '../utils/projectileCatalog'

const STORAGE_KEY = 'defensor_custom_projectiles'
const BASE_JSON_URL = 'projectiles.json'

export const useProjectileStore = defineStore('projectile', () => {
  const baseProjectiles = ref<ProjectileConfig[]>([...BASE_PROJECTILE_CATALOG] as any)
  const customProjectiles = ref<ProjectileConfig[]>([])
  const isLoaded = ref(false)

  const deletedBaseIds = ref<string[]>([])
  const DELETED_STORAGE_KEY = 'defensor_deleted_projectile_ids'

  // Initialize from bundled fallback or public JSON
  async function loadProjectiles() {
    try {
      const resp = await fetch(BASE_JSON_URL)
      if (resp.ok) {
        const data = await resp.json()
        if (Array.isArray(data) && data.length > 0) {
          baseProjectiles.value = data
        }
      }
    } catch {
      // Fetch fallback handled by embedded defaults if offline
    }

    // Load custom projectiles from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          customProjectiles.value = parsed
        }
      }
    } catch {
      // Ignore
    }

    // Load deleted projectile IDs
    try {
      const delSaved = localStorage.getItem(DELETED_STORAGE_KEY)
      if (delSaved) {
        const parsedDel = JSON.parse(delSaved)
        if (Array.isArray(parsedDel)) {
          deletedBaseIds.value = parsedDel
        }
      }
    } catch {
      // Ignore
    }

    isLoaded.value = true
  }

  function saveCustomProjectiles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customProjectiles.value))
      localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(deletedBaseIds.value))
    } catch {
      // Ignore
    }
  }

  const allProjectiles = computed<ProjectileConfig[]>(() => {
    const deletedSet = new Set(deletedBaseIds.value)
    const customIds = new Set(customProjectiles.value.map(p => p.id))
    const filteredBase = baseProjectiles.value.filter(p => !customIds.has(p.id) && !deletedSet.has(p.id))
    const res = [...filteredBase, ...customProjectiles.value.filter(p => !deletedSet.has(p.id))]
    if (res.length === 0) {
      return [...BASE_PROJECTILE_CATALOG] as any
    }
    return res
  })

  function getProjectile(id: string): ProjectileConfig | undefined {
    return allProjectiles.value.find(p => p.id === id) || allProjectiles.value[0] || (BASE_PROJECTILE_CATALOG[0] as any)
  }

  function createBlankProjectile(category: ProjectileCategory = 'fire'): ProjectileConfig {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const blank: ProjectileConfig = {
      id,
      name: 'Custom Fireball',
      nameUz: 'Maxsus Olovcha',
      category,
      description: 'Yangi toza maxsus snaryad',
      isCustom: true,
      formation: 'single',
      shape: 'circle',
      size: 6,
      length: 24,
      points: 4,
      satelliteCount: 0,
      hasArc: false,
      isLaser: false,
      colorHex: 0xf97316,
      colorCss: '#f97316',
      trailColorHex: 0xfbbf24,
      trailColorCss: '#fbbf24',
      sparkColorHex: 0xfef08a,
      sparkColorCss: '#fef08a',
      shockwaveColorHex: 0xf97316,
      shockwaveColorCss: '#f97316',
      trailAlpha: 0.7,
      trailLength: 8,
      trailWidth: 4,
      trailStyle: 'solid_line',
      sparkType: 'fire_ember',
      sparkCount: 16,
      shockwaveRadius: 22,
      hasDoubleRing: false,
    }
    customProjectiles.value.push(blank)
    saveCustomProjectiles()
    return blank
  }

  function addCustomProjectile(proj: Omit<ProjectileConfig, 'isCustom'>): ProjectileConfig {
    const newProj: ProjectileConfig = {
      ...proj,
      id: proj.id.startsWith('custom_') ? proj.id : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
      satelliteCount: proj.satelliteCount ?? 0,
    }
    customProjectiles.value.push(newProj)
    saveCustomProjectiles()
    return newProj
  }

  function updateProjectile(id: string, updates: Partial<ProjectileConfig>): boolean {
    // Check if custom
    const cIdx = customProjectiles.value.findIndex(p => p.id === id)
    if (cIdx !== -1) {
      customProjectiles.value[cIdx] = { ...customProjectiles.value[cIdx], ...updates }
      saveCustomProjectiles()
      return true
    }

    // If modifying a base projectile, clone it into custom with same ID to override
    const bIdx = baseProjectiles.value.findIndex(p => p.id === id)
    if (bIdx !== -1) {
      const existing = baseProjectiles.value[bIdx]
      const overridden: ProjectileConfig = {
        ...existing,
        ...updates,
        isCustom: true,
      }
      customProjectiles.value.push(overridden)
      baseProjectiles.value.splice(bIdx, 1)
      saveCustomProjectiles()
      return true
    }

    return false
  }

  function deleteProjectile(id: string): boolean {
    // If in custom
    const cIdx = customProjectiles.value.findIndex(p => p.id === id)
    if (cIdx !== -1) {
      customProjectiles.value.splice(cIdx, 1)
    }

    // Track as deleted so base doesn't reappear
    if (!deletedBaseIds.value.includes(id)) {
      deletedBaseIds.value.push(id)
    }

    saveCustomProjectiles()
    return true
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

    customProjectiles.value.push(cloned)
    saveCustomProjectiles()
    return cloned
  }

  function exportProjectilesJson(): void {
    const jsonStr = JSON.stringify(allProjectiles.value, null, 2)
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

  function importProjectilesFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString)
      if (!Array.isArray(parsed)) {
        return { success: false, count: 0, error: 'JSON massiv formatida emas.' }
      }

      let imported = 0
      for (const item of parsed) {
        if (!item.id || !item.name) continue

        // Check if exists
        const existingCustom = customProjectiles.value.findIndex(p => p.id === item.id)
        if (existingCustom !== -1) {
          customProjectiles.value[existingCustom] = { ...item, isCustom: true }
        } else {
          customProjectiles.value.push({ ...item, isCustom: true })
        }
        imported++
      }

      saveCustomProjectiles()
      return { success: true, count: imported }
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'JSON faylni o\'qishda xatolik.' }
    }
  }

  function resetToDefaults() {
    customProjectiles.value = []
    deletedBaseIds.value = []
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(DELETED_STORAGE_KEY)
    loadProjectiles()
  }

  // Auto-init
  loadProjectiles()

  return {
    baseProjectiles,
    customProjectiles,
    deletedBaseIds,
    allProjectiles,
    isLoaded,
    loadProjectiles,
    getProjectile,
    createBlankProjectile,
    addCustomProjectile,
    updateProjectile,
    deleteProjectile,
    duplicateProjectile,
    exportProjectilesJson,
    importProjectilesFromJson,
    resetToDefaults,
  }
})
