<template>
  <!-- Top strip over the game (in Telegram below Telegram's own buttons) -->
  <header class="absolute inset-x-0 top-0 z-50 pt-safe pl-safe pr-safe grid grid-cols-[1fr_auto_1fr] items-start gap-1.5 pointer-events-none select-none">
    <div />

    <!-- Centre: what the player watches all game (gold to spend, lives left, the wave) -->
    <div class="min-h-10 flex items-center min-w-0">
      <div
        v-if="isTdMode"
        class="pointer-events-auto flex items-center gap-3 sm:gap-4 h-9 pl-3 pr-1 rounded-full border border-slate-700/70 bg-slate-950/80 backdrop-blur-md shadow-lg tabular-nums"
      >
        <span class="flex items-center gap-1 text-sm font-black text-amber-300" :title="$t('common.gold')">
          <Coins class="size-4 text-amber-400 shrink-0" />{{ towerStore.myGold }}
        </span>
        <span
          class="flex items-center gap-1 text-sm font-black"
          :class="gameStore.playerLives <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-100'"
          :title="$t('common.lives')"
        >
          <Heart class="size-4 text-rose-500 fill-rose-500 shrink-0" />{{ gameStore.playerLives }}
        </span>
        <span class="hidden sm:flex items-center gap-1 text-xs font-bold text-rose-300" :title="$t('game.kills')">
          <Skull class="size-3.5 text-rose-400 shrink-0" />{{ gameStore.totalKills }}
        </span>
        <UiButton variant="ghost" size="xs" :leading-icon="Swords" custom-class="h-7 rounded-full! text-xs! text-purple-200" :title="$t('game.allWaves')" @click="isWaveModalOpen = true">
          {{ waveStore.currentWaveIndex + 1 }}<span class="text-slate-500 font-normal">/{{ waveStore.waveConfigs.length }}</span>
        </UiButton>
      </div>
      <span
        v-else-if="!isHideSeekMode"
        class="flex items-center gap-1.5 h-8 max-w-72 px-3 rounded-full border border-slate-700/70 bg-slate-950/80 backdrop-blur-md text-[11px] font-semibold text-slate-300"
      >
        <Footprints class="size-3.5 text-emerald-400 shrink-0" /><span class="truncate">{{ $t('game.heroTapToMove') }}</span>
      </span>
    </div>

    <!-- Right: voice and the menu; in a room the players (and their gold) below -->
    <div class="flex flex-col items-end gap-1.5 min-w-0">
      <div class="min-h-10 flex items-center gap-1.5">
        <VoiceChatControl v-if="multiplayerStore.roomId" size="lg" button-class="bg-slate-950/80! backdrop-blur-md" class="pointer-events-auto" />
        <UiIconButton :icon="Menu" size="lg" :title="$t('game.menu')" custom-class="pointer-events-auto bg-slate-950/80! backdrop-blur-md" @click="isMenuOpen = true" />
      </div>
      <ul v-if="multiplayerStore.roomId && !isHideSeekMode" class="flex flex-col gap-0.5 max-w-44">
        <li
          v-for="p in multiplayerStore.players"
          :key="p.id"
          class="flex items-center gap-1.5 h-6 px-2 rounded-full bg-slate-950/75 backdrop-blur-md text-[10px]"
          :class="p.id === multiplayerStore.myPlayerId ? 'ring-1 ring-brand-400/40' : ''"
        >
          <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: p.color || '#38bdf8' }" />
          <span class="min-w-0 truncate font-semibold" :class="p.id === multiplayerStore.myPlayerId ? 'text-brand-100' : 'text-slate-300'">{{ p.name }}</span>
          <span v-if="isTdMode" class="shrink-0 ml-auto flex items-center gap-0.5 font-extrabold text-amber-300 tabular-nums">
            <Coins class="size-2.5 text-amber-400" />{{ p.gold ?? 0 }}
          </span>
        </li>
      </ul>
    </div>

    <WavesOverviewModal v-model:is-open="isWaveModalOpen" />
    <InGameMenuModal v-model:is-open="isMenuOpen" :is-editor-mode="isEditorMode" @restart="handleRestartGame" @exit="handleExitFromMenu" />
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Heart, Swords, Skull, Menu, Coins, Footprints } from 'lucide-vue-next'
import { UiButton, UiIconButton } from '../ui'
import WavesOverviewModal from './WavesOverviewModal.vue'
import InGameMenuModal from './InGameMenuModal.vue'
import VoiceChatControl from '../VoiceChatControl.vue'
import { useGameStore } from '../../stores/gameStore'
import { useWaveStore } from '../../stores/waveStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useMapStore } from '../../stores/mapStore'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { getMapMode } from '../../domain/map'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useGameExit } from '../../composables/useGameExit'

const gameStore = useGameStore()
const waveStore = useWaveStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const hideSeekStore = useHideSeekStore()
const notify = useNotificationStore()
const { t } = useI18nStore()

/** Tower defence maps get gold, lives and waves; hide & seek draws its own HUD; PvP (hero) maps a hint */
const isTdMode = computed(() => getMapMode(mapStore.project) === 'td')
const isHideSeekMode = computed(() => getMapMode(mapStore.project) === 'hideseek')

const isMenuOpen = ref(false)
const isWaveModalOpen = ref(false)

/** Play again: a hide & seek game goes back to its picker (team size, hero, role); tower defence starts over. */
function handleRestartGame() {
  isMenuOpen.value = false
  if (hideSeekStore.isActive) hideSeekStore.chooseSoloRole()
  else gameStore.restartGame()
}

function handleExitFromMenu() {
  isMenuOpen.value = false
  handleExitGame()
}

const { isEditorMode, exitGame } = useGameExit()

async function handleExitGame() {
  const isEditor = isEditorMode.value
  const isMulti = !!multiplayerStore.roomId

  const title = isMulti ? t('lobby.confirmLeaveTitle') : (isEditor ? t('game.returnEditor') : t('game.returnHome'))
  const message = isMulti
    ? t('game.exitRoomConfirm')
    : (isEditor ? t('game.confirmExitEditor') : t('game.confirmExitHome'))

  const confirmed = await notify.confirm({
    title,
    message,
    confirmText: t('common.confirm'),
    cancelText: t('common.cancel'),
    variant: 'danger',
  })

  if (confirmed) exitGame()
}
</script>
