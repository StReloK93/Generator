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
        <!-- Hide & seek: the hero I play, what it is and can do -->
        <div v-if="section === 'hero' && hero" class="flex flex-col gap-2">
          <div class="flex items-center gap-3">
            <div class="size-16 shrink-0 rounded-xl bg-radial from-slate-700/50 to-transparent flex items-end justify-center overflow-hidden">
              <img v-if="hero.portrait" :src="hero.portrait" :alt="hero.name" class="h-15 w-auto object-contain drop-shadow-lg" draggable="false" />
            </div>
            <span class="text-base font-black text-slate-50">{{ hero.name }}</span>
          </div>
          <HideSeekHeroInfo :model="hero.model" />
        </div>
        <HowToPlay v-else-if="section === 'howto'" :mode="getMapMode(mapStore.project)" />
        <SettingsPanel v-else />
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Play, RotateCcw, Layers, Home } from 'lucide-vue-next'
import { UiModal, UiButton, UiTabs } from '../ui'
import SettingsPanel from '../SettingsPanel.vue'
import HowToPlay from '../HowToPlay.vue'
import HideSeekHeroInfo from './HideSeekHeroInfo.vue'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { HERO_MODELS } from '../../stores/heroStore'
import { assetManager } from '../../services/assetManager'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useMapStore } from '../../stores/mapStore'
import { useI18n } from '../../stores/i18nStore'
import { getMapMode } from '../../domain/map'

const props = defineProps<{
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

const hideSeekStore = useHideSeekStore()

/** Hide & seek: my hero (name and a face-on portrait), once picked */
const hero = computed(() => {
  const model = hideSeekStore.isActive ? hideSeekStore.myModel : null
  if (!model) return null
  return {
    model,
    name: HERO_MODELS.find(m => m.id === model)?.label ?? model,
    portrait: assetManager.getCharacterPreviewDataUrl(model, 3, 'Idle', 0),
  }
})

const section = ref<'hero' | 'settings' | 'howto'>('settings')
const sections = computed(() => [
  ...(hero.value ? [{ id: 'hero', label: t('hideseek.heroTab') }] : []),
  { id: 'settings', label: t('common.settings') },
  { id: 'howto', label: t('maps.howToPlay') },
])
// Opened mid-match: the hero first
watch(() => props.isOpen, open => {
  if (open) section.value = hero.value ? 'hero' : 'settings'
})
</script>
