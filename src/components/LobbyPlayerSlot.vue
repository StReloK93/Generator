<template>
  <UiCard 
    :variant="slot.player ? 'slate' : 'subtle'"
    :selected="isMe"
    :interactive="!slot.player"
    padding="xs"
    :custom-class="[
      'flex flex-col justify-between gap-1.5 min-h-24 py-2 px-3',
      !slot.player ? 'border-dashed hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer' : ''
    ]"
    @click="handleClickSlot"
  >
    <!-- Top Slot Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <span class="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center border border-slate-700">
          #{{ slot.slotIndex + 1 }}
        </span>
        <span class="text-[11px] font-bold text-slate-200">
          {{ slot.doorName }}
        </span>
      </div>

      <!-- Quadrant / Location tag -->
      <UiBadge variant="slate" size="xs">
        {{ slot.quadrantName || `Spawn #${slot.doorIndex + 1}` }}
      </UiBadge>
    </div>

    <!-- Middle: Player Info or Empty Slot -->
    <div v-if="slot.player" class="flex items-center gap-2.5 py-0.5">
      <!-- Player Avatar with Color Circle -->
      <div 
        class="w-8 h-8 rounded-xl flex items-center justify-center text-slate-950 font-black text-xs shadow shrink-0 relative"
        :style="{ backgroundColor: slot.player.color }"
      >
        <span>{{ slot.player.name.slice(0, 2).toUpperCase() }}</span>

        <!-- Host Crown Badge -->
        <span 
          v-if="slot.player.isHost" 
          class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] shadow border border-amber-300"
          title="Room Host"
        >
          <Crown class="w-2.5 h-2.5" />
        </span>
      </div>

      <!-- Player Details -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1">
          <span class="font-bold text-xs text-white truncate">
            {{ slot.player.name }}
          </span>
          <UiBadge v-if="isMe" variant="brand" size="xs">
            {{ $t('lobby.slotYou') }}
          </UiBadge>
        </div>

        <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span v-if="slot.player.isHost" class="text-amber-400 font-semibold flex items-center gap-1">
            {{ $t('lobby.slotHost') }}
          </span>
          <span v-else :class="slot.player.isReady ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-slate-500 flex items-center gap-1'">
            <component :is="slot.player.isReady ? Check : Clock" class="w-2.5 h-2.5" />
            <span>{{ slot.player.isReady ? $t('common.ready') : $t('common.notReady') }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Empty Slot Display -->
    <div v-else class="flex items-center justify-center py-2 text-slate-500 text-[11px] font-medium gap-1.5">
      <UserPlus class="w-3.5 h-3.5 text-slate-600" />
      <span>{{ $t('lobby.slotOpen') }}</span>
    </div>

    <!-- Bottom Status footer -->
    <div class="flex items-center justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-800/80 font-mono">
      <span>Pos: ({{ slot.spawnCol }}, {{ slot.spawnRow }})</span>
      <UiBadge 
        v-if="slot.player && !slot.player.isHost" 
        :variant="slot.player.isReady ? 'emerald' : 'amber'"
        size="xs"
      >
        {{ slot.player.isReady ? $t('common.ready').toUpperCase() : $t('common.notReady').toUpperCase() }}
      </UiBadge>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserPlus, Crown, Check, Clock } from 'lucide-vue-next'
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

