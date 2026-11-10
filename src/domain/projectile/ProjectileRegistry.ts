import type { ProjectileDefinition } from '../../types/projectile'
import { normalizeProjectile } from './ProjectileModel'
import { DEFAULT_PROJECTILE_ID, LEGACY_PRESET_IDS, PRESET_PROJECTILES } from './ProjectilePresets'

/**
 * Single owner of every projectile the game knows: the built-in library and the player's own ones
 * (from the projectile studio, saved maps and multiplayer rooms). Combat, rendering and the UI all read here.
 */
const presets = new Map(PRESET_PROJECTILES.map(p => [p.id, p]))
const customs = new Map<string, ProjectileDefinition>()
const listeners = new Set<() => void>()

function changed(): void {
  for (const listener of listeners) listener()
}

/** Called whenever the custom projectiles change (the Pinia store mirrors them for the UI) */
export function onProjectilesChanged(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getProjectile(id: string | null | undefined): ProjectileDefinition {
  const key = id ?? DEFAULT_PROJECTILE_ID
  return customs.get(key) ?? presets.get(key) ?? presets.get(LEGACY_PRESET_IDS[key] ?? '') ?? presets.get(DEFAULT_PROJECTILE_ID)!
}

export function hasProjectile(id: string): boolean {
  return customs.has(id) || presets.has(id) || id in LEGACY_PRESET_IDS
}

export function listPresetProjectiles(): readonly ProjectileDefinition[] {
  return PRESET_PROJECTILES
}

export function listCustomProjectiles(): ProjectileDefinition[] {
  return [...customs.values()]
}

/** Adds or replaces player projectiles (any stored format); returns the ones accepted */
export function registerCustomProjectiles(list: unknown[]): ProjectileDefinition[] {
  const accepted: ProjectileDefinition[] = []
  for (const raw of list) {
    const def = normalizeProjectile(raw)
    if (!def || presets.has(def.id)) continue
    def.isCustom = true
    customs.set(def.id, def)
    accepted.push(def)
  }
  if (accepted.length > 0) changed()
  return accepted
}

export function removeCustomProjectile(id: string): boolean {
  const removed = customs.delete(id)
  if (removed) changed()
  return removed
}

/** The player projectiles among these ids (a map stores the ones its towers use, so it plays the same anywhere) */
export function customProjectilesUsedBy(ids: Iterable<string | null | undefined>): ProjectileDefinition[] {
  const used = new Map<string, ProjectileDefinition>()
  for (const id of ids) {
    const def = id ? customs.get(id) : undefined
    if (def) used.set(def.id, def)
  }
  return [...used.values()]
}
