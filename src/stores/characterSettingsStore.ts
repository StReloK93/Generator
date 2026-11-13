import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import bundledSettings from '../assets/characters/settings.json'
import { API_URL } from '../services/serverUrl'
import { useAdminStore } from './adminStore'

/** A character's own settings: the same on every map, whatever wave it runs in */
export interface CharacterSettings {
  /** Run animation playback multiplier (the steps also follow how fast the unit moves) */
  animSpeed: number
  /** The character's size: a wave's own scale multiplies this (a wave at 1 shows the character at exactly this) */
  scale: number
  /** Where the sprite sits on its cell, in screen pixels: right (+) / left (-), up (+) / down (-) */
  offsetX: number
  offsetY: number
}
export type CharacterSettingKey = keyof CharacterSettings
type CharacterSettingsMap = Record<string, CharacterSettings>

/** Each setting's range, step and value when a character has none (the server keeps the same: server/characters.js) */
export const CHARACTER_SETTING_LIMITS: Record<CharacterSettingKey, { min: number; max: number; step: number; fallback: number }> = {
  animSpeed: { min: 0.2, max: 4, step: 0.1, fallback: 1 },
  scale: { min: 0.3, max: 3, step: 0.05, fallback: 1 },
  offsetX: { min: -100, max: 100, step: 1, fallback: 0 },
  offsetY: { min: -100, max: 100, step: 1, fallback: 0 },
}

/** A plain copy of the settings (they are plain JSON; a reactive proxy, nested ones too, cannot be structured-cloned) */
const copyOf = (settings: Record<string, Partial<CharacterSettings>>): CharacterSettingsMap => JSON.parse(JSON.stringify(settings))

export type CharacterSettingsError = '' | 'login' | 'changed' | 'saving-off' | 'failed'
const errorOf = (status: number): CharacterSettingsError =>
  status === 401 ? 'login' : status === 409 ? 'changed' : status === 403 ? 'saving-off' : 'failed'

/**
 * The characters' settings (src/assets/characters/settings.json, served by server/characters.js), set on the Characters
 * page. The game reads a unit's run animation speed, size and placement from here by its model; the signed-in admin
 * saves them. Until the server answers (or without one) the settings bundled with the app are used.
 */
export const useCharacterSettingsStore = defineStore('characterSettings', () => {
  const admin = useAdminStore()
  const settings = ref<CharacterSettingsMap>(copyOf(bundledSettings))
  /** As last loaded or saved: what the edits are compared with */
  const saved = ref<CharacterSettingsMap>(copyOf(bundledSettings))
  const version = ref('')
  const canSave = ref(false)
  const isBusy = ref(false)
  const error = ref<CharacterSettingsError>('')

  /** The server takes changes from this browser: only from the signed-in admin (the Characters page is theirs alone) */
  const canWrite = computed(() => canSave.value && admin.isAdmin)
  const isDirty = computed(() => JSON.stringify(settings.value) !== JSON.stringify(saved.value))

  /** One setting of a character (the fallback when it has none) */
  function valueOf(model: string | undefined, key: CharacterSettingKey): number {
    return settings.value[String(model || 'male').toLowerCase()]?.[key] ?? CHARACTER_SETTING_LIMITS[key].fallback
  }
  const animSpeedOf = (model: string | undefined) => valueOf(model, 'animSpeed')
  const scaleOf = (model: string | undefined) => valueOf(model, 'scale')
  const offsetOf = (model: string | undefined) => ({ x: valueOf(model, 'offsetX'), y: valueOf(model, 'offsetY') })

  function setValue(model: string, key: CharacterSettingKey, value: number): void {
    const { min, max, step } = CHARACTER_SETTING_LIMITS[key]
    const clamped = Math.round(Math.min(max, Math.max(min, value)) / step) * step
    const current: CharacterSettings = {
      animSpeed: valueOf(model, 'animSpeed'),
      scale: valueOf(model, 'scale'),
      offsetX: valueOf(model, 'offsetX'),
      offsetY: valueOf(model, 'offsetY'),
    }
    settings.value = { ...settings.value, [model]: { ...current, [key]: Math.round(clamped * 100) / 100 } }
  }

  async function load(): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/characters`, { headers: admin.authHeaders() })
      if (!res.ok) return
      const reply = await res.json() as { canSave: boolean; version: string; settings: CharacterSettingsMap }
      settings.value = { ...settings.value, ...reply.settings }
      saved.value = copyOf(settings.value)
      version.value = reply.version
      canSave.value = reply.canSave
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

  return { settings, isDirty, canWrite, isBusy, error, valueOf, animSpeedOf, scaleOf, offsetOf, setValue, load, save, discard }
})
