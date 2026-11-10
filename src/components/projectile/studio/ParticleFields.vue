<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5">
      <span class="text-[11px] font-semibold text-slate-300">{{ $t('pe.particleShape') }}</span>
      <div class="grid grid-cols-6 gap-1">
        <UiButton
          v-for="shape in PARTICLE_SHAPES"
          :key="shape"
          variant="tool"
          size="xs"
          :active="model.shape === shape"
          custom-class="px-1! text-[10px]!"
          @click="model.shape = shape"
        >
          {{ $t(`pe.particle.${shape}`) }}
        </UiButton>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <UiColorPicker v-model="model.color" :label="$t('pe.colorStart')" size="sm" :colors="palette" />
      <UiColorPicker v-model="model.colorEnd" :label="$t('pe.colorEnd')" size="sm" :colors="palette" />
    </div>
    <UiSlider v-model="model.amount" :label="amountLabel" :min="0" :max="perSecond ? 120 : 80" :step="1" />
    <div class="grid grid-cols-2 gap-x-3 gap-y-2">
      <UiSlider v-model="model.size" :label="$t('pe.size')" :min="0.5" :max="20" :step="0.1" />
      <UiSlider v-model="model.sizeEnd" :label="$t('pe.sizeEnd')" :min="0" :max="30" :step="0.1" />
      <UiSlider v-model="model.speed" :label="$t('pe.speedPx')" :min="0" :max="400" :step="5" />
      <UiSlider v-model="model.spread" :label="$t('pe.spread')" :min="0" :max="360" :step="5" unit="°" />
      <UiSlider v-model="model.life" :label="$t('pe.life')" :min="0.05" :max="3" :step="0.05" unit="s" />
      <UiSlider v-model="model.gravity" :label="$t('pe.gravity')" :min="-400" :max="400" :step="10" />
      <UiSlider v-model="model.drag" :label="$t('pe.drag')" :min="0" :max="1" :step="0.05" />
      <UiSlider v-model="model.alpha" :label="$t('pe.alpha')" :min="0.05" :max="1" :step="0.05" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UiButton, UiColorPicker, UiSlider } from '../../ui'
import { useI18n } from '../../../stores/i18nStore'
import type { ParticleConfig, ParticleShape } from '../../../types/projectile'

const model = defineModel<ParticleConfig>({ required: true })
const props = defineProps<{
  /** Emitter while flying (per second) or burst on hit (per hit) */
  perSecond?: boolean
  /** Quick colors: the projectile's own */
  palette: string[]
}>()

const { t } = useI18n()
const PARTICLE_SHAPES: ParticleShape[] = ['dot', 'square', 'star', 'spark', 'ember', 'shard', 'ring', 'cross', 'smoke', 'leaf', 'bubble']
const amountLabel = computed(() => (props.perSecond ? t('pe.perSecond') : t('pe.perHit')))
</script>
