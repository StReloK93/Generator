import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { hideSeekAudio } from '../services/hideSeekAudio'
import { setHapticsEnabled } from '../services/telegram'

const SOUND_KEY = 'isocraft_sound'
const VIBRATION_KEY = 'isocraft_vibration'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? 'on' : 'off')
  } catch {
    // Private mode: the choice lasts this visit only
  }
}

/** The player's own preferences (game sounds, vibration), kept on this device. The language lives in i18nStore. */
export const useSettingsStore = defineStore('settings', () => {
  const soundOn = ref(readFlag(SOUND_KEY))
  const vibrationOn = ref(readFlag(VIBRATION_KEY))

  watch(
    soundOn,
    on => {
      hideSeekAudio.setMuted(!on)
      writeFlag(SOUND_KEY, on)
    },
    { immediate: true }
  )
  watch(
    vibrationOn,
    on => {
      setHapticsEnabled(on)
      writeFlag(VIBRATION_KEY, on)
    },
    { immediate: true }
  )

  return { soundOn, vibrationOn }
})
