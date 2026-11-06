import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { voiceService, type VoiceTarget } from '../services/voiceService'
import { useMultiplayerStore } from './multiplayerStore'
import { teamForSlot } from '../domain/hideseek'

/** Who hears my voice: everyone in the room, or only my own team */
export type VoiceChannel = 'all' | 'team'

/** Room voice chat: the player's choices; the calls themselves live in voiceService. */
export const useVoiceStore = defineStore('voice', () => {
  const multiplayerStore = useMultiplayerStore()

  const isJoined = ref(false)
  const isJoining = ref(false)
  const isMicOn = ref(true)
  /** False when joined without a microphone (denied, or a page that is not https): listening only */
  const hasMic = ref(true)
  const channel = ref<VoiceChannel>('all')
  const connectedIds = ref<string[]>([])
  const speakingIds = ref<string[]>([])
  const mutedIds = ref<string[]>([])

  /** Only hide & seek splits the room into sides; elsewhere the whole room plays together */
  const hasTeams = computed(() => multiplayerStore.isHideSeekRoom)

  const targets = computed<VoiceTarget[]>(() => {
    const me = multiplayerStore.myPlayer
    const myTeam = me ? teamForSlot(me.slotIndex, multiplayerStore.hideSeekSeekerSlots) : null
    return multiplayerStore.players.map(p => ({
      id: p.id,
      hearsMe:
        channel.value === 'all' ||
        !hasTeams.value ||
        teamForSlot(p.slotIndex, multiplayerStore.hideSeekSeekerSlots) === myTeam,
    }))
  })

  watch(targets, value => voiceService.setTargets(value), { deep: true })
  watch(mutedIds, value => voiceService.setMutedIds(value))
  watch(isMicOn, value => voiceService.setMicEnabled(value))
  // Leaving the room ends the voice chat too
  watch(() => multiplayerStore.roomId, (id, oldId) => {
    if (id !== oldId) leave()
  })

  /** Call from a tap: the browser asks for the microphone here. */
  async function join(): Promise<'ok' | 'listen-only' | 'failed'> {
    if (isJoined.value || isJoining.value || !multiplayerStore.roomId) return 'failed'
    isJoining.value = true
    voiceService.setTargets(targets.value)
    voiceService.setMutedIds(mutedIds.value)
    voiceService.setMicEnabled(isMicOn.value)
    const result = await voiceService.join(multiplayerStore.roomId, multiplayerStore.myPlayerId, {
      onConnected: ids => (connectedIds.value = ids),
      onSpeaking: ids => (speakingIds.value = ids),
    })
    isJoining.value = false
    isJoined.value = result !== 'failed'
    hasMic.value = result === 'ok'
    return result
  }

  function leave() {
    if (!isJoined.value && !isJoining.value) return
    voiceService.leave()
    isJoined.value = false
    isJoining.value = false
  }

  function toggleMic() {
    isMicOn.value = !isMicOn.value
  }

  function setChannel(value: VoiceChannel) {
    channel.value = value
  }

  function togglePlayerMuted(playerId: string) {
    mutedIds.value = mutedIds.value.includes(playerId)
      ? mutedIds.value.filter(id => id !== playerId)
      : [...mutedIds.value, playerId]
  }

  return {
    isJoined,
    isJoining,
    isMicOn,
    hasMic,
    channel,
    hasTeams,
    connectedIds,
    speakingIds,
    mutedIds,
    join,
    leave,
    toggleMic,
    setChannel,
    togglePlayerMuted,
  }
})
