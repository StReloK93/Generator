import { listCustomProjectiles, onProjectilesChanged, registerCustomProjectiles } from '../domain/projectile'

/** The player's own projectiles, kept in this browser (maps also carry the ones their towers use) */
const LIBRARY_KEY = 'defensor_projectiles_v2'

/** Loads the saved projectiles into the registry and keeps the browser copy up to date (once, at app start) */
export function loadProjectileLibrary(): void {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (Array.isArray(list)) registerCustomProjectiles(list)
  } catch {
    // Unreadable storage: start with the built-in library only
  }
  onProjectilesChanged(() => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(listCustomProjectiles()))
    } catch {
      // Storage full or blocked: the projectiles still live for this session and in exported maps
    }
  })
}
