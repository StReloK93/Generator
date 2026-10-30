import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMapStore } from '../stores/mapStore'
import { useGameStore } from '../stores/gameStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { sanitizeMapId } from '../services/mapManager'

/**
 * Leaving a running game: back to the editor the game was started from, out of the room, or home.
 */
export function useGameExit() {
  const router = useRouter()
  const route = useRoute()
  const mapStore = useMapStore()
  const gameStore = useGameStore()
  const multiplayerStore = useMultiplayerStore()

  const isEditorMode = computed(() => gameStore.entrySource === 'editor' || route.name === 'editor-game')

  function exitGame() {
    gameStore.exitPlayMode()
    if (multiplayerStore.roomId) {
      multiplayerStore.leaveRoom(router)
    } else if (isEditorMode.value) {
      const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || (route.params.mapId as string) || 'julion')
      router.push(`/editor/${cleanId}`)
    } else {
      router.push('/')
    }
  }

  return { isEditorMode, exitGame }
}
