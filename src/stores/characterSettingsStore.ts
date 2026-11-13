import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import bundledSettings from '../assets/characters/settings.json'
import { API_URL } from '../services/serverUrl'
import { useAdminStore } from './adminStore'

/** A character's own settings: the same on every map, whatever wave it runs in */
export interface CharacterSettings {
  /** Run animation playback multiplier (the steps also follow how fast the unit moves) */
  animSpeed: number
}
type CharacterSettingsMap = Record<string, CharacterSettings>

export const MIN_ANIM_SPEED = 0.2
export const MAX_ANIM_SPEED = 4

/** A plain copy of the settings (they are plain JSON; a reactive proxy, nested ones too, cannot be structured-cloned) */
const copyOf = (settings: CharacterSettingsMap): CharacterSettingsMap => JSON.parse(JSON.stringify(settings))

export type CharacterSettingsError = '' | 'login' | 'changed' | 'saving-off' | 'failed'
const errorOf = (status: number): CharacterSettingsError =>
  status === 401 ? 'login' : status === 409 ? 'changed' : status === 403 ? 'saving-off' : 'failed'

/**
 * The characters' settings (src/assets/characters/settings.json, served by server/characters.js). The game reads a
 * unit's run animation speed from here by its model; the editor changes them and the signed-in admin saves them.
 * Until the server answers (or without one) the settings bundled with the app are used.
 */
export const useCharacterSettingsStore = defineStore('characterSettings', () => {
  const admin = useAdminStore()
  const settings = ref<CharacterSettingsMap>(structuredClone(bundledSettings))
  /** As last loaded or saved: what the edits are compared with */
  const saved = ref<CharacterSettingsMap>(structuredClone(bundledSettings))
  const version = ref('')
  const canSave = ref(false)
  const loginRequired = ref(false)
  const isBusy = ref(false)
  const error = ref<CharacterSettingsError>('')

  /** The server takes changes from this browser (its admin is signed in, or it has no admin account) */
  const canWrite = computed(() => canSave.value && (!loginRequired.value || admin.isAdmin))
  /** Changes wait for the admin to sign in */
  const needsLogin = computed(() => canSave.value && loginRequired.value && !admin.isAdmin)
  const isDirty = computed(() => JSON.stringify(settings.value) !== JSON.stringify(saved.value))

  function animSpeedOf(model: string): number {
    return settings.value[model]?.animSpeed ?? 1
  }

  function setAnimSpeed(model: string, speed: number): void {
    const animSpeed = Math.round(Math.min(MAX_ANIM_SPEED, Math.max(MIN_ANIM_SPEED, speed)) * 10) / 10
    settings.value = { ...settings.value, [model]: { ...settings.value[model], animSpeed } }
  }

  async function load(): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/characters`, { headers: admin.authHeaders() })
      if (!res.ok) return
      const reply = await res.json() as { canSave: boolean; needsLogin: boolean; version: string; settings: CharacterSettingsMap }
      settings.value = { ...settings.value, ...reply.settings }
      saved.value = copyOf(settings.value)
      version.value = reply.version
      canSave.value = reply.canSave
      loginRequired.value = reply.needsLogin
    } catch {
      // No server (an offline build): the bundled settings stay
    }
  }

  /** Writes the settings into their file. `overwrite`: even if someone saved them in between. */
  async function save(overwrite = false): Promise<boolean> {
    if (!canWrite.value || isBusy.value) return false
    isBusy.value = true
    error.value = ''
    try {
      const res = await fetch(`${API_URL}/characters`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...admin.authHeaders(), ...(overwrite ? {} : { 'If-Match': version.value }) },
        body: JSON.stringify(settings.value),
      })
      const reply = await res.json().catch(() => ({}))
      if (!res.ok) {
        error.value = errorOf(res.status)
        if (res.status === 401) admin.expired()
        return false
      }
      version.value = reply.version
      saved.value = copyOf(settings.value)
      return true
    } catch {
      error.value = 'failed'
      return false
    } finally {
      isBusy.value = false
    }
  }

  function discard(): void {
    settings.value = copyOf(saved.value)
    error.value = ''
  }

  return { settings, isDirty, canWrite, needsLogin, isBusy, error, animSpeedOf, setAnimSpeed, load, save, discard }
})
