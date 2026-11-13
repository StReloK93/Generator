<template>
  <div class="flex flex-col h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden select-none pt-safe pb-safe">
    <header class="h-14 shrink-0 bg-slate-900/95 border-b border-slate-800 px-2 sm:px-4 flex items-center justify-between gap-2 z-20">
      <div class="flex items-center gap-2 min-w-0">
        <UiIconButton :icon="ArrowLeft" :title="$t('common.back')" @click="goBack" />
        <div class="min-w-0">
          <h1 class="text-sm font-black tracking-wide truncate">{{ $t('characters.title') }}</h1>
          <p class="text-[10px] text-slate-400 truncate hidden sm:block">{{ $t('characters.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <template v-if="admin.isAdmin && characterSettings.isDirty">
          <UiButton size="sm" variant="ghost" :leading-icon="Undo2" @click="characterSettings.discard()">
            <span class="hidden sm:inline">{{ $t('config.animSpeedDiscard') }}</span>
          </UiButton>
          <UiButton
            size="sm"
            variant="primary"
            :leading-icon="Save"
            :disabled="!characterSettings.canWrite"
            :loading="characterSettings.isBusy"
            @click="characterSettings.save()"
          >
            {{ $t('config.animSpeedSave') }}
          </UiButton>
        </template>
        <UiLanguageSwitcher />
      </div>
    </header>

    <main class="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4">
      <!-- The game's own settings: only the signed-in admin sees and changes them -->
      <div v-if="!admin.isAdmin" class="h-full flex flex-col items-center justify-center gap-3 text-center">
        <Lock class="w-8 h-8 text-slate-500" />
        <p class="text-sm text-slate-300 max-w-xs">{{ $t('characters.adminOnly') }}</p>
        <UiButton v-if="admin.enabled" variant="game-amber" size="sm" :leading-icon="LogIn" @click="admin.openSignIn()">
          {{ $t('admin.submit') }}
        </UiButton>
      </div>
      <div v-else class="max-w-6xl mx-auto flex flex-col gap-3">
        <span v-if="characterSettings.error" class="text-xs text-rose-400">{{ $t('config.animSpeedSaveFailed') }}</span>

        <div v-if="!charactersLoaded" class="flex items-center justify-center gap-2 h-40 text-sm text-slate-400">
          <UiSpinner custom-class="h-4 w-4" />
          {{ $t('common.loading') }}
        </div>
        <!-- Every character running side by side as the game draws it: compared at a glance, set right under it -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <UiCard v-for="model in CHARACTER_MODELS" :key="model.id" variant="subtle" padding="sm" custom-class="flex flex-col gap-2">
            <span class="text-sm font-bold text-slate-100 capitalize">{{ model.name }}</span>
            <CharacterLivePreview
              :model-value="model.id"
              :show-model-selector="false"
              :show-direction-bar="false"
              :show-action-buttons="false"
              height-class="h-40"
            />
            <UiSlider
              v-for="field in FIELDS"
              :key="field.key"
              :model-value="characterSettings.valueOf(model.id, field.key)"
              :label="$t(field.label)"
              :min="CHARACTER_SETTING_LIMITS[field.key].min"
              :max="CHARACTER_SETTING_LIMITS[field.key].max"
              :step="CHARACTER_SETTING_LIMITS[field.key].step"
              :unit="field.unit"
              @update:model-value="(val) => characterSettings.setValue(model.id, field.key, val ?? CHARACTER_SETTING_LIMITS[field.key].fallback)"
            />
          </UiCard>
        </div>

        <p class="text-[11px] text-slate-500">{{ $t('config.animSpeedDesc') }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Lock, LogIn, Save, Undo2 } from 'lucide-vue-next'
import { assetManager } from '../services/assetManager'
import { UiButton, UiCard, UiIconButton, UiLanguageSwitcher, UiSlider, UiSpinner } from '../components/ui'
import CharacterLivePreview from '../components/game/CharacterLivePreview.vue'
import { useAdminStore } from '../stores/adminStore'
import { CHARACTER_SETTING_LIMITS, useCharacterSettingsStore, type CharacterSettingKey } from '../stores/characterSettingsStore'
import { CHARACTER_MODELS } from '../utils/characterUtils'

/**
 * The game's characters, set once for every map (not part of any map, so not in the map editor): each character's
 * run animation speed, size and placement on its cell, all of them running side by side to compare. A wave only
 * multiplies the size (its scale 1 = the size set here). Changes show at once; the signed-in admin saves them.
 */
const router = useRouter()
const admin = useAdminStore()
const characterSettings = useCharacterSettingsStore()

/** The settings every character has, in the order shown */
const FIELDS: { key: CharacterSettingKey; label: string; unit: string }[] = [
  { key: 'animSpeed', label: 'characters.animSpeed', unit: 'x' },
  { key: 'scale', label: 'characters.scale', unit: 'x' },
  { key: 'offsetX', label: 'characters.offsetX', unit: 'px' },
  { key: 'offsetY', label: 'characters.offsetY', unit: 'px' },
]

onMounted(() => void assetManager.loadBundle('characters'))
/** Re-checked whenever a bundle finishes loading (the asset manager bumps atlasRevision then) */
const charactersLoaded = computed(() => {
  void assetManager.atlasRevision.value
  return assetManager.isBundleLoaded('characters')
})

function goBack(): void {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>
