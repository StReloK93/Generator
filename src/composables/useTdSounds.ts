import { onUnmounted, watch, type Ref } from 'vue'
import { gameAudio } from '../services/gameAudio'
import { combatEvents } from '../services/combatEvents'
import { getProjectile } from '../domain/projectile'
import { useGameStore } from '../stores/gameStore'
import { useTowerStore } from '../stores/towerStore'
import type { MapGameMode } from '../types/map'

/** Plays a sound at most once per `gap` milliseconds, so a big fight (or 50x speed) does not turn into noise. */
function throttled(gap: number, play: () => void): () => void {
  let last = 0
  return () => {
    const now = performance.now()
    if (now - last < gap) return
    last = now
    play()
  }
}

/**
 * Tower defense game sounds: the gong (a wave begins), hits, explosions, kills, lost lives, win / lose tunes and tower
 * build / upgrade / sell. Everything is read from the stores and combat events, so host and multiplayer
 * clients hear the same thing. The "Game sounds" setting mutes them (gameAudio).
 */
export function useTdSounds(mapMode: Ref<MapGameMode>): void {
  const gameStore = useGameStore()
  const towerStore = useTowerStore()
  const isTd = () => mapMode.value === 'td'

  const hit = { flying: throttled(60, () => gameAudio.playHit('flying')), strike: throttled(90, () => gameAudio.playHit('strike')), beam: throttled(90, () => gameAudio.playHit('beam')) }
  const explosion = throttled(150, () => gameAudio.playExplosion())
  const kill = throttled(80, () => gameAudio.playKill())
  const lifeLost = throttled(300, () => gameAudio.playLifeLost())
  /** The gong rings some 4 s: at high game speed waves come faster, so they never pile up */
  const gong = throttled(3000, () => gameAudio.playGong())

  // Browsers only start audio after a user gesture
  const unlock = () => gameAudio.unlock()
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true })

  const unsubscribe = [
    combatEvents.onImpact(evt => {
      if (isTd() && getProjectile(evt.projectileType).behavior === 'flying') hit.flying()
    }),
    combatEvents.onStrike(evt => {
      const behavior = getProjectile(evt.projectileType).behavior
      if (isTd() && behavior !== 'flying') hit[behavior]()
    }),
    combatEvents.onShockwave(() => {
      if (isTd()) explosion()
    }),
  ]

  watch(
    () => gameStore.totalKills,
    (now, before) => {
      if (isTd() && now > before) kill()
    }
  )
  watch(
    () => gameStore.playerLives,
    (now, before) => {
      if (isTd() && gameStore.gameState !== 'ready' && now < before) lifeLost()
    }
  )
  watch(
    () => gameStore.gameState,
    (state, before) => {
      if (!isTd() || state === before) return
      // The gong: a wave sets off
      if (state === 'wave_running') gong()
      else if (state === 'victory') gameAudio.playRoundEnd(true)
      else if (state === 'game_over') gameAudio.playRoundEnd(false)
    }
  )
  // One tower more: built; one fewer: sold; same count with a higher total level: upgraded
  // (bigger jumps are a restore or a reset, and stay quiet)
  watch(
    () => [towerStore.placedTowers.length, towerStore.placedTowers.reduce((sum, tower) => sum + (tower.level || 1), 0)] as const,
    ([count, levels], [countBefore, levelsBefore]) => {
      if (!isTd() || !gameStore.isGameMode) return
      if (count === countBefore + 1) gameAudio.playBuild()
      else if (count === countBefore - 1) gameAudio.playSell()
      else if (count === countBefore && levels > levelsBefore) gameAudio.playUpgrade()
    }
  )

  onUnmounted(() => {
    window.removeEventListener('pointerdown', unlock, { capture: true })
    unsubscribe.forEach(off => off())
  })
}
