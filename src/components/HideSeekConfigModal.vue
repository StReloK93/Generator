<template>
  <UiModal
    :is-open="toolStore.isHideSeekConfigModalOpen"
    :title="$t('genre.hideseekSettings')"
    :subtitle="$t('hsConfig.subtitle')"
    :icon="Ghost"
    icon-color="cyan"
    size="5xl"
    @close="toolStore.closeHideSeekConfig()"
  >
    <div class="flex flex-col gap-3">
      <UiTabs v-model="activeSection" :items="sectionTabs" variant="pills" size="sm" custom-class="flex-wrap gap-1" />

      <!-- The labyrinth: the map's own layout, or a new random one every round -->
      <UiCard v-if="activeSection === 'labyrinth'" variant="subtle" padding="sm">
        <UiSwitch
          :model-value="settings.randomMaze"
          :label="$t('hsConfig.randomMaze')"
          :description="$t('hsConfig.randomMazeHint')"
          @update:model-value="update({ randomMaze: $event })"
        />
      </UiCard>

      <div :class="section.cards.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5' : ''">
        <UiCard
          v-for="(card, idx) in section.cards"
          :key="card.title || idx"
          variant="subtle"
          padding="sm"
          custom-class="flex flex-col gap-2"
        >
          <div v-if="card.title" class="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <component :is="card.icon" class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{{ $t(card.title) }}</span>
          </div>
          <div :class="card.title ? 'flex flex-col gap-1.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2'">
            <UiNumberInput
              v-for="f in card.fields"
              :key="f.key"
              variant="inline"
              size="sm"
              :label="$t(f.label)"
              :model-value="settings[f.key]"
              :min="f.min"
              :max="f.max"
              :step="f.step"
              :unit="f.unit"
              @change="update({ [f.key]: $event })"
            />
          </div>
        </UiCard>
      </div>

      <div class="flex items-center justify-between gap-2 pt-1">
        <UiButton variant="ghost" size="sm" :leading-icon="RotateCcw" @click="resetDefaults">
          {{ $t('hsConfig.resetDefaults') }}
        </UiButton>
        <UiButton variant="game-green" size="sm" :leading-icon="Check" @click="toolStore.closeHideSeekConfig()">
          {{ $t('common.done') }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Ghost, RotateCcw, Check } from 'lucide-vue-next'
import { UiModal, UiTabs, UiCard, UiSwitch, UiNumberInput, UiButton, type TabItem } from './ui'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useI18n } from '../stores/i18nStore'
import { normalizeHideSeekSettings } from '../domain/hideseek/HideSeekSettings'
import type { HideSeekSettings } from '../types/map'
import { HIDE_SEEK_SECTIONS } from './hideSeekSettingsFields'

const mapStore = useMapStore()
const toolStore = useToolStore()
const { t } = useI18n()

const activeSection = ref(HIDE_SEEK_SECTIONS[0].id)
const section = computed(() => HIDE_SEEK_SECTIONS.find(s => s.id === activeSection.value) ?? HIDE_SEEK_SECTIONS[0])
const sectionTabs = computed<TabItem[]>(() => HIDE_SEEK_SECTIONS.map(s => ({ id: s.id, label: t(s.label), icon: s.icon })))

/** The map is the only owner of its hide & seek rules; the window reads and writes them there */
const settings = computed(() => normalizeHideSeekSettings(mapStore.project.hideSeekSettings))

function update(patch: Partial<HideSeekSettings>) {
  mapStore.project.hideSeekSettings = normalizeHideSeekSettings({ ...settings.value, ...patch })
}

function resetDefaults() {
  mapStore.project.hideSeekSettings = normalizeHideSeekSettings()
}
</script>
