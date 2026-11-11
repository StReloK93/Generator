import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { hideSeekAudio } from '../services/hideSeekAudio'
import { backgroundMusic } from '../services/backgroundMusic'
import { setHapticsEnabled } from '../services/telegram'

const SOUND_KEY = 'isocraft_sound'
const MUSIC_KEY = 'isocraft_music'
const VIBRATION_KEY = 'isocraft_vibration'
const CONTROLS_KEY = 'isocraft_controls'

/** How a touch player walks in the maze: tap where to go, or a thumb joystick */
export type MoveControls = 'tap' | 'joystick'

function readControls(): MoveControls {
  try {
    return localStorage.getItem(CONTROLS_KEY) === 'joystick' ? 'joystick' : 'tap'
  } catch {
    return 'tap'
  }
}

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

/** The player's own preferences (game sounds, music, vibration, maze controls), kept on this device. The language lives in i18nStore. */
export const useSettingsStore = defineStore('settings', () => {
  const soundOn = ref(readFlag(SOUND_KEY))
  const musicOn = ref(readFlag(MUSIC_KEY))
  const vibrationOn = ref(readFlag(VIBRATION_KEY))
  const controls = ref<MoveControls>(readControls())

  watch(
    soundOn,
    on => {
      hideSeekAudio.setMuted(!on)
      writeFlag(SOUND_KEY, on)
    },
    { immediate: true }
  )
  watch(
    musicOn,
    on => {
      backgroundMusic.setEnabled(on)
      writeFlag(MUSIC_KEY, on)
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

  watch(controls, value => {
    try {
      localStorage.setItem(CONTROLS_KEY, value)
    } catch {
      // Private mode: the choice lasts this visit only
    }
  })

  return { soundOn, musicOn, vibrationOn, controls }
})
