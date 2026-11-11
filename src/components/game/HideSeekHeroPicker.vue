<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-4 gap-1.5">
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
        <div class="w-full h-14 bg-radial from-slate-700/50 to-transparent flex items-end justify-center overflow-hidden">
          <img
            v-if="portraits[model.id]"
            :src="portraits[model.id]"
            :alt="model.label"
            class="h-13 w-auto object-contain drop-shadow-lg"
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

    <!-- What the picked hero can do: one passive trait and three abilities, the same in both roles -->
    <div v-if="modelValue" class="flex flex-col gap-1 rounded-xl bg-slate-950/60 border border-slate-800 px-2.5 py-2 text-[11px] leading-snug">
      <p v-if="trait" class="flex items-start gap-1.5 text-slate-300">
        <component :is="trait.icon" class="size-3.5 shrink-0 mt-px text-amber-300" />
        <span><b class="text-amber-200">{{ $t(trait.label) }}</b> · {{ $t('hideseek.passive') }}: {{ $t(trait.desc) }}</span>
      </p>
      <p v-for="(ability, slot) in abilities" :key="ability" class="flex items-start gap-1.5 text-slate-300">
        <component :is="ABILITY_ICONS[ability]" class="size-3.5 shrink-0 mt-px text-sky-300" />
        <span>
          <b class="text-sky-200">{{ ABILITY_KEYS[slot] }} · {{ $t(`hideseek.ability.${ability}`) }}</b>
          <span class="text-slate-500"> ({{ abilityCooldown(ability, settings) }}{{ $t('hideseek.secondsShort') }})</span>:
          {{ $t(`hideseek.abilityHint.${ability}`) }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check } from 'lucide-vue-next'
import { UiCard, UiSpinner } from '../ui'
import { HERO_MODELS } from '../../stores/heroStore'
import { useMapStore } from '../../stores/mapStore'
import { assetManager } from '../../services/assetManager'
import { abilitiesOf, abilityCooldown, normalizeHideSeekSettings, traitOf } from '../../domain/hideseek'
import { ABILITY_ICONS, ABILITY_KEYS, TRAIT_INFO } from './hideSeekTraitInfo'

/** Hero picker for hide & seek (solo and room games): portraits, then the picked hero's trait and abilities. */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', model: string): void }>()

/** Portraits face the viewer (direction 3 = south) */
const PORTRAIT_DIRECTION = 3

const mapStore = useMapStore()
const settings = computed(() => normalizeHideSeekSettings(mapStore.project.hideSeekSettings))
const trait = computed(() => {
  const id = traitOf(props.modelValue)
  return id ? TRAIT_INFO[id] : null
})
const abilities = computed(() => abilitiesOf(props.modelValue))
const portraits = ref<Record<string, string>>({})

onMounted(async () => {
  // Character atlases for the portraits (also warms them up for the match)
  await assetManager.loadBundle('characters').catch(() => {})
  portraits.value = Object.fromEntries(
    HERO_MODELS.map(m => [m.id, assetManager.getCharacterPreviewDataUrl(m.id, PORTRAIT_DIRECTION, 'Idle', 0)])
  )
})
</script>
