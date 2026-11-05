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
      <div class="text-[11px] text-slate-400 truncate">
        {{ slotLabel }}
      </div>
    </div>

    <!-- The host has the crown on their avatar; the others show whether they are ready -->
    <UiBadge v-if="!slot.player.isHost" :variant="slot.player.isReady ? 'emerald' : 'slate'" size="sm" class="shrink-0 flex items-center gap-1">
      <component :is="slot.player.isReady ? Check : Clock" class="size-3" />
      {{ slot.player.isReady ? $t('common.ready') : $t('common.notReady') }}
    </UiBadge>

    <!-- Host: send a player out (also frees a seat stuck by a broken connection) -->
    <UiIconButton
      v-if="canKick"
      :icon="UserX"
      variant="danger"
      size="md"
      class="shrink-0"
      :title="$t('lobby.kick')"
      @click="confirmKick"
    />
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
      <span class="text-[11px] font-medium text-slate-500 truncate">· {{ slotLabel }}</span>
    </span>
  </UiButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserPlus, Crown, Check, Clock, UserX } from 'lucide-vue-next'
import { UiBadge, UiButton, UiIconButton } from './ui'
import { PlayerSlot } from '../types/multiplayer'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { useI18n } from '../stores/i18nStore'
import { useNotificationStore } from '../stores/notificationStore'
import { roleForSlot, normalizeHideSeekSettings } from '../domain/hideseek'
import { useMapStore } from '../stores/mapStore'

const props = defineProps<{
  slot: PlayerSlot
}>()

const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const { t } = useI18n()

const isMe = computed(() => props.slot.player?.id === multiplayerStore.myPlayerId)
const notify = useNotificationStore()

const canKick = computed(() => multiplayerStore.isHost && !!props.slot.player && !props.slot.player.isHost)

async function confirmKick() {
  const player = props.slot.player
  if (!player) return
  const confirmed = await notify.confirm({
    title: t('lobby.kickConfirmTitle'),
    message: t('lobby.kickConfirmDesc', { name: player.name }),
    confirmText: t('lobby.kick'),
    cancelText: t('common.cancel'),
    variant: 'danger',
  })
  if (confirmed) multiplayerStore.kickPlayer(player.id)
}

/** Hide & seek slots are roles (taking the other slot switches role); other maps show the route name. */
const slotLabel = computed(() => {
  if (!multiplayerStore.isHideSeekRoom) return props.slot.routeName
  const { seekerSlots } = normalizeHideSeekSettings(mapStore.project.hideSeekSettings)
  return roleForSlot(props.slot.slotIndex, seekerSlots) === 'seeker' ? t('hideseek.roleSeeker') : t('hideseek.roleHider')
})

</script>
