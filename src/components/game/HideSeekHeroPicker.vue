<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-4 gap-1.5 short:gap-1">
      <UiCard
        v-for="model in HERO_MODELS"
        :key="model.id"
        padding="none"
        interactive
        :selected="modelValue === model.id"
        :custom-class="[
          'relative overflow-hidden flex flex-col items-center cursor-pointer select-none',
          modelValue === model.id ? 'ring-2 ring-emerald-400 bg-emerald-500/10' : 'bg-slate-950/50',
        ]"
        :aria-label="model.label"
        @click="emit('update:modelValue', model.id)"
      >
        <div class="w-full h-14 short:h-9 bg-radial from-slate-700/50 to-transparent flex items-end justify-center overflow-hidden">
          <img
            v-if="portraits[model.id]"
            :src="portraits[model.id]"
            :alt="model.label"
            class="h-13 short:h-8 w-auto object-contain drop-shadow-lg"
            draggable="false"
          />
          <UiSpinner v-else class="size-4 mb-5 text-slate-500" />
        </div>
        <span
          class="w-full text-center text-[10px] font-bold py-0.5 truncate"
          :class="modelValue === model.id ? 'text-emerald-300' : 'text-slate-300'"
        >
          {{ model.label }}
        </span>
        <Check v-if="modelValue === model.id" class="absolute top-1 right-1 size-3.5 text-emerald-300" />
      </UiCard>
    </div>

    <HideSeekHeroInfo v-if="modelValue" :model="modelValue" compact />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Check } from 'lucide-vue-next'
import { UiCard, UiSpinner } from '../ui'
import { HERO_MODELS } from '../../stores/heroStore'
import { assetManager } from '../../services/assetManager'
import HideSeekHeroInfo from './HideSeekHeroInfo.vue'

/** Hero picker for hide & seek (solo and room games): portraits, then the picked hero's trait and abilities. */
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', model: string): void }>()

/** Portraits face the viewer (direction 3 = south) */
const PORTRAIT_DIRECTION = 3

const portraits = ref<Record<string, string>>({})

onMounted(async () => {
  // Character atlases for the portraits (also warms them up for the match)
  await assetManager.loadBundle('characters').catch(() => {})
  portraits.value = Object.fromEntries(
    HERO_MODELS.map(m => [m.id, assetManager.getCharacterPreviewDataUrl(m.id, PORTRAIT_DIRECTION, 'Idle', 0)])
  )
})
</script>
