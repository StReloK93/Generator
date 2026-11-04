<template>
  <div class="shrink-0 border-t border-slate-800 px-2.5 py-2 flex flex-col gap-1.5">
    <span class="text-[10px] font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
      <UserRound class="size-3.5" /> {{ $t('hideseek.pickCharacter') }}
    </span>
    <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
      <UiCard
        v-for="model in HERO_MODELS"
        :key="model.id"
        padding="none"
        interactive
        :selected="selectedModel === model.id"
        :custom-class="[
          'relative overflow-hidden flex flex-col items-center cursor-pointer select-none',
          selectedModel === model.id ? 'ring-2 ring-emerald-400 bg-emerald-500/10' : 'bg-slate-950/50',
        ]"
        :aria-label="model.label"
        @click="multiplayerStore.selectHeroModel(model.id)"
      >
        <div class="w-full h-16 bg-radial from-slate-700/50 to-transparent flex items-end justify-center overflow-hidden">
          <img
            v-if="portraits[model.id]"
            :src="portraits[model.id]"
            :alt="model.label"
            class="h-15 w-auto object-contain drop-shadow-lg"
            draggable="false"
          />
          <UiSpinner v-else class="size-4 mb-5 text-slate-500" />
        </div>
        <span
          class="w-full text-center text-[10px] font-bold pt-0.5 truncate"
          :class="selectedModel === model.id ? 'text-emerald-300' : 'text-slate-300'"
        >
          {{ model.label }}
        </span>
        <span v-if="traitInfo(model.id)" class="w-full flex items-center justify-center gap-0.5 pb-0.5 text-[9px] font-semibold text-amber-200/80 truncate">
          <component :is="traitInfo(model.id)!.icon" class="size-2.5 shrink-0" />
          <span class="truncate">{{ $t(traitInfo(model.id)!.label) }}</span>
        </span>
        <Check v-if="selectedModel === model.id" class="absolute top-1 right-1 size-3.5 text-emerald-300" />
      </UiCard>
    </div>
    <!-- What the picked character can do (kept in both roles) -->
    <p v-if="traitInfo(selectedModel)" class="text-[11px] text-slate-300 flex items-start gap-1.5">
      <component :is="traitInfo(selectedModel)!.icon" class="size-3.5 shrink-0 mt-px text-amber-300" />
      <span><b class="text-amber-200">{{ $t(traitInfo(selectedModel)!.label) }}:</b> {{ $t(traitInfo(selectedModel)!.desc) }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { UserRound, Check } from 'lucide-vue-next'
import { UiCard, UiSpinner } from './ui'
import { HERO_MODELS } from '../stores/heroStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { assetManager } from '../services/assetManager'
import { traitOf } from '../domain/hideseek'
import { TRAIT_INFO } from './game/hideSeekTraitInfo'

/** Portraits face the viewer (direction 3 = south) */
const PORTRAIT_DIRECTION = 3

const multiplayerStore = useMultiplayerStore()
const selectedModel = computed(() => multiplayerStore.myPlayer?.heroModel || '')
const portraits = ref<Record<string, string>>({})

function traitInfo(model: string) {
  const trait = traitOf(model)
  return trait ? TRAIT_INFO[trait] : null
}

onMounted(async () => {
  // Character atlases for the portraits (also warms them up for the match)
  await assetManager.loadBundle('characters').catch(() => {})
  portraits.value = Object.fromEntries(
    HERO_MODELS.map(m => [m.id, assetManager.getCharacterPreviewDataUrl(m.id, PORTRAIT_DIRECTION, 'Idle', 0)])
  )
})
</script>
