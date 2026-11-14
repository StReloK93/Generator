import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { gameAudio } from '../services/gameAudio'
import { backgroundMusic } from '../services/backgroundMusic'
import { setHapticsEnabled } from '../services/telegram'
import { applyOrientation, isFullscreen, type ScreenOrientationChoice } from '../utils/pwaOrientation'

const SOUND_KEY = 'isocraft_sound'
const MUSIC_KEY = 'isocraft_music'
const VIBRATION_KEY = 'isocraft_vibration'
const CONTROLS_KEY = 'isocraft_controls'
const MUSIC_VOLUME_KEY = 'isocraft_music_volume'
const ORIENTATION_KEY = 'isocraft_orientation'

function readNumber(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key))
    return localStorage.getItem(key) !== null && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
  } catch {
    return fallback
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Private mode: the choice lasts this visit only
  }
}

/** How a touch player walks in the maze: tap where to go, or a thumb joystick */
export type MoveControls = 'tap' | 'joystick'

function readControls(): MoveControls {
  try {
    return localStorage.getItem(CONTROLS_KEY) === 'joystick' ? 'joystick' : 'tap'
  } catch {
    return 'tap'
  }
}

function readOrientation(): ScreenOrientationChoice {
  try {
    const value = localStorage.getItem(ORIENTATION_KEY)
    return value === 'portrait' || value === 'landscape' ? value : 'auto'
  } catch {
    return 'auto'
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

/** The player's own preferences (game sounds, music, vibration, maze controls, screen turn), kept on this device. The language lives in i18nStore. */
export const useSettingsStore = defineStore('settings', () => {
  const soundOn = ref(readFlag(SOUND_KEY))
  const musicOn = ref(readFlag(MUSIC_KEY))
  const vibrationOn = ref(readFlag(VIBRATION_KEY))
  const controls = ref<MoveControls>(readControls())
  /** Music loudness, 0..100 */
  const musicVolume = ref(readNumber(MUSIC_VOLUME_KEY, 65))
  /** Screen turn in the installed app: follow the phone, or keep it upright / sideways */
  const orientation = ref<ScreenOrientationChoice>(readOrientation())

  watch(
    soundOn,
    on => {
      gameAudio.setMuted(!on)
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

  watch(
    musicVolume,
    value => {
      backgroundMusic.setVolume(value / 100)
      writeNumber(MUSIC_VOLUME_KEY, value)
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

  // A browser tab can lock only in full screen, so the lock is applied again when it goes full screen
  watch(
    [orientation, isFullscreen],
    ([value]) => {
      applyOrientation(value)
      try {
        localStorage.setItem(ORIENTATION_KEY, value)
      } catch {
        // Private mode: the choice lasts this visit only
      }
    },
    { immediate: true }
  )

  return { soundOn, musicOn, musicVolume, vibrationOn, controls, orientation }
})
