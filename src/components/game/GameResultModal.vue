<template>
  <!-- The end of a tower defence game: victory or defeat, how it went, and what to do next -->
  <UiModal
    :is-open="!!result"
    hide-header
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-escape="false"
    body-class="p-5! flex flex-col items-center text-center gap-4"
  >
    <template v-if="result">
      <div class="relative mt-1">
        <div :class="['absolute inset-0 rounded-full blur-2xl scale-150', look.glow]" />
        <div :class="['relative size-20 rounded-full border-2 flex items-center justify-center', look.badge, isVictory ? 'animate-bounce' : 'animate-pulse']">
          <component :is="look.icon" class="size-10" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <h2 :class="['font-display text-2xl font-black uppercase tracking-wide leading-tight', look.title]">{{ $t(look.titleKey) }}</h2>
        <p class="text-sm text-slate-300 leading-snug">{{ $t(look.descKey, { waves: waveStore.waveConfigs.length }) }}</p>
      </div>

      <!-- Alone: three tiles; in a room: every player's score -->
      <div v-if="!multiplayerStore.roomId" class="grid grid-cols-3 gap-2 w-full">
        <div v-for="stat in stats" :key="stat.label" class="flex flex-col items-center gap-1 py-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <component :is="stat.icon" :class="['size-4', stat.color]" />
          <span class="text-lg font-black text-slate-50 leading-none tabular-nums">{{ stat.value }}</span>
          <span class="text-[10px] text-slate-400 leading-tight px-1">{{ stat.label }}</span>
        </div>
      </div>

      <ul v-else class="w-full flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
        <li
          v-for="p in multiplayerStore.players"
          :key="p.id"
          class="flex items-center gap-2 p-2 rounded-xl border text-xs"
          :class="p.id === multiplayerStore.myPlayerId ? 'bg-brand-950/40 border-brand-500/50' : 'bg-slate-950/60 border-slate-800/80'"
        >
          <span class="size-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-950" :style="{ backgroundColor: p.color || '#38bdf8' }">
            {{ (p.slotIndex ?? 0) + 1 }}
          </span>
          <span class="flex-1 min-w-0 truncate text-left font-bold" :class="p.id === multiplayerStore.myPlayerId ? 'text-brand-300' : 'text-slate-200'">{{ p.name }}</span>
          <span class="shrink-0 flex items-center gap-2.5 text-[11px] font-semibold tabular-nums">
            <span class="flex items-center gap-0.5 text-amber-400" :title="$t('game.goldEarned')"><Coins class="size-3.5" />{{ p.totalGoldEarned ?? p.gold ?? 0 }}</span>
            <span class="flex items-center gap-0.5 text-rose-400" :title="$t('game.kills')"><Skull class="size-3.5" />{{ p.killsCount ?? 0 }}</span>
            <span class="flex items-center gap-0.5 text-brand-400" :title="$t('tower.buildCount')"><Castle class="size-3.5" />{{ p.towersBuilt ?? 0 }}</span>
          </span>
        </li>
      </ul>

      <!-- What next: the main choice first and largest -->
      <div class="flex flex-col gap-2 w-full">
        <template v-if="multiplayerStore.roomId">
          <UiButton variant="game-green" size="lg" block :leading-icon="Home" @click="multiplayerStore.returnToLobby(router)">{{ $t('lobby.title') }}</UiButton>
          <UiButton variant="secondary" size="md" block :leading-icon="LogOut" @click="multiplayerStore.leaveRoom(router)">{{ $t('lobby.leaveLobby') }}</UiButton>
        </template>
        <template v-else>
          <UiButton :variant="isVictory ? 'game-amber' : 'danger'" size="lg" block :leading-icon="RotateCcw" @click="gameStore.restartGame()">{{ $t('common.playAgain') }}</UiButton>
          <UiButton variant="secondary" size="md" block :leading-icon="isEditorMode ? Layers : Home" @click="exitGame">
            {{ isEditorMode ? $t('game.returnEditor') : $t('game.returnHome') }}
          </UiButton>
        </template>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Castle, Coins, Home, Layers, LogOut, RotateCcw, Skull, Swords, Trophy } from 'lucide-vue-next'
import { UiModal, UiButton } from '../ui'
import { useGameStore } from '../../stores/gameStore'
import { useWaveStore } from '../../stores/waveStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useI18n } from '../../stores/i18nStore'
import { useGameExit } from '../../composables/useGameExit'

const router = useRouter()
const gameStore = useGameStore()
const waveStore = useWaveStore()
const multiplayerStore = useMultiplayerStore()
const { t } = useI18n()
const { isEditorMode, exitGame } = useGameExit()

const result = computed(() => (gameStore.gameState === 'victory' ? 'victory' : gameStore.gameState === 'game_over' ? 'defeat' : null))
const isVictory = computed(() => result.value === 'victory')

const look = computed(() =>
  isVictory.value
    ? { icon: Trophy, titleKey: 'game.victoryTitle', descKey: 'game.victoryDesc', title: 'text-amber-300', glow: 'bg-amber-500/30', badge: 'bg-amber-500/15 border-amber-400/60 text-amber-300' }
    : { icon: Skull, titleKey: 'game.defeatTitle', descKey: 'game.defeatDesc', title: 'text-rose-400', glow: 'bg-rose-600/25', badge: 'bg-rose-600/15 border-rose-500/60 text-rose-400' }
)

const stats = computed(() => [
  { icon: Swords, color: 'text-purple-300', value: isVictory.value ? waveStore.waveConfigs.length : waveStore.currentWaveIndex + 1, label: t(isVictory.value ? 'home.info.waves' : 'game.wave') },
  { icon: Coins, color: 'text-amber-400', value: gameStore.totalGoldEarned || gameStore.gold, label: t('game.goldEarned') },
  { icon: Skull, color: 'text-rose-400', value: gameStore.totalKills, label: t('game.kills') },
])
</script>
