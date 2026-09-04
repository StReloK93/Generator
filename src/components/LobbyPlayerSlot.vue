<template>
  <UiCard 
    :variant="slot.player ? 'slate' : 'subtle'"
    :selected="isMe"
    :interactive="!slot.player"
    padding="sm"
    :custom-class="[
      'flex flex-col justify-between gap-3 min-h-[140px]',
      !slot.player ? 'border-dashed hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer' : ''
    ]"
    @click="handleClickSlot"
  >
    <!-- Top Slot Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] font-bold flex items-center justify-center border border-slate-700">
          #{{ slot.slotIndex + 1 }}
        </span>
        <span class="text-xs font-bold text-slate-200">
          {{ slot.doorName }}
        </span>
      </div>

      <!-- Quadrant / Location tag -->
      <UiBadge variant="slate" size="xs">
        {{ slot.quadrantName || `Spawn #${slot.doorIndex + 1}` }}
      </UiBadge>
    </div>

    <!-- Middle: Player Info or Empty Slot -->
    <div v-if="slot.player" class="flex items-center gap-3.5 py-1">
      <!-- Player Avatar with Color Circle -->
      <div 
        class="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-950 font-black text-base shadow-lg shrink-0 relative"
        :style="{ backgroundColor: slot.player.color }"
      >
        <span>{{ slot.player.name.slice(0, 2).toUpperCase() }}</span>

        <!-- Host Crown Badge -->
        <span 
          v-if="slot.player.isHost" 
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shadow border border-amber-300"
          title="Room Host"
        >
          👑
        </span>
      </div>

      <!-- Player Details -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="font-bold text-sm text-white truncate">
            {{ slot.player.name }}
          </span>
          <UiBadge v-if="isMe" variant="brand" size="xs">
            You
          </UiBadge>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
          <span v-if="slot.player.isHost" class="text-amber-400 font-semibold flex items-center gap-1">
            Host
          </span>
          <span v-else :class="slot.player.isReady ? 'text-emerald-400 font-semibold' : 'text-slate-500'">
            {{ slot.player.isReady ? '✅ Ready' : '⏳ Waiting...' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty Slot Display -->
    <div v-else class="flex items-center justify-center py-3 text-slate-500 text-xs font-medium gap-2">
      <UserPlus class="w-4 h-4 text-slate-600" />
      <span>Empty Slot (Click to join)</span>
    </div>

    <!-- Bottom Coordinates footer -->
    <div class="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 font-mono">
      <span>Coord: ({{ slot.spawnCol }}, {{ slot.spawnRow }})</span>
      <UiBadge 
        v-if="slot.player && !slot.player.isHost" 
        :variant="slot.player.isReady ? 'emerald' : 'amber'"
        size="xs"
      >
        {{ slot.player.isReady ? 'READY' : 'NOT READY' }}
      </UiBadge>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserPlus } from 'lucide-vue-next'
import { UiCard, UiBadge } from './ui'
import { PlayerSlot } from '../types/multiplayer'
import { useMultiplayerStore } from '../stores/multiplayerStore'

const props = defineProps<{
  slot: PlayerSlot
}>()

const multiplayerStore = useMultiplayerStore()

const isMe = computed(() => {
  return props.slot.player?.id === multiplayerStore.myPlayerId
})

function handleClickSlot() {
  if (!props.slot.player) {
    multiplayerStore.selectSlot(props.slot.slotIndex)
  }
}
</script>
