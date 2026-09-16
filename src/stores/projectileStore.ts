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
  sparkType: SparkParticleType
  sparkCount: number
  shockwaveRadius: number
  hasDoubleRing: boolean
}

const STORAGE_KEY = 'defensor_custom_projectiles'
const BASE_JSON_URL = 'projectiles.json'

export const useProjectileStore = defineStore('projectile', () => {
  const baseProjectiles = ref<ProjectileConfig[]>([])
  const customProjectiles = ref<ProjectileConfig[]>([])
  const isLoaded = ref(false)

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

    isLoaded.value = true
  }

  function saveCustomProjectiles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customProjectiles.value))
    } catch {
      // Ignore
    }
  }

  const allProjectiles = computed<ProjectileConfig[]>(() => {
    const customIds = new Set(customProjectiles.value.map(p => p.id))
    const filteredBase = baseProjectiles.value.filter(p => !customIds.has(p.id))
    return [...filteredBase, ...customProjectiles.value]
  })

  function getProjectile(id: string): ProjectileConfig | undefined {
    return allProjectiles.value.find(p => p.id === id) || baseProjectiles.value[0]
  }

  function addCustomProjectile(proj: Omit<ProjectileConfig, 'isCustom'>): ProjectileConfig {
    const newProj: ProjectileConfig = {
      ...proj,
      id: proj.id.startsWith('custom_') ? proj.id : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
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
      // remove from base list view
      baseProjectiles.value.splice(bIdx, 1)
      saveCustomProjectiles()
      return true
    }

    return false
  }

  function deleteProjectile(id: string): boolean {
    const cIdx = customProjectiles.value.findIndex(p => p.id === id)
    if (cIdx !== -1) {
      customProjectiles.value.splice(cIdx, 1)
      saveCustomProjectiles()
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
    localStorage.removeItem(STORAGE_KEY)
    loadProjectiles()
  }

  // Auto-init
  loadProjectiles()

  return {
    baseProjectiles,
    customProjectiles,
    allProjectiles,
    isLoaded,
    loadProjectiles,
    getProjectile,
    addCustomProjectile,
    updateProjectile,
    deleteProjectile,
    duplicateProjectile,
    exportProjectilesJson,
    importProjectilesFromJson,
    resetToDefaults,
  }
})
