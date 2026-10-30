<template>
  <!-- Occupied slot -->
  <div
    v-if="slot.player"
    :class="[
      'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 min-h-13',
      isMe ? 'border-brand-400/60 bg-brand-500/10' : 'border-slate-800 bg-slate-950/40'
    ]"
  >
    <div
      class="relative size-9 rounded-xl flex items-center justify-center text-slate-950 font-black text-xs shrink-0"
      :style="{ backgroundColor: slot.player.color }"
    >
      {{ slot.player.name.slice(0, 2).toUpperCase() }}
      <span
        v-if="slot.player.isHost"
        class="absolute -top-1.5 -right-1.5 size-4.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center border-2 border-slate-900"
      >
        <Crown class="size-2.5" />
      </span>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="font-extrabold text-sm text-slate-50 truncate">{{ slot.player.name }}</span>
        <UiBadge v-if="isMe" variant="brand" size="xs">{{ $t('lobby.slotYou') }}</UiBadge>
      </div>
      <div class="text-[11px] text-slate-400 truncate">{{ slot.routeName }}</div>
    </div>

    <UiBadge v-if="slot.player.isHost" variant="amber" size="sm" class="shrink-0">
      {{ $t('lobby.slotHost') }}
    </UiBadge>
    <UiBadge v-else :variant="slot.player.isReady ? 'emerald' : 'slate'" size="sm" class="shrink-0 flex items-center gap-1">
      <component :is="slot.player.isReady ? Check : Clock" class="size-3" />
      {{ slot.player.isReady ? $t('common.ready') : $t('common.notReady') }}
    </UiBadge>
  </div>

  <!-- Open slot: tap to take it -->
  <UiButton
    v-else
    variant="outline"
    block
    :leading-icon="UserPlus"
    custom-class="justify-start! border-dashed min-h-13 text-slate-400"
    @click="multiplayerStore.selectSlot(slot.slotIndex)"
  >
    <span class="flex items-center gap-2 min-w-0">
      <span>{{ $t('lobby.slotOpen') }}</span>
      <span class="text-[11px] font-medium text-slate-500 truncate">· {{ slot.routeName }}</span>
    </span>
  </UiButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserPlus, Crown, Check, Clock } from 'lucide-vue-next'
import { UiBadge, UiButton } from './ui'
import { PlayerSlot } from '../types/multiplayer'
import { useMultiplayerStore } from '../stores/multiplayerStore'

const props = defineProps<{
  slot: PlayerSlot
}>()

const multiplayerStore = useMultiplayerStore()

const isMe = computed(() => props.slot.player?.id === multiplayerStore.myPlayerId)
</script>
