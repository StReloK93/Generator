<template>
  <!-- What a hero can do: one passive trait and three abilities, the same in both roles -->
  <div class="flex flex-col gap-1 rounded-xl bg-slate-950/60 border border-slate-800 px-2.5 py-1.5 text-[11px] leading-snug">
    <p v-if="trait" class="flex items-start gap-1.5 text-slate-300">
      <component :is="trait.icon" class="size-3.5 shrink-0 mt-px text-amber-300" />
      <span><b class="text-amber-200">{{ $t(trait.label) }}</b> · {{ $t('hideseek.passive') }}: {{ $t(trait.desc) }}</span>
    </p>
    <p v-for="(ability, slot) in abilities" :key="ability" class="flex items-start gap-1.5 text-slate-300">
      <component :is="ABILITY_ICONS[ability]" class="size-3.5 shrink-0 mt-px text-sky-300" />
      <span>
        <b class="text-sky-200">{{ ABILITY_KEYS[slot] }} · {{ $t(`hideseek.ability.${ability}`) }}</b>
        <span class="text-slate-500"> ({{ abilityCooldown(ability, settings) }}{{ $t('hideseek.secondsShort') }})</span><span :class="compact ? 'short:hidden' : ''">:
        {{ $t(`hideseek.abilityHint.${ability}`) }}</span>
      </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { abilitiesOf, abilityCooldown, normalizeHideSeekSettings, traitOf } from '../../domain/hideseek'
import { ABILITY_ICONS, ABILITY_KEYS, TRAIT_INFO } from './hideSeekTraitInfo'

/** A hide & seek hero's trait and abilities (the hero picker, the in-game menu). `compact`: hints hide on short screens. */
const props = defineProps<{ model: string; compact?: boolean }>()

const mapStore = useMapStore()
const settings = computed(() => normalizeHideSeekSettings(mapStore.project.hideSeekSettings))
const trait = computed(() => {
  const id = traitOf(props.model)
  return id ? TRAIT_INFO[id] : null
})
const abilities = computed(() => abilitiesOf(props.model))
</script>
