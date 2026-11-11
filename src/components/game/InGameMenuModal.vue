<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('game.pauseMenu')"
    :subtitle="mapStore.project.name || $t('game.menu')"
    :teleport="true"
    size="sm"
    @close="emit('update:isOpen', false)"
  >
    <div class="flex flex-col gap-2.5 w-full">
      <UiButton variant="game-green" size="sm" :leading-icon="Play" class="w-full justify-center" @click="emit('update:isOpen', false)">
        {{ $t('game.resumeGame') }}
      </UiButton>

      <!-- Play again: alone only (a room plays on) -->
      <UiButton v-if="!multiplayerStore.roomId" variant="game-amber" size="sm" :leading-icon="RotateCcw" class="w-full justify-center" @click="emit('restart')">
        {{ $t('common.playAgain') }}
      </UiButton>

      <UiButton variant="secondary" size="sm" :leading-icon="isEditorMode ? Layers : Home" class="w-full justify-center" @click="emit('exit')">
        {{ isEditorMode ? $t('game.returnEditor') : $t('game.returnHome') }}
      </UiButton>

      <!-- How this genre is played, for a player who forgot mid-game -->
      <UiTabs v-model="section" :items="sections" variant="segmented" size="sm" fill class="mt-1" />
      <ol v-if="section === 'howto'" class="flex flex-col gap-2">
        <li v-for="(step, i) in playInfo.howTo" :key="step.text" class="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <span class="size-7 shrink-0 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center" :class="playInfo.accent">
            <component :is="step.icon" class="size-4" />
          </span>
          <span class="text-xs text-slate-300 leading-snug"><b class="text-slate-100">{{ i + 1 }}.</b> {{ $t(step.text) }}</span>
        </li>
      </ol>
      <SettingsPanel v-else />
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Play, RotateCcw, Layers, Home } from 'lucide-vue-next'
import { UiModal, UiButton, UiTabs } from '../ui'
import SettingsPanel from '../SettingsPanel.vue'
import { MAP_MODE_PLAY_INFO } from '../mapModeInfo'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useMapStore } from '../../stores/mapStore'
import { useI18n } from '../../stores/i18nStore'
import { getMapMode } from '../../domain/map'

defineProps<{
  isOpen: boolean
  isEditorMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'restart'): void
  (e: 'exit'): void
}>()

const multiplayerStore = useMultiplayerStore()
const mapStore = useMapStore()
const { t } = useI18n()

const section = ref<'settings' | 'howto'>('settings')
const sections = computed(() => [
  { id: 'settings', label: t('common.settings') },
  { id: 'howto', label: t('maps.howToPlay') },
])
const playInfo = computed(() => MAP_MODE_PLAY_INFO[getMapMode(mapStore.project)])
</script>
