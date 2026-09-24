import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  ProjectileDefinition,
  ProjectileCategory,
} from '../types/projectile'
import {
  BASE_PROJECTILE_DEFINITIONS,
  registerCustomProjectiles,
  getProjectileDefinition,
  getAllProjectilesUnified,
  parseProjectileJson,
  serializeProjectileToClipboard,
} from '../utils/projectileCatalog'

export const useProjectileStore = defineStore('projectile', () => {
  const sessionProjectiles = ref<ProjectileDefinition[]>(
    JSON.parse(JSON.stringify(BASE_PROJECTILE_DEFINITIONS))
  )

  const isLoaded = ref(true)

  const allProjectiles = computed<ProjectileDefinition[]>(() => {
    return sessionProjectiles.value
  })

  const customProjectiles = computed(() =>
    sessionProjectiles.value.filter(p => p.identity.isCustom || p.identity.category === 'custom')
  )

  function getProjectile(id: string): ProjectileDefinition {
    return (
      sessionProjectiles.value.find(p => p.identity.id === id) ||
      getProjectileDefinition(id) ||
      sessionProjectiles.value[0]
    )
  }

  function createBlankProjectile(category: ProjectileCategory = 'fire'): ProjectileDefinition {
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const blank: ProjectileDefinition = {
      identity: {
        id,
        name: 'New Custom Projectile',
        nameUz: 'Yangi Maxsus Snaryad',
        category,
        description: 'Yangi maxsus snaryad konfiguratsiyasi',
        version: 1,
        isCustom: true,
      },
      movement: {
        speed: 12,
        hasArc: false,
        isLaser: false,
        isInstant: false,
      },
      visual: {
        shape: 'circle',
        size: 10,
        length: 24,
        points: 4,
        colorHex: 0xf97316,
        colorCss: '#f97316',
        glowColorHex: 0xfbbf24,
        glowColorCss: '#fbbf24',
        coreColorHex: 0xffffff,
        coreColorCss: '#ffffff',
        alpha: 1.0,
        scale: 1.0,
      },
      trail: {
        style: 'solid_line',
        colorHex: 0xfbbf24,
        colorCss: '#fbbf24',
        alpha: 0.7,
        length: 8,
        width: 4,
      },
      formation: {
        type: 'single',
        satelliteCount: 0,
      },
      impact: {
        sparkType: 'fire_ember',
        sparkCount: 16,
        sparkColorHex: 0xfbbf24,
        sparkColorCss: '#fbbf24',
        shockwaveRadius: 24,
        shockwaveColorHex: 0xef4444,
        shockwaveColorCss: '#ef4444',
        hasDoubleRing: true,
      },
    }

    sessionProjectiles.value.unshift(blank)
    registerCustomProjectiles(sessionProjectiles.value)
    return blank
  }

  function updateProjectile(id: string, updates: Partial<ProjectileDefinition>): boolean {
    const idx = sessionProjectiles.value.findIndex(p => p.identity.id === id)
    if (idx !== -1) {
      sessionProjectiles.value[idx] = {
        ...sessionProjectiles.value[idx],
        ...updates,
        identity: {
          ...sessionProjectiles.value[idx].identity,
          ...(updates.identity || {}),
        },
        movement: {
          ...sessionProjectiles.value[idx].movement,
          ...(updates.movement || {}),
        },
        visual: {
          ...sessionProjectiles.value[idx].visual,
          ...(updates.visual || {}),
        },
        trail: {
          ...sessionProjectiles.value[idx].trail,
          ...(updates.trail || {}),
        },
        formation: {
          ...sessionProjectiles.value[idx].formation,
          ...(updates.formation || {}),
        },
        impact: {
          ...sessionProjectiles.value[idx].impact,
          ...(updates.impact || {}),
        },
      }
      registerCustomProjectiles(sessionProjectiles.value)
      return true
    }
    return false
  }

  function deleteProjectile(id: string): boolean {
    const idx = sessionProjectiles.value.findIndex(p => p.identity.id === id)
    if (idx !== -1) {
      sessionProjectiles.value.splice(idx, 1)
      registerCustomProjectiles(sessionProjectiles.value)
      return true
    }
    return false
  }

  function duplicateProjectile(id: string): ProjectileDefinition | null {
    const src = getProjectile(id)
    if (!src) return null

    const cloned: ProjectileDefinition = JSON.parse(JSON.stringify(src))
    cloned.identity.id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    cloned.identity.name = `${src.identity.name} (Copy)`
    cloned.identity.nameUz = `${src.identity.nameUz || src.identity.name} (Nusxa)`
    cloned.identity.isCustom = true

    sessionProjectiles.value.unshift(cloned)
    registerCustomProjectiles(sessionProjectiles.value)
    return cloned
  }

  /**
   * Copies self-contained ProjectileDefinition to OS Clipboard as JSON
   */
  async function copyProjectileJsonToClipboard(id: string): Promise<boolean> {
    const proj = getProjectile(id)
    if (!proj) return false
    try {
      const jsonStr = serializeProjectileToClipboard(proj)
      await navigator.clipboard.writeText(jsonStr)
      return true
    } catch {
      return false
    }
  }

  /**
   * Reads OS Clipboard JSON, validates, and registers as a new ProjectileDefinition
   */
  async function pasteProjectileJsonFromClipboard(): Promise<{ success: boolean; data?: ProjectileDefinition; error?: string }> {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return { success: false, error: 'Klipbord bo\'sh' }
      return importProjectileFromJson(text)
    } catch (e: any) {
      return { success: false, error: e.message || 'Klipborddan o\'qib bo\'lmadi' }
    }
  }

  /**
   * Imports a ProjectileDefinition from JSON string
   */
  function importProjectileFromJson(jsonStr: string): { success: boolean; data?: ProjectileDefinition; error?: string } {
    const res = parseProjectileJson(jsonStr)
    if (!res.success || !res.data) {
      return { success: false, error: res.error }
    }

    const item = res.data
    const existingIdx = sessionProjectiles.value.findIndex(p => p.identity.id === item.identity.id)
    if (existingIdx >= 0) {
      sessionProjectiles.value[existingIdx] = item
    } else {
      sessionProjectiles.value.unshift(item)
    }

    registerCustomProjectiles(sessionProjectiles.value)
    return { success: true, data: item }
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
    sessionProjectiles.value = JSON.parse(JSON.stringify(BASE_PROJECTILE_DEFINITIONS))
    registerCustomProjectiles(sessionProjectiles.value)
  }

  // Initial runtime registration
  registerCustomProjectiles(sessionProjectiles.value)

  return {
    allProjectiles,
    customProjectiles,
    isLoaded,
    getProjectile,
    createBlankProjectile,
    updateProjectile,
    deleteProjectile,
    duplicateProjectile,
    copyProjectileJsonToClipboard,
    pasteProjectileJsonFromClipboard,
    importProjectileFromJson,
    exportProjectilesJson,
    resetToDefaults,
  }
})
