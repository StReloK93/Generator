import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectileDefinition } from '../types/projectile'
import {
  cloneProjectile,
  getProjectile,
  listCustomProjectiles,
  listPresetProjectiles,
  newProjectileId,
  normalizeProjectile,
  onProjectilesChanged,
  registerCustomProjectiles,
  removeCustomProjectile,
} from '../domain/projectile'

/**
 * Reactive view of the projectile registry for the UI, plus the studio's saving and sharing.
 * The registry (domain/projectile) owns the definitions (services/projectileLibrary keeps them in the browser).
 */
export const useProjectileStore = defineStore('projectile', () => {
  const revision = ref(0)
  onProjectilesChanged(() => revision.value++)

  const presets = listPresetProjectiles()
  const customProjectiles = computed(() => {
    void revision.value
    return listCustomProjectiles()
  })

  function get(id: string | null | undefined): ProjectileDefinition {
    void revision.value
    return getProjectile(id)
  }

  /** Saves a player projectile (adds it or replaces the one with its id) */
  function save(def: ProjectileDefinition): ProjectileDefinition {
    return registerCustomProjectiles([{ ...cloneProjectile(def), isCustom: true }])[0] ?? def
  }

  /** A player-owned copy of any projectile (presets are read-only) */
  function fork(def: ProjectileDefinition, name = def.name): ProjectileDefinition {
    return save({ ...cloneProjectile(def), id: newProjectileId(), name, isCustom: true })
  }

  function remove(id: string): boolean {
    return removeCustomProjectile(id)
  }

  /** Accepts one projectile or a list as JSON (any version); returns how many were added */
  function importJson(text: string): ProjectileDefinition[] {
    const data = JSON.parse(text)
    const list: unknown[] = Array.isArray(data) ? data : [data?.data ?? data]
    const accepted = list.map(normalizeProjectile).filter((d): d is ProjectileDefinition => d !== null)
    // Imported presets become player copies instead of being dropped
    return registerCustomProjectiles(accepted.map(d => (presets.some(p => p.id === d.id) ? { ...d, id: newProjectileId() } : d)))
  }

  function exportJson(defs: ProjectileDefinition[]): string {
    return JSON.stringify(defs.length === 1 ? defs[0] : defs, null, 2)
  }

  return {
    presets,
    customProjectiles,
    get,
    save,
    fork,
    remove,
    importJson,
    exportJson,
  }
})
