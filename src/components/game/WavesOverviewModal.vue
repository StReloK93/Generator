<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('game.waveList')"
    :subtitle="`${waveStore.waveConfigs.length} ${$t('game.wave')}`"
    :icon="Swords"
    :teleport="true"
    size="4xl"
    custom-class="h-120 portrait:h-auto"
    body-class="p-0! space-y-0! overflow-hidden! flex portrait:flex-col"
    @close="emit('update:isOpen', false)"
  >
    <template v-if="waveStore.waveConfigs.length > 0">
      <!-- Wave list: on the left, on an upright phone a row of numbers on top -->
      <aside ref="listRef" class="w-36 sm:w-48 shrink-0 min-h-0 overflow-y-auto p-2 flex flex-col gap-1 border-r border-slate-800 bg-slate-950/30 portrait:w-full portrait:flex-row portrait:overflow-x-auto portrait:overflow-y-hidden portrait:border-r-0 portrait:border-b no-scrollbar">
        <UiButton
          v-for="(wave, idx) in waveStore.waveConfigs"
          :key="idx"
          variant="tool"
          size="sm"
          block
          :active="selectedIndex === idx"
          :data-active="selectedIndex === idx"
          :custom-class="['justify-start! text-left min-h-9 shrink-0 [&>span]:flex-1 [&>span]:min-w-0 portrait:w-auto! portrait:min-w-11 portrait:justify-center!', idx < waveStore.currentWaveIndex && selectedIndex !== idx ? 'opacity-50' : '']"
          @click="selectedIndex = idx"
        >
          <span class="flex items-center gap-2 min-w-0">
            <span class="w-5 shrink-0 text-right font-extrabold portrait:w-auto">{{ idx + 1 }}</span>
            <span class="flex-1 min-w-0 truncate portrait:hidden">{{ wave.name || `${$t('game.wave')} ${idx + 1}` }}</span>
            <Crown v-if="wave.isBoss" class="size-3.5 shrink-0 text-amber-400" />
            <span v-if="idx === waveStore.currentWaveIndex" class="size-2 shrink-0 rounded-full bg-emerald-400" />
          </span>
        </UiButton>
      </aside>

      <!-- Right: selected wave -->
      <section v-if="activeWave" class="flex-1 min-w-0 min-h-0 flex portrait:flex-col portrait:overflow-y-auto">
        <div class="w-2/5 shrink-0 p-2.5 sm:p-3 portrait:w-full portrait:h-44">
          <CharacterLivePreview
            class="h-full"
            :model-value="activeWave.characterModel || 'male'"
            initial-action="Run"
            :unit-variant="activeWave.unitVariant || 'normal'"
            :variant-tint="activeWave.variantTint"
            :unit-scale="activeWave.unitScale || 1.0"
            :show-model-selector="false"
            :show-direction-bar="false"
            :show-action-buttons="false"
            height-class="h-full"
          />
        </div>

        <div class="flex-1 min-w-0 min-h-0 overflow-y-auto py-2.5 sm:py-3 pr-2.5 sm:pr-3 flex flex-col gap-2.5 portrait:px-3 portrait:pt-0 portrait:overflow-visible">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h3 class="text-sm sm:text-base font-extrabold text-brand-200 truncate">
              {{ activeWave.name || `${$t('game.wave')} ${selectedIndex + 1}` }}
            </h3>
            <UiBadge v-if="activeWave.isBoss" variant="amber" size="xs">
              <Crown class="size-3 inline mr-0.5" /> BOSS
            </UiBadge>
            <UiBadge v-if="selectedIndex === waveStore.currentWaveIndex" variant="emerald" size="xs">
              {{ $t('game.active') }}
            </UiBadge>
          </div>

          <span
            class="self-start px-2 py-0.5 rounded-lg text-xs font-bold border flex items-center gap-1.5"
            :style="{
              color: activeVariant.color,
              borderColor: activeVariant.color + '60',
              backgroundColor: activeVariant.color + '20'
            }"
          >
            <component :is="getVariantIcon(activeVariant.icon)" class="size-3.5" />
            {{ $t(activeVariant.nameKey) }}
          </span>

          <div class="grid grid-cols-2 gap-1.5">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="rounded-xl bg-slate-950/50 border border-slate-800 px-2.5 py-1.5 flex items-center gap-2 min-w-0"
            >
              <component :is="stat.icon" :class="['size-4 shrink-0', stat.color]" />
              <div class="min-w-0">
                <div class="text-sm font-extrabold text-slate-50 leading-tight">{{ stat.value }}</div>
                <div class="text-[10px] text-slate-400 truncate">{{ stat.label }}</div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('game.immunities') }}</span>
            <div v-if="activeWave.immunities && activeWave.immunities.length > 0" class="flex items-center gap-1 flex-wrap">
              <span
                v-for="immId in activeWave.immunities"
                :key="immId"
                class="px-1.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1"
                :class="getTraitDef(immId).badgeClass"
              >
                <component :is="getTraitDef(immId).icon" class="size-3" />
                {{ $t(getTraitDef(immId).nameKey) }}
              </span>
            </div>
            <span v-else class="text-[11px] text-slate-500">{{ $t('game.noImmunities') }}</span>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="flex-1 flex items-center justify-center text-slate-400 text-xs">
      {{ $t('config.noWaves') }}
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Heart, Crown, Footprints, Users, Coins, Swords } from 'lucide-vue-next'
import { UiModal, UiBadge, UiButton } from '../ui'
import { useWaveStore } from '../../stores/waveStore'
import { useI18n } from '../../stores/i18nStore'
import { getTraitDef } from '../../utils/towerTraits'
import { getVariantDef, getVariantIcon } from '../../utils/unitVariants'
import CharacterLivePreview from './CharacterLivePreview.vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
}>()

const waveStore = useWaveStore()
const { t } = useI18n()
const selectedIndex = ref(0)
const listRef = ref<HTMLElement | null>(null)

// Open on the current wave and keep it visible in the list
watch(() => props.isOpen, async (open) => {
  if (!open) return
  selectedIndex.value = Math.max(0, Math.min(waveStore.waveConfigs.length - 1, waveStore.currentWaveIndex || 0))
  await nextTick()
  listRef.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center', inline: 'center' })
})

const activeWave = computed(() => waveStore.waveConfigs[selectedIndex.value] || waveStore.waveConfigs[0] || null)

const activeVariant = computed(() => getVariantDef(activeWave.value?.unitVariant))

const stats = computed(() => {
  const w = activeWave.value
  if (!w) return []
  return [
    { icon: Heart, color: 'text-rose-400', value: w.unitHp, label: t('game.hp') },
    { icon: Footprints, color: 'text-emerald-400', value: w.unitSpeed, label: t('common.speed') },
    { icon: Users, color: 'text-sky-400', value: `${w.unitCount}×`, label: t('game.count') },
    { icon: Coins, color: 'text-amber-300', value: `+${w.unitBonus}`, label: t('game.bounty') },
  ]
})
</script>
