<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('game.pauseMenu')"
    :subtitle="$t('game.menu')" 
    :teleport="true" 
    size="sm"
    @close="emit('update:isOpen', false)"
  >
    <div class="flex flex-col gap-2.5 w-full">
      <!-- Resume Game -->
      <UiButton 
        variant="game-green" 
        size="sm" 
        :leading-icon="Play" 
        class="w-full justify-center"
        @click="emit('update:isOpen', false)"
      >
        {{ $t('game.resumeGame') }}
      </UiButton>

      <!-- Restart Game (Singleplayer only) -->
      <UiButton 
        v-if="!multiplayerStore.roomId" 
        variant="game-amber" 
        size="sm" 
        :leading-icon="RotateCcw"
        class="w-full justify-center"
        @click="emit('restart')"
      >
        {{ $t('common.playAgain') }}
      </UiButton>

      <!-- Exit to Home / Editor -->
      <UiButton 
        variant="secondary" 
        size="sm" 
        :leading-icon="isEditorMode ? Layers : Home" 
        class="w-full justify-center"
        @click="emit('exit')"
      >
        {{ isEditorMode ? $t('game.returnEditor') : $t('game.returnHome') }}
      </UiButton>

      <!-- Language Switcher & Fullscreen in Menu -->
      <div class="flex items-center justify-between px-3 py-1.5 mt-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <span class="text-slate-300 font-semibold flex items-center gap-1.5">
          <Languages class="size-4 text-cyan-400" />
          {{ $t('common.settings') }}
        </span>
        <div class="flex items-center gap-2">
          <UiButton 
            variant="ghost" 
            size="xs" 
            :leading-icon="isFullscreenMode ? Minimize2 : Maximize2"
            @click="emit('toggleFullscreen')"
          >
            {{ isFullscreenMode ? $t('common.exitFullscreen') : $t('common.fullscreen') }}
          </UiButton>
          <UiLanguageSwitcher />
        </div>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { 
  Play, 
  RotateCcw, 
  Layers, 
  Home, 
  Languages, 
  Maximize2, 
  Minimize2 
} from 'lucide-vue-next'
import { UiModal, UiButton, UiLanguageSwitcher } from '../ui'
import { useMultiplayerStore } from '../../stores/multiplayerStore'

defineProps<{
  isOpen: boolean
  isEditorMode?: boolean
  isFullscreenMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'restart'): void
  (e: 'exit'): void
  (e: 'toggleFullscreen'): void
}>()

const multiplayerStore = useMultiplayerStore()
</script>
