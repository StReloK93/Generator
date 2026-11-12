<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('game.pauseMenu')"
    :subtitle="mapStore.project.name || $t('game.menu')"
    :teleport="true"
    size="sm"
    custom-class="short:max-w-3xl"
    @close="emit('update:isOpen', false)"
  >
    <div class="flex flex-col gap-2.5 short:gap-2 w-full short:grid short:grid-cols-[11rem_1fr] short:items-start">
      <div class="flex flex-col gap-2.5">
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
      </div>

      <!-- How this genre is played, for a player who forgot mid-game -->
      <div class="flex flex-col gap-2.5">
        <UiTabs v-model="section" :items="sections" variant="segmented" size="sm" fill class="mt-1 short:mt-0" />
        <HowToPlay v-if="section === 'howto'" :mode="getMapMode(mapStore.project)" />
        <SettingsPanel v-else />
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Play, RotateCcw, Layers, Home } from 'lucide-vue-next'
import { UiModal, UiButton, UiTabs } from '../ui'
import SettingsPanel from '../SettingsPanel.vue'
import HowToPlay from '../HowToPlay.vue'
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
</script>
