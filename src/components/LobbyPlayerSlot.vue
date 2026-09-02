<template>
  <div 
    class="p-4 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between gap-3 select-none"
    :class="[
      slot.player 
        ? 'bg-slate-900/90 border-slate-700/80 shadow-xl' 
        : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-900/30 cursor-pointer',
      isMe ? 'ring-2 ring-brand-500/80' : ''
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
      <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60">
        {{ slot.quadrantName || `Chiqish #${slot.doorIndex + 1}` }}
      </span>
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
          title="Xona Egasi (Host)"
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
          <span v-if="isMe" class="px-1.5 py-0.2 text-[9px] font-bold rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
            Siz
          </span>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
          <span v-if="slot.player.isHost" class="text-amber-400 font-semibold flex items-center gap-1">
            Host
          </span>
          <span v-else :class="slot.player.isReady ? 'text-emerald-400 font-semibold' : 'text-slate-500'">
            {{ slot.player.isReady ? '✅ Tayyor' : '⏳ Kutmoqda...' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty Slot Display -->
    <div v-else class="flex items-center justify-center py-3 text-slate-500 text-xs font-medium gap-2">
      <UserPlus class="w-4 h-4 text-slate-600" />
      <span>Bo'sh O'rin (O'tish uchun bosing)</span>
    </div>

    <!-- Bottom Coordinates footer -->
    <div class="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 font-mono">
      <span>Koordinata: ({{ slot.spawnCol }}, {{ slot.spawnRow }})</span>
      <span v-if="slot.player && !slot.player.isHost" :class="slot.player.isReady ? 'text-emerald-400' : 'text-amber-400/80'">
        {{ slot.player.isReady ? 'TAYYOR' : 'TAYYOR EMAS' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserPlus } from 'lucide-vue-next'
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
