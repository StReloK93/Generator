<template>
  <div class="flex flex-col gap-3">
    <UiInput v-model="def.name" size="sm" :label="$t('common.name')" :leading-icon="Pencil" />

    <div class="flex flex-col gap-1.5">
      <span class="text-[11px] font-semibold text-slate-300">{{ $t('pe.elementLabel') }}</span>
      <div class="flex flex-wrap gap-1">
        <UiIconButton
          v-for="el in PROJECTILE_ELEMENTS"
          :key="el"
          :icon="ELEMENT_INFO[el].icon"
          size="sm"
          variant="tool"
          :active="def.element === el"
          :title="$t(`pe.element.${el}`)"
          @click="def.element = el"
        />
      </div>
    </div>

    <UiTabs v-model="def.behavior" :items="behaviorTabs" fill size="sm" />
    <UiTabs v-model="section" :items="sectionTabs" variant="pills" size="xs" custom-class="flex-wrap gap-1" />

    <!-- Body -->
    <BodyLayersPanel v-if="section === 'body'" v-model="def.body" :palette="palette" @pick-sprite="emit('pick-sprite', $event)" />

    <!-- Trail -->
    <div v-else-if="section === 'trail'" class="flex flex-col gap-3">
      <UiTabs v-model="def.trail.style" :items="trailTabs" variant="pills" size="xs" custom-class="flex-wrap gap-1" />
      <template v-if="def.trail.style !== 'none'">
        <div class="grid grid-cols-2 gap-3">
          <UiColorPicker v-model="def.trail.color" :label="$t('pe.colorHead')" size="sm" :colors="palette" />
          <UiColorPicker v-model="def.trail.colorEnd" :label="$t('pe.colorTail')" size="sm" :colors="palette" />
        </div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-2">
          <UiSlider v-model="def.trail.width" :label="$t('pe.width')" :min="0.5" :max="40" :step="0.5" unit="px" />
          <UiSlider v-model="def.trail.length" :label="$t('pe.length')" :min="2" :max="60" :step="1" />
          <UiSlider v-model="def.trail.alpha" :label="$t('pe.alpha')" :min="0.05" :max="1" :step="0.05" />
        </div>
      </template>
    </div>

    <!-- Particles shed while flying -->
    <ParticleFields v-else-if="section === 'particles'" v-model="def.emitter" per-second :palette="palette" />

    <!-- Motion and volley -->
    <div v-else-if="section === 'motion'" class="flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <UiSlider v-model="def.motion.speed" :label="$t('pe.speedTiles')" :min="2" :max="40" :step="1" />
        <UiSlider v-model="def.motion.arc" :label="$t('pe.arc')" :min="0" :max="1.5" :step="0.05" />
        <UiSlider v-model="def.motion.wobble" :label="$t('pe.wobble')" :min="0" :max="30" :step="1" unit="px" />
        <UiSlider v-if="def.motion.wobble > 0" v-model="def.motion.wobbleFreq" :label="$t('pe.wobbleFreq')" :min="0.5" :max="8" :step="0.5" />
      </div>
      <UiSwitch v-model="def.motion.shadow" :label="$t('pe.shadow')" />
      <div class="h-px bg-slate-800" />
      <span class="text-[11px] font-bold uppercase tracking-wide text-slate-400">{{ $t('pe.volley') }}</span>
      <UiSlider v-model="def.launch.count" :label="$t('pe.count')" :min="1" :max="12" :step="1" />
      <template v-if="def.launch.count > 1 || def.launch.pattern !== 'line'">
        <UiTabs v-model="def.launch.pattern" :items="patternTabs" variant="pills" size="xs" custom-class="flex-wrap gap-1" />
        <div class="grid grid-cols-2 gap-x-3 gap-y-2">
          <UiSlider v-model="def.launch.spread" :label="$t('pe.spreadPx')" :min="0" :max="60" :step="1" unit="px" />
          <UiSlider v-if="def.launch.pattern === 'helix' || def.launch.pattern === 'orbit'" v-model="def.launch.turns" :label="$t('pe.turns')" :min="0.5" :max="6" :step="0.5" />
        </div>
      </template>
      <p class="text-[11px] text-slate-500">{{ $t('pe.volleyHint') }}</p>
    </div>

    <!-- Strike -->
    <div v-else-if="section === 'strike'" class="flex flex-col gap-3">
      <div class="grid grid-cols-3 gap-1">
        <UiButton v-for="style in STRIKE_STYLES" :key="style" variant="tool" size="xs" :active="def.strike.style === style" @click="def.strike.style = style">
          {{ $t(`pe.strikeStyle.${style}`) }}
        </UiButton>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <UiColorPicker v-model="def.strike.color" :label="$t('pe.color')" size="sm" :colors="palette" />
        <UiColorPicker v-model="def.strike.color2" :label="$t('pe.color2')" size="sm" :colors="palette" />
        <UiColorPicker v-model="def.strike.core" :label="$t('pe.core')" size="sm" :colors="palette" />
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <UiSlider v-model="def.strike.size" :label="$t('pe.size')" :min="10" :max="120" :step="1" unit="px" />
        <UiSlider v-model="def.strike.duration" :label="$t('pe.duration')" :min="0.2" :max="2" :step="0.05" unit="s" />
        <UiSlider v-model="def.strike.count" :label="$t('pe.count')" :min="1" :max="20" :step="1" />
      </div>
    </div>

    <!-- Beam -->
    <div v-else-if="section === 'beam'" class="flex flex-col gap-3">
      <UiTabs v-model="def.beam.style" :items="beamTabs" fill size="xs" />
      <div class="grid grid-cols-2 gap-3">
        <UiColorPicker v-model="def.beam.color" :label="$t('pe.color')" size="sm" :colors="palette" />
        <UiColorPicker v-model="def.beam.core" :label="$t('pe.core')" size="sm" :colors="palette" />
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <UiSlider v-model="def.beam.width" :label="$t('pe.width')" :min="1" :max="24" :step="0.5" unit="px" />
        <UiSlider v-model="def.beam.duration" :label="$t('pe.duration')" :min="0.1" :max="1.5" :step="0.05" unit="s" />
        <UiSlider v-if="def.beam.style !== 'laser'" v-model="def.beam.jitter" :label="$t('pe.jitter')" :min="0" :max="40" :step="1" unit="px" />
      </div>
    </div>

    <!-- Impact -->
    <div v-else-if="section === 'impact'" class="flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-3 items-end">
        <UiColorPicker v-model="def.impact.flashColor" :label="$t('pe.flash')" size="sm" :colors="palette" />
        <UiSlider v-model="def.impact.flashSize" :label="$t('pe.size')" :min="0" :max="80" :step="1" unit="px" />
        <UiColorPicker v-model="def.impact.ringColor" :label="$t('pe.rings')" size="sm" :colors="palette" />
        <UiSlider v-model="def.impact.ringCount" :label="$t('pe.count')" :min="0" :max="5" :step="1" />
      </div>
      <div v-if="def.impact.ringCount > 0" class="grid grid-cols-2 gap-x-3 gap-y-2">
        <UiSlider v-model="def.impact.ringRadius" :label="$t('pe.radius')" :min="6" :max="120" :step="1" unit="px" />
        <UiSlider v-model="def.impact.ringWidth" :label="$t('pe.width')" :min="0.5" :max="8" :step="0.5" unit="px" />
      </div>
      <div class="grid grid-cols-2 gap-3 items-end">
        <UiColorPicker v-model="def.impact.decalColor" :label="$t('pe.decal')" size="sm" :colors="palette" />
        <UiSlider v-model="def.impact.decalRadius" :label="$t('pe.radius')" :min="0" :max="60" :step="1" unit="px" />
      </div>
      <UiSlider v-if="def.impact.decalRadius > 0" v-model="def.impact.decalLife" :label="$t('pe.life')" :min="0.2" :max="6" :step="0.1" unit="s" />
      <div class="h-px bg-slate-800" />
      <span class="text-[11px] font-bold uppercase tracking-wide text-slate-400">{{ $t('pe.burst') }}</span>
      <ParticleFields v-model="def.impact.burst" :palette="palette" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Pencil, Shapes, Wind, Sparkle, Navigation, Bomb, CloudLightning, Radio } from 'lucide-vue-next'
import { UiInput, UiIconButton, UiTabs, UiSlider, UiSwitch, UiColorPicker, UiButton, type TabItem } from '../../ui'
import { useI18n } from '../../../stores/i18nStore'
import { BEAM_STYLES, PROJECTILE_ELEMENTS, STRIKE_STYLES, projectileColors } from '../../../domain/projectile'
import type { LaunchPattern, ProjectileDefinition, TrailStyle } from '../../../types/projectile'
import { BEHAVIOR_INFO, ELEMENT_INFO } from '../projectileLabels'
import BodyLayersPanel from './BodyLayersPanel.vue'
import ParticleFields from './ParticleFields.vue'

const def = defineModel<ProjectileDefinition>({ required: true })
const emit = defineEmits<{ (e: 'pick-sprite', layerIndex: number): void }>()
const { t } = useI18n()

type Section = 'body' | 'trail' | 'particles' | 'motion' | 'strike' | 'beam' | 'impact'
const section = ref<Section>(def.value.behavior === 'flying' ? 'body' : def.value.behavior)

const behaviorTabs = computed<TabItem[]>(() => (['flying', 'strike', 'beam'] as const).map(b => ({ id: b, label: t(BEHAVIOR_INFO[b].label), icon: BEHAVIOR_INFO[b].icon })))

const sectionTabs = computed<TabItem[]>(() => {
  const impact = { id: 'impact', label: t('pe.section.impact'), icon: Bomb }
  if (def.value.behavior === 'strike') return [{ id: 'strike', label: t('pe.section.strike'), icon: CloudLightning }, impact]
  if (def.value.behavior === 'beam') return [{ id: 'beam', label: t('pe.section.beam'), icon: Radio }, impact]
  return [
    { id: 'body', label: t('pe.section.body'), icon: Shapes },
    { id: 'trail', label: t('pe.section.trail'), icon: Wind },
    { id: 'particles', label: t('pe.section.particles'), icon: Sparkle },
    { id: 'motion', label: t('pe.section.motion'), icon: Navigation },
    impact,
  ]
})

// Switching flying / strike / beam opens that behavior's own section
watch(() => def.value.behavior, behavior => {
  section.value = behavior === 'flying' ? 'body' : behavior
})

const TRAILS: TrailStyle[] = ['none', 'ribbon', 'line', 'dots', 'ghost', 'zigzag', 'double']
const PATTERNS: LaunchPattern[] = ['line', 'fan', 'helix', 'orbit', 'stagger', 'scatter']
const trailTabs = computed<TabItem[]>(() => TRAILS.map(s => ({ id: s, label: t(`pe.trail.${s}`) })))
const patternTabs = computed<TabItem[]>(() => PATTERNS.map(p => ({ id: p, label: t(`pe.pattern.${p}`) })))
const beamTabs = computed<TabItem[]>(() => BEAM_STYLES.map(s => ({ id: s, label: t(`pe.beamStyle.${s}`) })))

/** Quick color chips: the colors this projectile already uses */
const palette = computed(() => projectileColors(def.value).slice(-10))
</script>
